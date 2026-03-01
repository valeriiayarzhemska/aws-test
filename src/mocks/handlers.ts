import { http, HttpResponse } from 'msw';

// Mock handlers for API endpoints
export const handlers = [
  // Mock handler for chat API
  http.post('/api/chat', async ({ request }) => {
    const body = await request.json();

    return HttpResponse.json({
      message: {
        role: 'assistant',
        content: 'This is a mocked response from the AI assistant.',
      },
    });
  }),

  // Mock handler for GPT4All
  http.post('/api/chat4all', async ({ request }) => {
    const body = await request.json();

    return HttpResponse.json({
      message: {
        role: 'assistant',
        content: 'This is a mocked response from GPT4All.',
      },
    });
  }),
];

// Error handlers for testing error scenarios
export const errorHandlers = [
  // Server error
  http.post('/api/chat', () => {
    return HttpResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }),

  // Validation error
  http.post('/api/chat', () => {
    return HttpResponse.json(
      { error: 'Messages are required' },
      { status: 400 },
    );
  }),

  // Network error simulation
  http.post('/api/chat', () => {
    return HttpResponse.error();
  }),
];
