import useSWRMutation from 'swr/mutation';
import { useSWRConfig } from 'swr';
import type {
  Todo,
  CreateTodoDto,
  UpdateTodoDto,
  PaginatedTodos,
} from '@/types/todo';
import { sendRequest } from '../lib/fetcher';
import { todoCacheKeys } from '../lib/cacheKeys';

export function useCreateTodo() {
  const { mutate, cache } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    '/api/todos',
    async (url: string, { arg }: { arg: CreateTodoDto }) => {
      // OPTIMISTIC UPDATE
      // Get all cache keys that match the list pattern
      const cacheKeys = Array.from(cache.keys()).filter(
        (key) => typeof key === 'string' && key.startsWith('/api/todos?'),
      );

      // Store previous data for rollback
      const previousData = new Map();
      cacheKeys.forEach((key) => {
        previousData.set(key, cache.get(key));
      });

      try {
        // Optimistically update all list caches
        cacheKeys.forEach((key) => {
          mutate(
            key,
            (current: PaginatedTodos | undefined) => {
              if (!current?.data) return current;

              // Create optimistic todo with temporary ID
              const optimisticTodo: Todo = {
                id: Date.now(),
                title: arg.title,
                completed: arg.completed ?? false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              return {
                ...current,
                data: [optimisticTodo, ...current.data],
                total: current.total + 1,
              };
            },
            { revalidate: false },
          );
        });

        const result = await sendRequest<Todo>(url, {
          arg: { method: 'POST', body: arg },
        });

        // Invalidate all list caches after successful creation
        mutate(todoCacheKeys.allListsPattern());

        return result;
      } catch (error) {
        cacheKeys.forEach((key) => {
          const prevData = previousData.get(key);
          if (prevData) {
            mutate(key, prevData?.data, { revalidate: false });
          }
        });
        throw error;
      }
    },
  );

  return { createTodo: trigger, isCreating: isMutating, error };
}

export function useUpdateTodo() {
  const { mutate, cache } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    '/api/todos',
    async (
      url: string,
      { arg }: { arg: { id: number; data: UpdateTodoDto } },
    ) => {
      const cacheKeys = Array.from(cache.keys()).filter(
        (key) => typeof key === 'string' && key.startsWith('/api/todos?'),
      );

      const previousData = new Map();
      cacheKeys.forEach((key) => {
        previousData.set(key, cache.get(key));
      });

      try {
        cacheKeys.forEach((key) => {
          mutate(
            key,
            (current: PaginatedTodos | undefined) => {
              if (!current?.data) return current;

              return {
                ...current,
                data: current.data.map((todo: Todo) =>
                  todo.id === arg.id
                    ? {
                        ...todo,
                        ...arg.data,
                        updatedAt: new Date().toISOString(),
                      }
                    : todo,
                ),
              };
            },
            { revalidate: false },
          );
        });

        const result = await sendRequest<Todo>(`${url}/${arg.id}`, {
          arg: { method: 'PUT', body: arg.data },
        });

        mutate(todoCacheKeys.allListsPattern());
        mutate(todoCacheKeys.detail(arg.id));

        return result;
      } catch (error) {
        cacheKeys.forEach((key) => {
          const prevData = previousData.get(key);
          if (prevData) {
            mutate(key, prevData?.data, { revalidate: false });
          }
        });
        throw error;
      }
    },
  );

  return { updateTodo: trigger, isUpdating: isMutating, error };
}

export function useDeleteTodo() {
  const { mutate, cache } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    '/api/todos',
    async (url: string, { arg }: { arg: number }) => {
      const cacheKeys = Array.from(cache.keys()).filter(
        (key) => typeof key === 'string' && key.startsWith('/api/todos?'),
      );

      const previousData = new Map();
      cacheKeys.forEach((key) => {
        previousData.set(key, cache.get(key));
      });

      try {
        cacheKeys.forEach((key) => {
          mutate(
            key,
            (current: PaginatedTodos | undefined) => {
              if (!current?.data) return current;

              return {
                ...current,
                data: current.data.filter((todo: Todo) => todo.id !== arg),
                total: current.total - 1,
              };
            },
            { revalidate: false },
          );
        });

        const result = await sendRequest(`${url}/${arg}`, {
          arg: { method: 'DELETE' },
        });

        mutate(todoCacheKeys.allListsPattern());
        mutate(todoCacheKeys.detail(arg));

        return result;
      } catch (error) {
        cacheKeys.forEach((key) => {
          const prevData = previousData.get(key);
          if (prevData) {
            mutate(key, prevData?.data, { revalidate: false });
          }
        });
        throw error;
      }
    },
  );

  return { deleteTodo: trigger, isDeleting: isMutating, error };
}
