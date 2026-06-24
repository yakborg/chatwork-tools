import { createTask, getTasks } from "../../api.ts";

export async function tasksCommand(
  args: { room?: string | number; json?: boolean },
): Promise<void> {
  if (!args.room) {
    console.error("Error: --room <roomId> is required");
    process.exit(1);
  }

  const tasks = await getTasks(String(args.room));

  if (args.json) {
    console.log(JSON.stringify(tasks, null, 2));
    return;
  }

  for (const task of tasks) {
    console.log(
      `[${task.task_id}] [${task.status}] ${task.body} (assigned to: ${task.account.name})`,
    );
  }
}

export async function taskCreateCommand(
  args: {
    room?: string | number;
    body?: string;
    assignees?: string;
    json?: boolean;
  },
): Promise<void> {
  if (!args.room) {
    console.error("Error: --room <roomId> is required");
    process.exit(1);
  }
  if (!args.body) {
    console.error("Error: --body <text> is required");
    process.exit(1);
  }

  const assigneeIds = args.assignees
    ? args.assignees.split(",").map((id) => parseInt(id.trim(), 10))
    : [];

  const result = await createTask(String(args.room), args.body, assigneeIds);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Task(s) created. IDs: ${result.task_ids.join(", ")}`);
}
