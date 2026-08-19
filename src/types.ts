export interface Room {
  room_id: number;
  name: string;
  type: "my" | "direct" | "group";
  role: "admin" | "member" | "readonly";
  sticky: boolean;
  unread_num: number;
  mention_num: number;
  mytask_num: number;
  message_num: number;
  file_num: number;
  task_num: number;
  icon_path: string;
  last_update_time: number;
  description?: string;
}

export interface Account {
  account_id: number;
  name: string;
  avatar_image_url: string;
}

export interface Message {
  message_id: string;
  account: Account;
  body: string;
  send_time: number;
  update_time: number;
}

export interface Task {
  task_id: number;
  account: Account;
  assigned_by_account: Account;
  message_id: string;
  body: string;
  limit_time: number;
  status: "open" | "done";
  limit_type: "none" | "date" | "time";
}

export interface SendMessageResponse {
  message_id: string;
}

export interface CreateTaskResponse {
  task_ids: number[];
}

export interface UploadFileResponse {
  file_id: number;
}
