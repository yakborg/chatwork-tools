import { parseArgs } from "node:util";
import { messagesCommand } from "./commands/messages.ts";
import { roomsCommand } from "./commands/rooms.ts";
import { sendCommand } from "./commands/send.ts";
import { taskCreateCommand, tasksCommand } from "./commands/tasks.ts";

const { values: args, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    room: { type: "string" },
    message: { type: "string" },
    body: { type: "string" },
    assignees: { type: "string" },
    json: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
  allowPositionals: true,
});

const command = positionals[0] as string | undefined;

if (!command || args.help) {
  console.log(`Chatwork CLI

Usage:
  cw <command> [options]

Commands:
  rooms                              List rooms
  messages --room <roomId>           Get messages
  send --room <roomId> --message <text>  Send a message
  tasks --room <roomId>              List tasks
  task:create --room <roomId> --body <text> [--assignees <id1,id2>]  Create a task

Options:
  --json    Output as JSON
  --help    Show this help
`);
  process.exit(0);
}

async function main(): Promise<void> {
  switch (command) {
    case "rooms":
      await roomsCommand(args);
      break;
    case "messages":
      await messagesCommand(args);
      break;
    case "send":
      await sendCommand(args);
      break;
    case "tasks":
      await tasksCommand(args);
      break;
    case "task:create":
      await taskCreateCommand(args);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
