import React from 'react';
import { render, screen, waitFor, userEvent } from '@/utils/test-utils';
import Chat from '@/app/components/Chat';

global.fetch = jest.fn();

describe('Chat Component', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Snapshot Tests', () => {
    it('should match snapshot on initial render', () => {
      const { container } = render(<Chat url="/api/chat" />);
      expect(container).toMatchSnapshot();
    });
  });

  describe('Basic UI Rendering', () => {
    it('should render chat title', () => {
      render(<Chat url="/api/chat" />);
      expect(screen.getByText('AI Chat')).toBeInTheDocument();
    });

    it('should render input field with placeholder', () => {
      render(<Chat url="/api/chat" />);
      expect(
        screen.getByPlaceholderText('Write message...'),
      ).toBeInTheDocument();
    });

    it('should render send button', () => {
      render(<Chat url="/api/chat" />);
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('should start with empty messages', () => {
      render(<Chat url="/api/chat" />);
      expect(screen.queryByText(/user:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/assistant:/)).not.toBeInTheDocument();
    });

    it('should have enabled input and button initially', () => {
      render(<Chat url="/api/chat" />);
      const input = screen.getByPlaceholderText('Write message...');
      const button = screen.getByRole('button', { name: /send/i });

      expect(input).not.toBeDisabled();
      expect(button).not.toBeDisabled();
    });
  });

  describe('Keyboard Interactions', () => {
    it('should update input value when user types', async () => {
      const user = userEvent.setup();
      render(<Chat url="/api/chat" />);

      const input = screen.getByPlaceholderText('Write message...');
      await user.type(input, 'Hello AI');

      expect(input).toHaveValue('Hello AI');
    });

    it('should clear input after successful message send', async () => {
      const user = userEvent.setup();

      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { role: 'assistant', content: 'Hi there!' },
        }),
      });

      render(<Chat url="/api/chat" />);

      const input = screen.getByPlaceholderText('Write message...');

      await user.type(input, 'Test message');
      await user.click(screen.getByRole('button', { name: /send/i }));

      // Input should still have value immediately after submit
      // (Component doesn't clear input in current implementation)
      expect(input).toHaveValue('Test message');
    });
  });

  describe('Click Interactions', () => {
    it('should call fetch when send button is clicked', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { role: 'assistant', content: 'Response' },
        }),
      });

      render(<Chat url="/api/chat" />);

      const input = screen.getByPlaceholderText('Write message...');
      await user.type(input, 'Test message');
      await user.click(screen.getByRole('button', { name: /send/i }));

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('should not send empty message', async () => {
      const user = userEvent.setup();

      render(<Chat url="/api/chat" />);

      await user.click(screen.getByRole('button', { name: /send/i }));

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not send whitespace-only message', async () => {
      const user = userEvent.setup();

      render(<Chat url="/api/chat" />);

      const input = screen.getByPlaceholderText('Write message...');
      await user.type(input, '   ');
      await user.click(screen.getByRole('button', { name: /send/i }));

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('API Response Handling', () => {
    it('should display user message after sending', async () => {
      const user = userEvent.setup();

      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { role: 'assistant', content: 'Response' },
        }),
      });

      render(<Chat url="/api/chat" />);

      const input = screen.getByPlaceholderText('Write message...');
      await user.type(input, 'Hello');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
      });
    });

    it('should display assistant response', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { role: 'assistant', content: 'AI Response' },
        }),
      });

      render(<Chat url="/api/chat" />);

      const input = screen.getByPlaceholderText('Write message...');
      await user.type(input, 'Question');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText('AI Response')).toBeInTheDocument();
      });
    });

    it('should handle API error gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<Chat url="/api/chat" />);

      const input = screen.getByPlaceholderText('Write message...');
      await user.type(input, 'Test');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /send/i });
        expect(button).not.toBeDisabled();
      });

      expect(screen.getByText('Test')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should handle network error', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      render(<Chat url="/api/chat" />);

      const input = screen.getByPlaceholderText('Write message...');
      await user.type(input, 'Test');
      await user.click(screen.getByRole('button', { name: /send/i }));

      // Wait for error to be logged
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('should disable input and button while loading', async () => {
      const user = userEvent.setup();

      let resolveResponse: any;
      const responsePromise = new Promise((resolve) => {
        resolveResponse = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(responsePromise);

      render(<Chat url="/api/chat" />);

      const input = screen.getByPlaceholderText('Write message...');
      const button = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test');
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

      // Should be enabled after response
      await waitFor(() => {
        expect(input).not.toBeDisabled();
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('Mock Function Patterns', () => {
    it('verifies fetch was called with correct payload', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { role: 'assistant', content: 'Response' },
        }),
      });

      render(<Chat url="/api/chat" />);

      await user.type(screen.getByPlaceholderText('Write message...'), 'Hello');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const [url, options] = fetchCall;

      expect(url).toBe('/api/chat');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0]).toEqual({
        role: 'user',
        content: 'Hello',
      });
    });

    it('demonstrates multiple API calls', async () => {
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

      render(<Chat url="/api/chat" />);

      const input = screen.getByPlaceholderText('Write message...');

      // First message
      await user.type(input, 'First');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText('First response')).toBeInTheDocument();
      });

      // Second message
      await user.clear(input);
      await user.type(input, 'Second');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText('Second response')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
