# chatwork-tools

Node LTS + TypeScript で Chatwork API を扱うツールセット。
CLI・MCPサーバー・Webhookサーバーを同一パッケージで管理します。

## セットアップ

### 前提

- Node.js LTS（>=20、推奨 22）
- pnpm（`corepack enable pnpm` で有効化可能）

```bash
pnpm install
```

### 環境変数の設定

`~/.zshenv` などに以下を設定してください：

```sh
export CHATWORK_API_TOKEN=your_token_here
export ANTHROPIC_API_KEY=your_key_here
```

Chatwork API トークンは [Chatwork 設定画面](https://www.chatwork.com/#setting/profile) で取得できます。

### 秘匿ゲートの有効化（clone 後に必ず）

**このリポジトリは公開です。ゲートは push 自動化のためではなく、漏洩防止のために入れています。**
API トークンや実メールアドレスが commit に混ざったまま push されると、履歴を書き換えても
fork・既存 clone・各種キャッシュには残り、実質的に取り消せません。

`core.hooksPath` は clone に付いてこないので、clone のたびに設定が要ります。

```bash
git config core.hooksPath tools/hooks
install -m 600 tools/gate-patterns.example ~/.secrets/gate-patterns  # 具体値を追記
```

- pre-commit は staged の追加行とファイル名を、pre-push は送出する commit すべての追加行を検査します
- 検出は構造で行います（メール形・32 桁 hex の API トークン形・OAuth client_id）。
  許可するのは RFC 2606 の予約ドメイン（`example.com` / `.org` / `.net` / `.test` など）だけです。
  独自の placeholder を通したい場合は、根拠をこの README に書いてから許可リストへ足してください
- 許可リストに入れている例外は現在 1 つだけです。**`git@github.com`** — clone 手順に必ず出る
  SSH の固定 URL で、個人アドレスではありません。完全一致でのみ通すので、
  `git@github.com.<別ドメイン>` のように後ろに何か付いた形は落ちます
- 数値 ID（room ID・account ID）は桁数で検出しません。誤検知でゲートが使えなくなるためです。
  絶対に出てはいけない具体値は `~/.secrets/gate-patterns` に足してください（リポジトリには置きません）
- `~/.secrets/gate-patterns` が無い・権限が緩い・有効なパターンが 0 件のいずれでも、
  ゲートは commit と push を止めます（検査できないまま通さない）

## CLI

### 使用例

```bash
# ルーム一覧
pnpm cli rooms

# メッセージ取得
pnpm cli messages --room 123456

# メッセージ送信
pnpm cli send --room 123456 --message "Hello, World!"

# ファイル添付送信（--name で表示ファイル名を上書き、--message で添付メッセージ）
pnpm cli send:file --room 123456 --file ./report.csv --message "本日のレポート"

# タスク一覧
pnpm cli tasks --room 123456

# タスク作成
pnpm cli task:create --room 123456 --body "タスクの内容" --assignees 111,222

# JSON出力
pnpm cli rooms --json
```

## MCPサーバー

### 利用可能なツール

| ツール名 | 説明 | 必須パラメータ |
|---|---|---|
| `get_rooms` | ルーム一覧取得 | なし |
| `get_messages` | メッセージ取得 | `roomId` |
| `send_message` | メッセージ送信 | `roomId`, `message` |
| `send_file` | ファイル添付送信 | `roomId` ＋ `filePath` または（`content`(base64)＋`filename`） |
| `get_tasks` | タスク一覧取得 | `roomId` |
| `create_task` | タスク作成 | `roomId`, `body` |

### Claude Code への登録

`~/.claude/settings.json` の `mcpServers` に以下を追加してください：

```json
{
  "mcpServers": {
    "chatwork": {
      "command": "pnpm",
      "args": ["--dir", "/home/noda/dev/chatwork-tools", "-s", "mcp"],
      "env": {
        "CHATWORK_API_TOKEN": "${CHATWORK_API_TOKEN}"
      }
    }
  }
}
```

`tsx` を使わず単一ファイルで起動したい場合は、後述の `pnpm build` 後に
`node /home/noda/dev/chatwork-tools/dist/mcp/server.cjs` を `command`/`args` に指定します。

Windows で standalone exe + Credential Manager 方式で配布する場合は [docs/windows-setup.md](docs/windows-setup.md) を参照してください。

## Webhookサーバー

受信したメッセージを Claude API (claude-sonnet-4-6) に投げて自動返信します。
HTTP は Hono + @hono/node-server で動作します。

### 起動

```bash
pnpm webhook
# → ポート 3000 で起動（WEBHOOK_PORT 環境変数で変更可能）
```

### エンドポイント

- `POST /webhook` — Chatwork Webhook イベント受信
- `GET /health` — ヘルスチェック

### ngrok との連携

```bash
# ターミナル1: Webhookサーバー起動
pnpm webhook

# ターミナル2: ngrok で外部公開
ngrok http 3000
```

ngrok が表示した URL（例: `https://xxxx.ngrok.io`）を Chatwork の Webhook 設定に登録します。

**Chatwork Webhook 設定手順：**
1. Chatwork 管理画面 → インテグレーション → Webhook
2. Webhook URL: `https://xxxx.ngrok.io/webhook`
3. イベント: 「メッセージ作成」を選択
4. 監視するルームを選択して保存

## ビルド

### バンドル（CJS 単一ファイル）

```bash
pnpm build
# → dist/cli/main.cjs, dist/mcp/server.cjs, dist/webhook/server.cjs を出力
```

### Windows 向け standalone exe

MCP サーバーを Windows 用の単一実行ファイルにします（@yao-pkg/pkg）。

```bash
pnpm build        # 先に dist を生成
pnpm build:exe
# → bin/chatwork-mcp.exe（node22-win-x64）を出力
```

## 開発

```bash
pnpm typecheck    # tsc --noEmit（strict）
pnpm test         # vitest
```
