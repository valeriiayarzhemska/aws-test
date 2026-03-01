import React from 'react';
import { render, screen, waitFor, userEvent } from '@/utils/test-utils';
import Openai from '@/app/openai/page';

global.fetch = jest.fn();

describe('Openai Page Component', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Initial Rendering', () => {
    it('should render the chat interface', () => {
      render(<Openai />);

      expect(screen.getByText('AI Chat')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Write message...'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('should start with empty messages', () => {
      render(<Openai />);

      expect(screen.queryByText(/user:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/assistant:/)).not.toBeInTheDocument();
    });

    it('should not be in loading state initially', () => {
      render(<Openai />);

      const input = screen.getByPlaceholderText('Write message...');
      const button = screen.getByRole('button', { name: /send/i });

      expect(input).not.toBeDisabled();
      expect(button).not.toBeDisabled();
    });
  });

  describe('API Mocking - Success Responses', () => {
    it('should send message and receive mocked response', async () => {
      const user = userEvent.setup();

      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            role: 'assistant',
            content: 'This is a mocked response from the AI assistant.',
          },
        }),
      });

      render(<Openai />);

      const input = screen.getByPlaceholderText('Write message...');
      const button = screen.getByRole('button', { name: /send/i });

      // Type and send a message
      await user.type(input, 'Hello AI');
      await user.click(button);

      // Wait for user message to appear
      await waitFor(() => {
        expect(screen.getByText('Hello AI')).toBeInTheDocument();
      });

      // Wait for mocked assistant response
      await waitFor(() => {
        expect(
          screen.getByText('This is a mocked response from the AI assistant.'),
        ).toBeInTheDocument();
      });

      // Verify both messages are displayed
      expect(screen.getByText('user:')).toBeInTheDocument();
      expect(screen.getByText('assistant:')).toBeInTheDocument();
    });

    it('should handle multiple messages in sequence', async () => {
      const user = userEvent.setup();

      // Mock multiple responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: { role: 'assistant', content: 'First response' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: { role: 'assistant', content: 'Second response' },
          }),
        });

      render(<Openai />);

      const input = screen.getByPlaceholderText('Write message...');
      const button = screen.getByRole('button', { name: /send/i });

      // Send first message
      await user.type(input, 'First message');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('First response')).toBeInTheDocument();
      });

      // Clear and send second message
      await user.clear(input);
      await user.type(input, 'Second message');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Second response')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should show loading state during API call', async () => {
      const user = userEvent.setup();

      // Mock with delayed response
      let resolveResponse: any;
      const responsePromise = new Promise((resolve) => {
        resolveResponse = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(responsePromise);

      render(<Openai />);

      const input = screen.getByPlaceholderText('Write message...');
      const button = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test message');
      await user.click(button);

      // Should be disabled while loading
      expect(input).toBeDisabled();
      expect(button).toBeDisabled();

      // Resolve the promise
      resolveResponse({
        ok: true,
        json: async () => ({
          message: { role: 'assistant', content: 'Response' },
        }),
      });

      // After completion, should be enabled
      await waitFor(() => {
        expect(input).not.toBeDisabled();
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('API Mocking - Error Responses', () => {
    it('should handle 500 server error', async () => {
      const user = userEvent.setup();

      // Mock 500 error response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      render(<Openai />);

      const input = screen.getByPlaceholderText('Write message...');
      const button = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test message');
      await user.click(button);

      // User message should still appear
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });

      // No assistant response
      await waitFor(() => {
        expect(screen.queryByText(/assistant:/)).not.toBeInTheDocument();
      });
    });

    it('should handle 400 validation error', async () => {
      const user = userEvent.setup();

      // Mock 400 validation error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Messages are required' }),
      });

      render(<Openai />);

      const input = screen.getByPlaceholderText('Write message...');
      const button = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test message');
      await user.click(button);

      // User message appears
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });

      // No assistant response
      await waitFor(() => {
        expect(screen.queryByText(/assistant:/)).not.toBeInTheDocument();
      });
    });

    it('should handle network error', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      render(<Openai />);

      const input = screen.getByPlaceholderText('Write message...');
      const button = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Network test');
      await user.click(button);

      // User message should appear
      await waitFor(() => {
        expect(screen.getByText('Network test')).toBeInTheDocument();
      });

      // Error should be logged
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('API Mocking - Custom Responses', () => {
    it('should handle custom assistant response', async () => {
      const user = userEvent.setup();

      // Define custom response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            role: 'assistant',
            content: 'Custom response for this specific test',
          },
        }),
      });

      render(<Openai />);

      const input = screen.getByPlaceholderText('Write message...');
      const button = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Custom test');
      await user.click(button);

      await waitFor(() => {
        expect(
          screen.getByText('Custom response for this specific test'),
        ).toBeInTheDocument();
      });
    });

    it('should verify request payload is correct', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { role: 'assistant', content: 'Response' },
        }),
      });

      render(<Openai />);

      const input = screen.getByPlaceholderText('Write message...');
      const button = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Verify payload');
      await user.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Verify the fetch call
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const [url, options] = fetchCall;

      expect(url).toBe('/api/chat');
      expect(options.method).toBe('POST');
      expect(options.headers).toEqual({ 'Content-Type': 'application/json' });

      const body = JSON.parse(options.body);
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0]).toEqual({
        role: 'user',
        content: 'Verify payload',
      });
    });

    it('should handle delayed response', async () => {
      const user = userEvent.setup();

      // Mock delayed response
      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          ok: true,
          json: async () => ({
            message: { role: 'assistant', content: 'Delayed response' },
          }),
        };
      });

      render(<Openai />);

      const input = screen.getByPlaceholderText('Write message...');
      const button = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Delay test');
      await user.click(button);

      // Should eventually show the response
      await waitFor(
        () => {
          expect(screen.getByText('Delayed response')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it('should handle response without message field', async () => {
      const user = userEvent.setup();

      // Mock response without message field
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'something else' }),
      });

      render(<Openai />);

      const input = screen.getByPlaceholderText('Write message...');
      const button = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test');
      await user.click(button);

      // User message appears
      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });

      // No assistant response since message field was missing
      await waitFor(() => {
        expect(screen.queryByText(/assistant:/)).not.toBeInTheDocument();
      });
    });
  });

  describe('User Interaction Edge Cases', () => {
    it('should not send empty message', async () => {
      const user = userEvent.setup();

      render(<Openai />);

      const button = screen.getByRole('button', { name: /send/i });

      // Click without typing
      await user.click(button);

      // Should not have any messages or API call
      expect(screen.queryByText(/user:/)).not.toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not send message with only whitespace', async () => {
      const user = userEvent.setup();

      render(<Openai />);

      const input = screen.getByPlaceholderText('Write message...');
      const button = screen.getByRole('button', { name: /send/i });

      // Type only whitespace
      await user.type(input, '   ');
      await user.click(button);

      // Should not send
      expect(screen.queryByText(/user:/)).not.toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
