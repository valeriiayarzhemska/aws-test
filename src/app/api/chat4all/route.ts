import { spawn } from 'child_process';

export const dynamic = 'force-static';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.messages?.length) {
      return new Response(JSON.stringify({ error: 'No messages' }), {
        status: 400,
      });
    }

    const lastMessage = data.messages[data.messages.length - 1].content;

    const python = spawn('./.venv/bin/python3', ['./server/chat.py']);

    let newData = '';
    let errorOutput = '';

    python.stdout.on('data', (chunk) => {
      newData += chunk.toString();
    });

    python.stderr.on('data', (chunk) => {
      errorOutput += chunk.toString();
    });

    python.stdin.write(JSON.stringify({ prompt: lastMessage }));
    python.stdin.end();

    await new Promise((resolve, reject) => {
      python.on('close', (code) => {
        if (code !== 0) {
          console.error('Python error:', errorOutput);
          reject(new Error(`Python exited with code ${code}`));
        } else {
          resolve(true);
        }
      });
    });

    if (!newData) {
      throw new Error('No output from Python');
    }

    const assistantMessage = JSON.parse(newData);

    return new Response(JSON.stringify({ message: assistantMessage }), {
      status: 200,
    });
  } catch (error: unknown) {
    console.error(error);

    return new Response(
      JSON.stringify({
        error: (error as Error).message || 'Something went wrong',
      }),
      { status: 500 },
    );
  }
}
