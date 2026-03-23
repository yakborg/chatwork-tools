import { getRooms } from "../../api.ts";
import type { Room } from "../../types.ts";

export async function roomsCommand(args: { json?: boolean }): Promise<void> {
  const rooms = await getRooms();

  if (args.json) {
    console.log(JSON.stringify(rooms, null, 2));
    return;
  }

  for (const room of rooms) {
    console.log(`[${room.room_id}] ${room.name} (unread: ${room.unread_num})`);
  }
}
