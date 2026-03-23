# chatwork-tools

Deno + TypeScript で Chatwork API を扱うツールセット。
CLI・MCPサーバー・Webhookサーバーを同一パッケージで管理します。

## セットアップ

### Deno のインストール（mise 経由）

```bash
mise use -g deno@latest
```

### 環境変数の設定

`~/.zshenv` に以下を追記してください：

```sh
export CHATWORK_API_TOKEN=your_token_here
export ANTHROPIC_API_KEY=your_key_here
```

Chatwork API トークンは [Chatwork 設定画面](https://www.chatwork.com/#setting/profile) で取得できます。

## CLI

### 使用例

```bash
# ルーム一覧
deno task cli rooms

# メッセージ取得
deno task cli messages --room 123456

# メッセージ送信
deno task cli send --room 123456 --message "Hello, World!"

# タスク一覧
deno task cli tasks --room 123456

# タスク作成
deno task cli task:create --room 123456 --body "タスクの内容" --assignees 111,222

# JSON出力
deno task cli rooms --json
```

### バイナリのコンパイル

```bash
deno task compile
# → bin/cw として出力される

./bin/cw rooms
```

## MCPサーバー

### 利用可能なツール

| ツール名 | 説明 | 必須パラメータ |
|---|---|---|
| `get_rooms` | ルーム一覧取得 | なし |
| `get_messages` | メッセージ取得 | `roomId` |
| `send_message` | メッセージ送信 | `roomId`, `message` |
| `get_tasks` | タスク一覧取得 | `roomId` |
| `create_task` | タスク作成 | `roomId`, `body` |

### Claude Code への登録

`~/.claude/settings.json` の `mcpServers` に以下を追加してください：

```json
{
  "mcpServers": {
    "chatwork": {
      "command": "deno",
      "args": ["run", "--allow-net", "--allow-env", "/home/noda/projects/chatwork-tools/src/mcp/server.ts"],
      "env": {
        "CHATWORK_API_TOKEN": "${CHATWORK_API_TOKEN}"
      }
    }
  }
}
```

## Webhookサーバー

受信したメッセージを Claude API (claude-sonnet-4-20250514) に投げて自動返信します。

### 起動

```bash
deno task webhook
# → ポート 3000 で起動（WEBHOOK_PORT 環境変数で変更可能）
```

### エンドポイント

- `POST /webhook` — Chatwork Webhook イベント受信
- `GET /health` — ヘルスチェック

### ngrok との連携

```bash
# ターミナル1: Webhookサーバー起動
deno task webhook

# ターミナル2: ngrok で外部公開
ngrok http 3000
```

ngrok が表示した URL（例: `https://xxxx.ngrok.io`）を Chatwork の Webhook 設定に登録します。

**Chatwork Webhook 設定手順：**
1. Chatwork 管理画面 → インテグレーション → Webhook
2. Webhook URL: `https://xxxx.ngrok.io/webhook`
3. イベント: 「メッセージ作成」を選択
4. 監視するルームを選択して保存
