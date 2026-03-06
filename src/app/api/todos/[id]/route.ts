import { NextRequest, NextResponse } from 'next/server';
import type { UpdateTodoDto } from '@/types/todo';
import { todoStore } from '@/lib/todoStore';

export const dynamic = 'force-static';

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// GET /api/todos/[id] - Fetch a single todo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await delay(200);

  const { id } = await params;
  const todoId = parseInt(id);

  const todo = todoStore.getById(todoId);

  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  return NextResponse.json(todo);
}

// PUT /api/todos/[id] - Update a todo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await delay(300);

  const { id } = await params;
  const todoId = parseInt(id);

  try {
    const body: UpdateTodoDto = await request.json();

    const updatedTodo = todoStore.update(todoId, body);

    if (!updatedTodo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json(updatedTodo);
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}

// PATCH /api/todos/[id] - Partially update a todo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return PUT(request, { params });
}

// DELETE /api/todos/[id] - Delete a todo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await delay(300);

  const { id } = await params;
  const todoId = parseInt(id);

  const success = todoStore.delete(todoId);

  if (!success) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, id: todoId });
}
