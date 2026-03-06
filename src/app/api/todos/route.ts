import { NextRequest, NextResponse } from 'next/server';
import type { CreateTodoDto, PaginatedTodos } from '@/types/todo';
import { todoStore } from '@/lib/todoStore';

export const dynamic = 'force-static';

// Simulate network delay for realistic demo
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// GET /api/todos - Fetch all todos with pagination and filtering
export async function GET(request: NextRequest) {
  await delay(300); // Simulate network delay

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');
  const completed = searchParams.get('completed');
  const search = searchParams.get('search');

  // Simulate occasional errors for error handling demonstration
  const shouldError = searchParams.get('forceError') === 'true';
  if (shouldError) {
    return NextResponse.json(
      { error: 'Simulated server error' },
      { status: 500 },
    );
  }

  // Filter todos
  let filteredTodos = todoStore.getAll();

  if (completed !== null) {
    const isCompleted = completed === 'true';
    filteredTodos = filteredTodos.filter(
      (todo) => todo.completed === isCompleted,
    );
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filteredTodos = filteredTodos.filter((todo) =>
      todo.title.toLowerCase().includes(searchLower),
    );
  }

  // Sort by createdAt descending (newest first)
  filteredTodos.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // Pagination
  const total = filteredTodos.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedData = filteredTodos.slice(start, end);

  const response: PaginatedTodos = {
    data: paginatedData,
    total,
    page,
    pageSize,
    totalPages,
  };

  return NextResponse.json(response);
}

// POST /api/todos - Create a new todo
export async function POST(request: NextRequest) {
  await delay(400);

  try {
    const body: CreateTodoDto = await request.json();

    if (!body.title || body.title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const newTodo = todoStore.create(body.title, body.completed);

    return NextResponse.json(newTodo, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}
