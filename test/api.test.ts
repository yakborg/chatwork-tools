import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTask,
  getMessages,
  getRooms,
  sendMessage,
} from "../src/api.ts";

const BASE_URL = "https://api.chatwork.com/v2";

function mockFetch(body: unknown, ok = true, status = 200) {
  const fn = vi.fn(async (_url: string, _init?: RequestInit) =>
    ({
      ok,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }) as unknown as Response
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  process.env.CHATWORK_API_TOKEN = "test-token";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("api", () => {
  it("getRooms requests /rooms with the auth header", async () => {
    const fetchMock = mockFetch([{ room_id: 1, name: "r" }]);
    const rooms = await getRooms();

    expect(rooms).toEqual([{ room_id: 1, name: "r" }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/rooms`);
    expect((init as RequestInit).headers).toMatchObject({
      "X-ChatWorkToken": "test-token",
    });
  });

  it("getMessages forces a fresh read with force=1", async () => {
    const fetchMock = mockFetch([]);
    await getMessages("123");

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${BASE_URL}/rooms/123/messages?force=1`,
    );
  });

  it("sendMessage POSTs a url-encoded body", async () => {
    const fetchMock = mockFetch({ message_id: "999" });
    const res = await sendMessage("123", "hello & bye");

    expect(res).toEqual({ message_id: "999" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/rooms/123/messages`);
    expect(init.method).toBe("POST");
    expect(init.body).toBe("body=hello+%26+bye");
  });

  it("createTask appends every assignee as to_ids", async () => {
    const fetchMock = mockFetch({ task_ids: [1, 2] });
    await createTask("123", "do it", [111, 222]);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe("body=do+it&to_ids=111&to_ids=222");
  });

  it("throws on a non-ok response", async () => {
    mockFetch({ errors: ["bad"] }, false, 401);
    await expect(getRooms()).rejects.toThrow(/API error 401/);
  });
});
