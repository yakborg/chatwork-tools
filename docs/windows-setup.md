# Windows セットアップ（MCP standalone exe 配布）

Node/Deno を入れられない Windows ユーザー（同僚含む）向けに、chatwork MCP を
**standalone exe ＋ PowerShell wrapper** で Claude Code に登録する手順。
トークンは Windows Credential Manager に暗号化保管し、平文 config に置かない。

## 配布構成
```
chatwork-tools/
├─ bin/chatwork-mcp.exe         # MCP server 単一実行ファイル（pnpm build:exe で生成・.gitignore対象）
├─ chatwork-mcp-wrapper.ps1     # Credential Manager から token を読み exe を起動（.claude.json の command）
└─ set-chatwork-token.ps1       # token 保管/ローテーション（初回1回）
```
wrapper は `$PSScriptRoot\bin\chatwork-mcp.exe` を相対参照するので、フォルダごとどこに置いてもよい。

## 1. exe をビルド
WSL/Linux からクロスビルド（Windows 側に何も入れない）:
```bash
pnpm install
pnpm build        # tsup -> dist/mcp/server.cjs（依存を全インライン化した CJS 単一バンドル）
pnpm build:exe    # pkg -> bin/chatwork-mcp.exe（node22-win-x64）
```
**クロスビルドの注意**: WSL/Linux から Windows 向けに焼くと、pkg 既定の V8 バイトコードを
Windows 側 V8 が拒否する（`[pkg] V8 rejected the bytecode cache ... mismatched host/target V8`）。
`build:exe` は `--public --public-packages "*"` 付き（バイトコード化せず素の JS を埋め込む）にすること。
Windows ネイティブでビルドする場合は不要。生成した `bin/chatwork-mcp.exe` を配布先の `chatwork-tools/bin/` に置く。

## 2. トークンを保管（各自・初回のみ）
```powershell
.\set-chatwork-token.ps1            # 安全にプロンプト（トークンが履歴/プロセス引数に残らない）
# 非対話: .\set-chatwork-token.ps1 -Token xxxx
```
Windows Credential Manager に generic 資格情報 `ChatworkApiToken`（DPAPI 暗号化・このユーザー/PC 限定）として保存。
トークンは Chatwork 右上アイコン -> サービス連携 -> API Token から取得。

## 3. .claude.json に登録
`%USERPROFILE%\.claude.json` の top-level `mcpServers` に追加（パスは配置先に合わせる）:
```json
{
  "mcpServers": {
    "chatwork-mcp": {
      "command": "powershell.exe",
      "args": ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
               "C:\Users\<you>\tools\chatwork-tools\chatwork-mcp-wrapper.ps1"],
      "env": {}
    }
  }
}
```
Claude Code を再起動するとロードされる。

## 仕組み / 設計判断
- **トークン保管 = Credential Manager**（OS 環境変数やセッション env にしない）。平文 config を避け、実行時の露出を
  wrapper+exe に限定する（全プロセスが継承する env や、全 MCP から見える session env は prompt-injection/exfil リスク）。
- **wrapper**: Win32 `CredRead`(P/Invoke・3rd-party 不要) で token 取得 -> `ProcessStartInfo`
  (`UseShellExecute=$false`・**ストリーム無加工**) で exe 起動、token は子プロセスの env のみに設定。
  **stdout には何も書かない**（MCP の JSON-RPC stream を壊すため。メッセージは stderr へ）。
  token は API 呼び出し時のみ参照されるので、未設定でも server 起動・`tools/list` は通る。
- **exe は build 成果物**（`bin/` は .gitignore）。バージョン管理されるのは wrapper 2本とこの手順のみ。

## tools（6）
`get_rooms` / `get_messages` / `send_message` / `send_file` / `get_tasks` / `create_task`

## 実行中 exe の差し替え
Windows は**実行中の exe を上書き不可だが rename は可**。更新時は「旧 exe を `.bak` に rename -> 新 exe を本名で配置 -> Claude 再起動」。

## 注意
Chatwork トークンは unscoped（アカウントの全 read/write）。コミットしない・漏れたら再発行。
