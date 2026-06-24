import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import {
  createTask,
  getMessages,
  getRooms,
  getTasks,
  sendMessage,
  uploadFile,
} from "../api.ts";

const server = new Server(
  { name: "chatwork-tools", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: [
    {
      name: "get_rooms",
      description: "Get list of Chatwork rooms",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "get_messages",
      description: "Get messages from a Chatwork room",
      inputSchema: {
        type: "object",
        properties: {
          roomId: { type: "string", description: "Room ID" },
        },
        required: ["roomId"],
      },
    },
    {
      name: "send_message",
      description: "Send a message to a Chatwork room",
      inputSchema: {
        type: "object",
        properties: {
          roomId: { type: "string", description: "Room ID" },
          message: { type: "string", description: "Message body" },
        },
        required: ["roomId", "message"],
      },
    },
    {
      name: "send_file",
      description:
        "Upload a file to a Chatwork room. Provide either filePath (read from disk) or content (base64) + filename.",
      inputSchema: {
        type: "object",
        properties: {
          roomId: { type: "string", description: "Room ID" },
          filePath: {
            type: "string",
            description: "Path to the file to upload",
          },
          content: {
            type: "string",
            description: "Base64-encoded file content (alternative to filePath)",
          },
          filename: {
            type: "string",
            description:
              "File name. Required with content; overrides the basename when using filePath",
          },
          message: {
            type: "string",
            description: "Optional message to attach with the file",
          },
        },
        required: ["roomId"],
      },
    },
    {
      name: "get_tasks",
      description: "Get tasks from a Chatwork room",
      inputSchema: {
        type: "object",
        properties: {
          roomId: { type: "string", description: "Room ID" },
        },
        required: ["roomId"],
      },
    },
    {
      name: "create_task",
      description: "Create a task in a Chatwork room",
      inputSchema: {
        type: "object",
        properties: {
          roomId: { type: "string", description: "Room ID" },
          body: { type: "string", description: "Task body" },
          assigneeIds: {
            type: "array",
            items: { type: "number" },
            description: "List of assignee account IDs",
          },
        },
        required: ["roomId", "body"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: input } = req.params;

  try {
    switch (name) {
      case "get_rooms": {
        const rooms = await getRooms();
        return { content: [{ type: "text", text: JSON.stringify(rooms, null, 2) }] };
      }
      case "get_messages": {
        const { roomId } = input as { roomId: string };
        const messages = await getMessages(roomId);
        return { content: [{ type: "text", text: JSON.stringify(messages, null, 2) }] };
      }
      case "send_message": {
        const { roomId, message } = input as { roomId: string; message: string };
        const result = await sendMessage(roomId, message);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "send_file": {
        const { roomId, filePath, content, filename, message } = input as {
          roomId: string;
          filePath?: string;
          content?: string;
          filename?: string;
          message?: string;
        };

        let fileContent: Uint8Array;
        let name: string;
        if (filePath) {
          fileContent = await readFile(filePath);
          name = filename ?? basename(filePath);
        } else if (content && filename) {
          fileContent = Buffer.from(content, "base64");
          name = filename;
        } else {
          throw new Error(
            "send_file requires filePath, or content together with filename",
          );
        }

        const result = await uploadFile(roomId, fileContent, name, message);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "get_tasks": {
        const { roomId } = input as { roomId: string };
        const tasks = await getTasks(roomId);
        return { content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }] };
      }
      case "create_task": {
        const { roomId, body, assigneeIds = [] } = input as {
          roomId: string;
          body: string;
          assigneeIds?: number[];
        };
        const result = await createTask(roomId, body, assigneeIds);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return {
      content: [{
        type: "text",
        text: `Error: ${err instanceof Error ? err.message : String(err)}`,
      }],
      isError: true,
    };
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
