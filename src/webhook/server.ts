import { serve } from "@hono/node-server";
import Anthropic from "@anthropic-ai/sdk";
import { Hono } from "hono";
import { sendMessage } from "../api.ts";
import type { WebhookPayload } from "../types.ts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const PORT = parseInt(process.env.WEBHOOK_PORT ?? "3000", 10);

async function handleWebhook(req: Request): Promise<Response> {
  let payload: WebhookPayload;
  try {
    payload = await req.json() as WebhookPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (payload.webhook_event_type !== "mention_to_me" &&
      payload.webhook_event_type !== "message_created") {
    return new Response("Ignored", { status: 200 });
  }

  const event = payload.webhook_event;
  const roomId = String(event.room_id);
  const userMessage = event.body;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: userMessage }],
    });

    const replyText = response.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    await sendMessage(roomId, replyText);
  } catch (err) {
    console.error("Failed to process message:", err);
    return new Response("Internal Server Error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/webhook", (c) => handleWebhook(c.req.raw));

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Webhook server listening on port ${PORT}`);
});
