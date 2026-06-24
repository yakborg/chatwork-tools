import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { sendMessage, uploadFile } from "../../api.ts";

export async function sendCommand(
  args: { room?: string | number; message?: string; json?: boolean },
): Promise<void> {
  if (!args.room) {
    console.error("Error: --room <roomId> is required");
    process.exit(1);
  }
  if (!args.message) {
    console.error("Error: --message <text> is required");
    process.exit(1);
  }

  const result = await sendMessage(String(args.room), args.message);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Message sent. ID: ${result.message_id}`);
}

export async function sendFileCommand(
  args: {
    room?: string | number;
    file?: string;
    name?: string;
    message?: string;
    json?: boolean;
  },
): Promise<void> {
  if (!args.room) {
    console.error("Error: --room <roomId> is required");
    process.exit(1);
  }
  if (!args.file) {
    console.error("Error: --file <path> is required");
    process.exit(1);
  }

  const content = await readFile(String(args.file));
  const filename = args.name ? String(args.name) : basename(String(args.file));

  const result = await uploadFile(
    String(args.room),
    content,
    filename,
    args.message,
  );

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`File sent. file_id: ${result.file_id}`);
}
