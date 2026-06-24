---
name: chatwork-adapter
description: Chatwork への送信（POST）および Webhook 受信処理を実装するときに使う。Chatwork API トークン認証、メッセージ投稿、Webhook ペイロード検証、Chatwork 記法フォーマットを扱う全ての場面で参照すること。TypeScript (Deno) 前提。
---

# Chatwork Adapter

Chatwork API との送受信を担うアダプター層の実装ガイド。ロジックや分析は含めず、**送受信のみ**に責務を限定すること。

## 環境変数

```
CHATWORK_API_TOKEN      # Chatwork API トークン
CHATWORK_WEBHOOK_TOKEN  # Webhook 検証トークン（Phase 2 のみ）
```

`.env` に記載し、`Deno.env.get()` で取得する。絶対にコードに直書きしない。

## 固定値

```
CHATWORK_ROOM_ID = 427668350  # GA Chatwork Reporter 投稿先ルーム
```

---

## メッセージ送信（POST）

### エンドポイント

```
POST https://api.chatwork.com/v2/rooms/{room_id}/messages
```

### 認証ヘッダー

```
X-ChatWorkToken: {API_TOKEN}
Content-Type: application/x-www-form-urlencoded
```

※ `application/json` は**不可**。必ず `application/x-www-form-urlencoded` を使う。

### 実装パターン

```typescript
// src/adapters/chatwork.ts

const CHATWORK_API_BASE = "https://api.chatwork.com/v2";
const ROOM_ID = "427668350"; // GA Chatwork Reporter 投稿先ルーム（固定）

export async function postMessage(body: string): Promise<void> {
  const token = Deno.env.get("CHATWORK_API_TOKEN");

  if (!token) {
    throw new Error("CHATWORK_API_TOKEN が未設定");
  }

  const res = await fetch(`${CHATWORK_API_BASE}/rooms/${ROOM_ID}/messages`, {
    method: "POST",
    headers: {
      "X-ChatWorkToken": token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ body }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chatwork API エラー: ${res.status} ${text}`);
  }
}
```

---

## Chatwork 記法

レポート投稿時は以下の記法を活用して視認性を高める。

| 記法 | 出力 |
|---|---|
| `[info][title]タイトル[/title]内容[/info]` | タイトル付きボックス |
| `[code]...コード...[/code]` | コードブロック |
| `[hr]` | 水平線 |
| `(bow)` | お辞儀アイコン |

### 日次レポートのテンプレート例

```typescript
export function formatDailyReport(data: {
  date: string;
  sessions: number;
  sessionsDiff: string;
  pvs: number;
  pvsDiff: string;
  cvs: number;
  cvRate: string;
  comment: string;
}): string {
  return `[info][title]📊 GA4 日次レポート ${data.date}[/title]` +
    `セッション数: ${data.sessions.toLocaleString()} (${data.sessionsDiff})\n` +
    `PV数: ${data.pvs.toLocaleString()} (${data.pvsDiff})\n` +
    `CV数: ${data.cvs} / CV率: ${data.cvRate}\n` +
    `[hr]\n` +
    `${data.comment}[/info]`;
}
```

---

## Webhook 受信（Phase 2）

### Deno Deploy + Hono でのハンドラ例

```typescript
import { Hono } from "hono";

const app = new Hono();

app.post("/webhook/chatwork", async (c) => {
  // Chatwork は署名検証なし。代わりにトークンをクエリパラメータで受け取る運用が多い
  const token = c.req.query("token");
  if (token !== Deno.env.get("CHATWORK_WEBHOOK_TOKEN")) {
    return c.text("Unauthorized", 401);
  }

  const payload = await c.req.json<ChatworkWebhookPayload>();
  const message = payload.webhook_event.body;
  const roomId = String(payload.webhook_event.room_id);

  // ここでは受け取るだけ。処理は agent 層に委譲する
  return { message, roomId };
});

export default app;
```

### Webhook ペイロード型定義

```typescript
export interface ChatworkWebhookPayload {
  webhook_setting_id: string;
  webhook_event_type: "mention_to_me" | "message_created";
  webhook_event_time: number;
  webhook_event: {
    message_id: string;
    room_id: number;
    account_id: number;
    body: string;
    send_time: number;
    update_time: number;
  };
}
```

---

## エラーハンドリング方針

- API エラーは `throw new Error(...)` で上位に伝播させる（アダプター内でリトライしない）
- レート制限（429）は上位で検知してリトライ判断する
- ネットワークエラーも同様に伝播させる

```typescript
// 呼び出し側でのリトライ例
async function postWithRetry(body: string, maxRetries = 3): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await postMessage(body);
      return;
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

---

## 接続テスト

実装後は以下で疎通確認する：

```typescript
// scripts/test-chatwork.ts
import { postMessage } from "../src/adapters/chatwork.ts";

await postMessage("✅ Chatwork adapter 接続テスト成功");
console.log("投稿完了");
```

```bash
deno run --allow-net --allow-env scripts/test-chatwork.ts
```

---

## よくある実装ミス

| ミス | 正しい対応 |
|---|---|
| `Content-Type: application/json` を使う | `application/x-www-form-urlencoded` を使う |
| `body` を JSON.stringify する | `new URLSearchParams({ body: text })` を使う |
| エラー時にレスポンスボディを無視する | `res.text()` でボディを取得してエラーメッセージに含める |
| Room ID を数値型で扱う | 文字列のまま URL に埋め込む |
