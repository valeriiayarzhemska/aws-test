'use client';

import { useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function Chat({ url }: { url: string }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (input: string) => {
    if (!input.trim()) {
      return;
    }

    const newMessages = [
      ...messages,
      { role: 'user' as const, content: input },
    ];

    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        throw new Error('Server error');
      }

      const data = await res.json();

      if (data?.message) {
        setMessages([...newMessages, data.message]);
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-12">
      <h1>AI Chat</h1>

      <div style={{ marginBottom: 20 }}>
        {messages.map((m, i) => (
          <div key={i}>
            <b>{m.role}:</b> {m.content}
          </div>
        ))}
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await sendMessage(input);
        }}
        className="flex flex-col gap-2 w-62"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="bg-gray-800"
          placeholder="Write message..."
        />

        <button type="submit" disabled={loading} className="bg-gray-900">
          Send
        </button>
      </form>
    </div>
  );
}
