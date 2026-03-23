import { getMessages } from "../../api.ts";

export async function messagesCommand(
  args: { room?: string | number; json?: boolean },
): Promise<void> {
  if (!args.room) {
    console.error("Error: --room <roomId> is required");
    Deno.exit(1);
  }

  const messages = await getMessages(String(args.room));

  if (args.json) {
    console.log(JSON.stringify(messages, null, 2));
    return;
  }

  for (const msg of messages) {
    const date = new Date(msg.send_time * 1000).toISOString();
    console.log(`[${date}] ${msg.account.name}: ${msg.body}`);
  }
}
