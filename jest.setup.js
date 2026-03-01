// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock Next.js router for all tests
jest.mock('next/navigation', () => require('next-router-mock'));

// Note: MSW server is set up per-test rather than globally
// to allow for better test isolation and flexibility.
// Import and use the server in individual test files that need it.
//
// Example:
// import { server } from '@/mocks/server';
// beforeAll(() => server.listen());
// afterEach(() => server.resetHandlers());
// afterAll(() => server.close());
