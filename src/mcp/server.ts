import { Server } from "npm:@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "npm:@modelcontextprotocol/sdk/types.js";
import {
  createTask,
  getMessages,
  getRooms,
  getTasks,
  sendMessage,
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

const transport = new StdioServerTransport();
await server.connect(transport);
