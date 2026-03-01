import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import mockRouter from 'next-router-mock';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider';

export function renderWithRouter(
  ui: ReactElement,
  {
    initialRoute = '/',
    ...renderOptions
  }: { initialRoute?: string } & Omit<RenderOptions, 'wrapper'> = {},
) {
  // Set the initial route
  mockRouter.setCurrentUrl(initialRoute);

  return render(ui, {
    wrapper: MemoryRouterProvider,
    ...renderOptions,
  });
}

/**
 * Re-export everything from React Testing Library
 */
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
export { default as mockRouter } from 'next-router-mock';
