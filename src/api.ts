import type {
  CreateTaskResponse,
  Message,
  Room,
  SendMessageResponse,
  Task,
  UploadFileResponse,
} from "./types.ts";

const BASE_URL = "https://api.chatwork.com/v2";

function getToken(): string {
  const token = process.env.CHATWORK_API_TOKEN;
  if (!token) {
    console.error("Error: CHATWORK_API_TOKEN is not set.");
    process.exit(1);
  }
  return token;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "X-ChatWorkToken": token,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function getRooms(): Promise<Room[]> {
  return request<Room[]>("/rooms");
}

export async function getMessages(roomId: string): Promise<Message[]> {
  return request<Message[]>(`/rooms/${roomId}/messages?force=1`);
}

export async function sendMessage(
  roomId: string,
  message: string,
): Promise<SendMessageResponse> {
  const body = new URLSearchParams({ body: message });
  return request<SendMessageResponse>(`/rooms/${roomId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

export async function getTasks(roomId: string): Promise<Task[]> {
  return request<Task[]>(`/rooms/${roomId}/tasks`);
}

export async function createTask(
  roomId: string,
  body: string,
  assigneeIds: number[],
): Promise<CreateTaskResponse> {
  const params = new URLSearchParams({ body });
  for (const id of assigneeIds) {
    params.append("to_ids", String(id));
  }
  return request<CreateTaskResponse>(`/rooms/${roomId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
}

export async function uploadFile(
  roomId: string,
  fileContent: Uint8Array,
  filename: string,
  message?: string,
): Promise<UploadFileResponse> {
  const form = new FormData();
  // Content-Type は手動指定しない。fetch が boundary 付きで自動設定する。
  form.append("file", new Blob([new Uint8Array(fileContent)]), filename);
  if (message) {
    form.append("message", message);
  }
  return request<UploadFileResponse>(`/rooms/${roomId}/files`, {
    method: "POST",
    body: form,
  });
}
