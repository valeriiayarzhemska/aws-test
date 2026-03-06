import OpenAI from 'openai';

export const dynamic = 'force-static';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY');
    }

    const body = await req.json();

    if (!body?.messages) {
      return Response.json({ error: 'Messages are required' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: body.messages,
      temperature: 0.7,
    });

    const assistantMessage = completion.choices?.[0]?.message;

    if (!assistantMessage) {
      throw new Error('No message returned from OpenAI');
    }

    return Response.json({
      message: assistantMessage,
    });
  } catch (error: unknown) {
    console.error('API ERROR:', error);

    return Response.json(
      { error: (error as Error).message || 'Something went wrong' },
      { status: 500 },
    );
  }
}
