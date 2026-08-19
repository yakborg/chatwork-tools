---
name: chatwork-adapter
description: Chatwork への送信（POST）を実装するときに使う。Chatwork API トークン認証、メッセージ投稿、Chatwork 記法フォーマットを扱う全ての場面で参照すること。TypeScript (Deno) 前提。
---

# Chatwork Adapter

Chatwork API との送受信を担うアダプター層の実装ガイド。ロジックや分析は含めず、**送受信のみ**に責務を限定すること。

## 環境変数

```
CHATWORK_API_TOKEN      # Chatwork API トークン
```

`.env` に記載し、`Deno.env.get()` で取得する。絶対にコードに直書きしない。

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
const ROOM_ID = "<room_id>"; // 投稿先ルーム ID

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

Phase 2（Webhook 受信）は ga-chatwork-reporter 廃止（2026-08-19）により取り下げ。

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
