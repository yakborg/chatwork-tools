import { sendMessage } from "../../api.ts";

export async function sendCommand(
  args: { room?: string | number; message?: string; json?: boolean },
): Promise<void> {
  if (!args.room) {
    console.error("Error: --room <roomId> is required");
    Deno.exit(1);
  }
  if (!args.message) {
    console.error("Error: --message <text> is required");
    Deno.exit(1);
  }

  const result = await sendMessage(String(args.room), args.message);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Message sent. ID: ${result.message_id}`);
}
