# project-sync — sabotage-minecraft

> AI 向け同期ドキュメント。**実装・レビュー・運用前に必ず読むこと。**
> 人間向けの概要は [README.md](../README.md)、配信向け説明は [worldview.md](./worldview.md)。

<!-- sync:auto:meta:start -->
最終更新の想定リポジトリ: `hakonikomoru/sabotage-minecraft`（`main`・`5fc8563`・2026-06-04・`npm run sync:project-docs` 自動反映）
<!-- sync:auto:meta:end -->

---

## 1. 概要

| 項目 | 内容 |
|------|------|
| Repository | [`hakonikomoru/sabotage-minecraft`](https://github.com/hakonikomoru/sabotage-minecraft) |
| 配信企画名 | コメントで世界が壊れる妨害マイクラ |
| 制作 | komolab - こもらぼ - |
| ローカルパス | `/Users/ebata/app/sabotage-minecraft` |
| 実行環境 | **Bedrock Dedicated Server (BDS) 専用** |
| MVP 第一ゴール | debug endpoint → Minecraft 内で妨害発動（YouTube なし） |

### ドキュメントの役割分担

| ファイル | 読者 | 用途 |
|----------|------|------|
| [README.md](../README.md) | 開発者 | 導入・起動・コマンド早見 |
| [worldview.md](./worldview.md) | 配信・視聴者 | 企画説明・世界観 |
| [addon-description.md](./addon-description.md) | 配布・紹介 | 短文コピペ用 |
| **project-sync.md**（本ファイル） | AI / 開発者 | 構成・API・実装状況の正 |
| [game-design.md](./game-design.md) | 企画・開発 | ルール・モード詳細 |

---

## 2. アーキテクチャ

```txt
YouTube Live API ──┐
Twitch EventSub  ──┼──► PlatformManager (bridge/src/platforms/)
debug POST       ──┘         │
                             ▼
                    NormalizedStreamEvent
                             │
                    eventResolver + safety + cooldown
                             ▼
                       SabotageEvent
                             │
              GET /api/minecraft/events (poll ~2s)
                             ▼
              Behavior Pack (event-queue → effects)
                             │
                    POST /api/minecraft/events/ack
```

**設計原則**

- Minecraft Addon は **プラットフォーム非依存**（`SabotageEvent` の `command` のみ処理）
- OAuth / API キーは **Bridge のみ**（Addon は `bridge.apiKey` のみ）
- **固定座標禁止** — `!sab start` 実行位置基準。locate / 自動 TP は MVP 外
- 強妨害・即死・TNT は **初期 OFF**（[safety-policy.md](./safety-policy.md)）

---

## 3. 技術構成

| コンポーネント | 技術 | パス |
|----------------|------|------|
| Bridge Server | Node.js 20+ / TypeScript / Fastify | `bridge/` |
| Behavior Pack | Bedrock Script API / `@minecraft/server-net` | `addon/behavior_packs/sabotage_behavior/` |
| 通信方向 | Minecraft → Bridge **ポーリング**（約 2 秒） | `integrations/bridge-client.js` |
| 認証 | ヘッダー `X-Bridge-Api-Key` | Bridge `.env` + Addon `config.js` |

### Bridge プラットフォーム adapter

| パス | 状態 | 役割 |
|------|------|------|
| `platforms/debug/` | 実装済 | `POST /api/debug/events` |
| `platforms/youtube/` | 部分実装 | Live Chat ポーリング（`ENABLE_YOUTUBE_CHAT=true` 時） |
| `platforms/twitch/` | スタブ | EventSub（MVP 後） |

---

## 4. Bridge API

| Method | Path | 認証 | 用途 |
|--------|------|------|------|
| GET | `/health` | なし | ヘルスチェック |
| GET | `/api/minecraft/events` | `X-Bridge-Api-Key` | Addon ポーリング |
| POST | `/api/minecraft/events/ack` | 同上 | 処理済みイベント ACK |
| GET | `/api/admin/status` | 同上 | 接続状態・キュー数 |
| POST | `/api/debug/events` | 同上 | **開発のみ** 手動イベント投入 |
| GET | `/auth/youtube` | なし | OAuth 開始 |
| GET | `/auth/youtube/callback` | なし | OAuth コールバック |

### debug イベント例

```bash
curl -X POST http://127.0.0.1:8787/api/debug/events \
  -H "Content-Type: application/json" \
  -H "X-Bridge-Api-Key: change-me" \
  -d '{"command":"hole","authorName":"debug-user"}'
```

`NODE_ENV=production` では `/api/debug/events` は **404**。

### 主要型（Bridge）

```ts
StreamPlatform = "youtube" | "twitch" | "debug"
NormalizedStreamEvent  // Bridge 内部の正規化イベント
SabotageEvent          // Minecraft へ渡す最終イベント
```

定義: `bridge/src/types.ts`

---

## 5. ゲームモード

| モード ID | 表示名 | 開始 | 勝利条件 | winTiming |
|-----------|--------|------|----------|-----------|
| `fill_challenge` | 10分ブロック埋めチャレンジ | `!sab start` | 90 個（90%）到達の**瞬間** | `on_reach` |
| `fill_and_defend` | ブロック埋め防衛チャレンジ | `!sab start defend` | **10 分終了時** 90 個以上キープ | `on_time_up` |

### フィールド（共通）

- 内側 **10×10** 判定、外枠 **12×12**（黄枠 + 黒床）
- 生成: `modes/fill-field.js` — 安全確認 → スナップショット → 生成
- リセット: `!sab reset` — `originalBlocks` から地形復元

### 視聴者コマンド（MVP）

| コマンド | 効果 | Bridge CD |
|----------|------|-----------|
| `!slow` | 鈍足 10 秒 | 10 秒 |
| `!blind` | 暗闇 8 秒 | 10 秒 |
| `!chicken` | ニワトリ 5 匹 | 15 秒 |
| `!hole` | 羊毛 3 個を床に戻す | 15 秒 |
| `!block` | 羊毛 +16（応援） | 20 秒 |

### 管理コマンド（`!sab`）

```txt
start | start defend | mode [id] | stop | pause | resume
status | clear | reset | test <slow|blind|chicken|hole|block>
```

将来: 名前付きアイテム `SAB:menu`, `SAB:start`, …（[game-design.md](./game-design.md)）

### ゲーム状態

```txt
idle → running ⇄ paused → finished
         ↑ reset / stop
```

---

## 6. 実装状況

### 完了

- [x] Bridge Server + PlatformManager
- [x] debug endpoint → Minecraft ポーリング → 効果発動
- [x] `fill_challenge` / `fill_and_defend` モード
- [x] 10×10 フィールド / タイマー / 進捗 / 勝敗判定
- [x] 妨害 5 種 + イベントキュー + Bridge ACK
- [x] `getGameSnapshot()`（OBS 将来用）
- [x] 効果 registry（category / risk / enabled）— Bridge + Addon
- [x] StreamPlatform / NormalizedStreamEvent 抽象化
- [x] 配布向け座標 — 安全確認 / スナップショット / reset 復元
- [x] README / worldview / addon-description 分離
- [x] Java OSS 調査（[research-java-oss.md](./research-java-oss.md)）

### 未実装（MVP 後）

- [ ] YouTube Super Chat / メンバー → 演出ルーレット
- [ ] Twitch EventSub 実装（[twitch-api-setup.md](./twitch-api-setup.md)）
- [ ] `vote_event` / `random_roulette` / `wolf_capture_race` モード
- [ ] 名前付きアイテムメニュー（`SAB:*`）
- [ ] OBS オーバーレイ / Web 管理画面

---

## 7. ディレクトリ構成

<!-- sync:auto:directory-tree:start -->
```
sabotage-minecraft/
├── addon/behavior_packs/sabotage_behavior/
│   ├── manifest.json
│   ├── pack_icon.png
│   └── scripts/
│       ├── command-router.js
│       ├── config.js
│       ├── effects/
│       │   ├── fill-effects.js
│       │   ├── index.js
│       │   ├── registry.js
│       │   ├── support-effects.js
│       │   ├── visual-effects.js
│       │   └── weak-effects.js
│       ├── event-queue.js
│       ├── integrations/
│       │   └── bridge-client.js
│       ├── main.js
│       ├── modes/
│       │   ├── fill-and-defend.js
│       │   ├── fill-challenge.js
│       │   ├── fill-field.js
│       │   ├── fill-progress.js
│       │   ├── mode-config.js
│       │   └── mode-manager.js
│       ├── state.js
│       ├── timer.js
│       └── utils/
│           ├── blocks.js
│           ├── logger.js
│           ├── players.js
│           └── random.js
├── bridge/
│   ├── package-lock.json
│   ├── package.json
│   ├── src/
│   │   ├── config.ts
│   │   ├── effects/
│   │   │   └── registry.ts
│   │   ├── index.ts
│   │   ├── logs/
│   │   │   └── logger.ts
│   │   ├── minecraft/
│   │   │   ├── eventStore.ts
│   │   │   └── routes.ts
│   │   ├── platforms/
│   │   │   ├── debug/
│   │   │   ├── eventResolver.ts
│   │   │   ├── index.ts
│   │   │   ├── twitch/
│   │   │   └── youtube/
│   │   ├── rules/
│   │   │   ├── commandParser.ts
│   │   │   ├── cooldown.ts
│   │   │   ├── rateLimit.ts
│   │   │   ├── sabotageMap.ts
│   │   │   └── safety.ts
│   │   ├── stream/
│   │   │   └── normalizer.ts
│   │   ├── types.ts
│   │   └── youtube/
│   │       ├── auth.ts
│   │       ├── eventNormalizer.ts
│   │       ├── liveChatClient.ts
│   │       └── youtubeTypes.ts
│   └── tsconfig.json
├── docs/
│   ├── addon-description.md
│   ├── bds-setup.md
│   ├── game-design.md
│   ├── project-sync.md
│   ├── research-java-oss.md
│   ├── safety-policy.md
│   ├── twitch-api-setup.md
│   ├── twitch-setup.md
│   ├── worldview.md
│   └── youtube-api-setup.md
├── scripts/
│   ├── project-sync-core.mjs
│   ├── start-local-dev.ps1
│   ├── stop-local-dev.ps1
│   └── sync-project-docs.mjs
```
<!-- sync:auto:directory-tree:end -->

---

## 8. Bridge `src/` 一覧

<!-- sync:auto:src-tree:start -->
| パス | 種別 |
|------|------|
| `config.ts` | file |
| `effects/` | dir |
| `effects/registry.ts` | file |
| `index.ts` | file |
| `logs/` | dir |
| `logs/logger.ts` | file |
| `minecraft/` | dir |
| `minecraft/eventStore.ts` | file |
| `minecraft/routes.ts` | file |
| `platforms/` | dir |
| `platforms/debug/` | dir |
| `platforms/debug/debugEvents.ts` | file |
| `platforms/eventResolver.ts` | file |
| `platforms/index.ts` | file |
| `platforms/twitch/` | dir |
| `platforms/twitch/cheerTier.ts` | file |
| `platforms/twitch/twitchClient.ts` | file |
| `platforms/twitch/twitchNormalizer.ts` | file |
| `platforms/twitch/twitchRewardMap.ts` | file |
| `platforms/twitch/twitchTypes.ts` | file |
| `platforms/youtube/` | dir |
| `platforms/youtube/auth.ts` | file |
| `platforms/youtube/youtubeClient.ts` | file |
| `platforms/youtube/youtubeNormalizer.ts` | file |
| `platforms/youtube/youtubeTypes.ts` | file |
| `rules/` | dir |
| `rules/commandParser.ts` | file |
| `rules/cooldown.ts` | file |
| `rules/rateLimit.ts` | file |
| `rules/sabotageMap.ts` | file |
| `rules/safety.ts` | file |
| `stream/` | dir |
| `stream/normalizer.ts` | file |
| `types.ts` | file |
| `youtube/` | dir |
| `youtube/auth.ts` | file |
| `youtube/eventNormalizer.ts` | file |
| `youtube/liveChatClient.ts` | file |
| `youtube/youtubeTypes.ts` | file |
<!-- sync:auto:src-tree:end -->

### Addon 主要ファイル（手動）

| パス | 役割 |
|------|------|
| `scripts/main.js` | エントリ・Bridge ポーリングループ |
| `scripts/command-router.js` | `!sab` コマンド |
| `scripts/config.js` | Bridge URL / apiKey / ゲーム設定 |
| `scripts/state.js` | ゲーム状態・フィールド参照 |
| `scripts/event-queue.js` | イベントキュー |
| `scripts/integrations/bridge-client.js` | server-net HTTP |
| `scripts/modes/mode-manager.js` | 開始 / 停止 / reset |
| `scripts/modes/fill-field.js` | フィールド生成・安全確認・復元 |
| `scripts/effects/` | 妨害・応援効果実装 |
| `scripts/effects/registry.js` | Bedrock 側効果 registry |

---

## 9. 環境変数（Bridge）

**ローカル:** `bridge/.env`（Git 管理外 — `.env.example` から作成）

| 変数 | MVP 推奨 | 説明 |
|------|----------|------|
| `PORT` | `8787` | Bridge 待受ポート |
| `NODE_ENV` | `development` | production で debug 404 |
| `BRIDGE_API_KEY` | `change-me` | Addon `config.js` と一致 |
| `ENABLE_YOUTUBE` | `false` | YouTube adapter |
| `ENABLE_YOUTUBE_CHAT` | `false` | Live Chat ポーリング |
| `ENABLE_TWITCH` | `false` | Twitch adapter |
| `ENABLE_STRONG_EFFECTS` | `false` | 強妨害 |

詳細: `bridge/.env.example`, [youtube-api-setup.md](./youtube-api-setup.md)

---

## 10. npm scripts

### リポジトリルート

| コマンド | 用途 |
|----------|------|
| `npm run sync:project-docs` | 本ファイルの auto ブロック更新 |
| `npm run sync:project-docs:check` | CI 用ドキュメント鮮度チェック |
| `npm run bridge:install` | Bridge 依存インストール |
| `npm run dev:local` | **Windows:** Bridge + BDS を別ウィンドウで一括起動 |
| `npm run dev:local:stop` | **Windows:** Bridge (8787) + BDS (19132) を停止 |
| `npm run bridge:dev` | Bridge 開発起動（ポート 8787） |
| `npm run bridge:build` | TypeScript ビルド |
| `npm run bridge:start` | 本番起動（`dist/`） |

### ローカル一括起動（Windows）

```powershell
npm run dev:local
```

| 項目 | 内容 |
|------|------|
| 実装 | `scripts/start-local-dev.ps1` |
| Bridge | 新 PowerShell → `npm run bridge:dev`（8787） |
| BDS | 新 PowerShell → `bds/bedrock_server.exe`（19132） |
| 前提 | `bds/` に BDS 展開済み（`.gitignore` 対象）、Behavior Pack 配置済み |
| 接続 | Bedrock → サーバー追加 → `127.0.0.1:19132` |
| 終了 | `npm run dev:local:stop`（サーバー停止 + 起動ウィンドウを閉じる） |

Bridge のみ / BDS のみが必要なときは `bridge:dev` と `bds/bedrock_server.exe` を個別に起動する。

---

## 11. 優先順位（ロードマップ）

```txt
1. debug endpoint → Minecraft 発動          ← 完了
2. BDS + Behavior Pack 読み込み             ← 完了
3. /scriptevent start → フィールド生成      ← 完了
4. Bridge ↔ Addon 連携 end-to-end           ← 完了
5. YouTube OAuth + Live Chat                ← 完了（2026-06-05 動作確認）
6. 初回配信運用チェックリスト                ← 現在ここ（stream-runbook.md）
7. Super Chat 演出ルーレット
8. Twitch EventSub
9. 追加モード（vote / roulette / wolf_capture_race）
```

### YouTube Live Chat 連動（確認済み 2026-06-05）

```txt
[x] Google Cloud OAuth Client 作成
[x] YouTube Data API v3 有効化
[x] GET /auth/youtube で Refresh Token 取得
[x] bridge/.env に YOUTUBE_REFRESH_TOKEN 設定
[x] YOUTUBE_LIVE_VIDEO_ID 設定（限定公開ライブ可）
[x] Bridge: YouTube live chat connected
[x] YouTube チャット !block / !hole / !slow 等を Bridge が認識
[x] Bridge → BDS ポーリング / ACK
[x] Minecraft 内で効果発動
```

主要ルート:

```txt
debug POST        → Bridge → Minecraft   OK
YouTube Live Chat → Bridge → Minecraft   OK
```

**秘密情報:** `YOUTUBE_REFRESH_TOKEN` / `YOUTUBE_CLIENT_SECRET` / `bridge/.env` は Git 管理外。コミットしない。

手順: [youtube-api-setup.md](./youtube-api-setup.md) / 配信運用: [stream-runbook.md](./stream-runbook.md)

---

## 12. 検証チェックリスト

### Bridge debug → Minecraft E2E

```txt
[x] npm run dev:local または bridge:dev + BDS 起動
[x] bridge/.env（BRIDGE_API_KEY = config.js の bridge.apiKey）
[x] /health → ok: true
[x] ゲーム内 /scriptevent sab:command start
[x] Invoke-RestMethod で POST /api/debug/events（PowerShell）
[x] BDS: [SAB] Bridge connected
[x] BDS: [SAB] Received events / Queue event from bridge
[x] BDS: [SAB] Processing queued event / Effect executed
[x] BDS: [SAB] Acked events
[x] Bridge: Debug event accepted / Minecraft polled events / Minecraft acked events
[x] block / hole / slow / blind / chicken を各1回
```

### YouTube Live Chat → Minecraft E2E

```txt
[x] ENABLE_YOUTUBE=true / ENABLE_YOUTUBE_CHAT=true
[x] /auth/youtube で Refresh Token 取得
[x] YOUTUBE_LIVE_VIDEO_ID 設定（ライブ中）
[x] Bridge: YouTube live chat connected
[x] ライブチャット !block / !hole 等 → Bridge Event queued
[x] BDS: Effect executed
[x] ENABLE_STRONG_EFFECTS=false
```

PowerShell で debug 投入（`curl` エイリアス不可）:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8787/api/debug/events" -Method POST `
  -Headers @{ "X-Bridge-Api-Key" = "change-me" } -ContentType "application/json" `
  -Body '{"command":"block","authorName":"debug-user"}'
```

### 全体

```txt
[ ] bridge/.env 作成（BRIDGE_API_KEY = config.js と一致）
[ ] npm run bridge:install（初回）
[ ] npm run dev:local または bridge:dev + BDS で起動
[ ] curl POST /api/debug/events → 200
[ ] BDS で pack 読み込みログ確認
[ ] !sab start → フィールド生成
[ ] !sab test hole / !sab test block
[ ] debug curl → ゲーム内効果発動
[ ] !sab reset → 地形復元
[ ] npm run bridge:build 成功
```

配信前: [bds-setup.md](./bds-setup.md) のチェックリストも参照。

---

## 13. 注意事項

- `@minecraft/server-net` は **BDS 専用** — Realms / 通常クライアント非対応
- OAuth / Refresh Token は Bridge のみ。Addon に置かない
- Java OSS は **設計参考のみ** — コードコピー禁止（[research-java-oss.md](./research-java-oss.md)）
- GitHub push 先は `hakonikomoru` のみ（[`~/app/AGENTS.md`](/Users/ebata/app/AGENTS.md)）
- 構成変更時は **同じ PR / コミットで** `npm run sync:project-docs` を実行

---

## 14. 関連ドキュメント

| ファイル | 内容 |
|----------|------|
| [worldview.md](./worldview.md) | 配信企画・世界観 |
| [addon-description.md](./addon-description.md) | 配布・紹介文 |
| [game-design.md](./game-design.md) | ルール・将来モード |
| [bds-setup.md](./bds-setup.md) | BDS 導入・配信前チェック |
| [stream-runbook.md](./stream-runbook.md) | **初回配信 運用チェックリスト** |
| [youtube-api-setup.md](./youtube-api-setup.md) | YouTube API |
| [twitch-api-setup.md](./twitch-api-setup.md) | Twitch EventSub |
| [research-java-oss.md](./research-java-oss.md) | Java OSS 調査 |
| [safety-policy.md](./safety-policy.md) | 安全・クールダウン |
