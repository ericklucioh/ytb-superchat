import type { NextApiRequest, NextApiResponse } from "next";
import { LiveChat, ChatItem } from "youtube-chat";

let liveChat: LiveChat | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sendEvent = (data: any) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  if (!liveChat) {
    liveChat = new LiveChat({ channelId: "UCYPzdicI8HUqh2JlewAeuPA" });

    liveChat.on("chat", (chatItem: ChatItem) => {
      if (chatItem.superchat) sendEvent(chatItem);
    });

    liveChat.on("error", (err) => sendEvent({ error: err.toString() }));

    const ok = await liveChat.start();
    if (!ok) {
      sendEvent({ error: "Não foi possível iniciar a live." });
      res.end();
      return;
    }
  }

  // ping para manter conexão viva
  const keepAlive = setInterval(() => res.write(`:\n\n`), 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    console.log("Cliente desconectou");
  });
}