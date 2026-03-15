import { LiveChat, ChatItem } from "youtube-chat";

let liveChat: LiveChat | null = null;
let superChatsHistory: ChatItem[] = []; // guarda todos os superchats

export const GET = async (req: Request) => {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const sendEvent = async (data: any) => {
    await writer.write(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  // Inicializa LiveChat apenas uma vez
  if (!liveChat) {
    liveChat = new LiveChat({ channelId: "UCYPzdicI8HUqh2JlewAeuPA" });

    liveChat.on("chat", async (chatItem: ChatItem) => {
      if (chatItem.superchat) {
        superChatsHistory.push(chatItem); // armazena no histórico
        await sendEvent(chatItem);
      }
    });

    liveChat.on("error", async (err) => {
      await sendEvent({ error: err.toString() });
    });

    const ok = await liveChat.start();
    if (!ok) {
      await sendEvent({ error: "Não foi possível iniciar a live." });
      writer.close();
      return new Response(readable, {
        status: 500,
        headers: { "Content-Type": "text/event-stream" },
      });
    }
  }

  // Envia histórico completo para o novo cliente
  for (const chat of superChatsHistory) {
    await sendEvent(chat);
  }

  // Ping para manter conexão viva
  const keepAlive = setInterval(() => {
    writer.write(new TextEncoder().encode(`:\n\n`));
  }, 15000);

  req.signal.addEventListener("abort", () => {
    clearInterval(keepAlive);
  });

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
};