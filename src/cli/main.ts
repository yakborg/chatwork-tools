import { parseArgs } from "jsr:@std/cli/parse-args";
import { messagesCommand } from "./commands/messages.ts";
import { roomsCommand } from "./commands/rooms.ts";
import { sendCommand } from "./commands/send.ts";
import { taskCreateCommand, tasksCommand } from "./commands/tasks.ts";

const args = parseArgs(Deno.args, {
  string: ["room", "message", "body", "assignees"],
  boolean: ["json", "help"],
  alias: { h: "help" },
});

const command = args._[0] as string | undefined;

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
  Deno.exit(0);
}

try {
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
      Deno.exit(1);
  }
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  Deno.exit(1);
}
