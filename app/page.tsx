"use client";
import { useEffect, useState } from "react";

interface SuperChat {
  author: {
    name: string;
    thumbnail?: { url: string; alt?: string };
    channelId: string;
  };
  message: { text: string }[];
  superchat: {
    amount: string;
    color: string;
    sticker?: { url: string; alt?: string };
  };
  timestamp: string;
}

export default function SuperChatFeed() {
  const [superChats, setSuperChats] = useState<SuperChat[]>([]);
const eventSource = new EventSource("/api/livechat-sse");
eventSource.onmessage = (event) => {
  console.log("Superchat recebido:", JSON.parse(event.data));
};
  useEffect(() => {
    const eventSource = new EventSource("/api/livechat-sse"); // seu endpoint SSE

    eventSource.onmessage = (event) => {
      try {
        const data: SuperChat = JSON.parse(event.data);
        setSuperChats((prev) => [data, ...prev].slice(0, 20)); // mantém os 20 últimos
      } catch (err) {
        console.error("Erro ao processar SSE:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("Erro na conexão SSE:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="p-4 space-y-2">
      {superChats.map((chat, idx) => (
        <div
          key={idx}
          className="p-2 rounded shadow"
          style={{ backgroundColor: chat.superchat.color }}
        >
          <div className="flex items-center gap-2">
            {chat.author.thumbnail && (
              <img
                src={chat.author.thumbnail.url}
                alt={chat.author.thumbnail.alt || chat.author.name}
                className="w-8 h-8 rounded-full"
              />
            )}
            <strong>{chat.author.name}</strong>
            <span className="ml-auto font-bold">{chat.superchat.amount}</span>
          </div>
          <div className="mt-1">
            {chat.message.map((msg, i) => (
              <span key={i}>{msg.text} </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}