# project-sync — sabotage-minecraft

> AI 向け同期ドキュメント。実装前に読むこと。

<!-- sync:auto:meta:start -->
最終更新の想定リポジトリ: `hakonikomoru/sabotage-minecraft`
<!-- sync:auto:meta:end -->

## 1. 概要

| 項目 | 内容 |
|------|------|
| Repository | `sabotage-minecraft` |
| 配信企画名 | コメントで世界が壊れる妨害マイクラ |
| ローカルパス | `/Users/ebata/app/sabotage-minecraft` |
| 前提 | Bedrock Dedicated Server 専用 |

## 2. 技術構成

| コンポーネント | 技術 |
|----------------|------|
| Bridge | Node.js / TypeScript / Fastify |
| Addon | Bedrock Script API / `@minecraft/server-net` |
| 通信 | Minecraft → Bridge ポーリング（約 2 秒） |
| プラットフォーム | `platforms/youtube`, `platforms/twitch`, `platforms/debug` |

将来的に **Twitch EventSub** にも対応予定。MVP は YouTube + debug のみ。
Minecraft Addon はプラットフォーム非依存（`SabotageEvent` のみ処理）。

## 3. ゲームモード

| モード | 勝利条件 |
|--------|----------|
| `fill_challenge` | 90% 到達の瞬間に勝利 |
| `fill_and_defend` | 10 分終了時点で 90 個以上キープ |

- YouTube コメント: `!slow` `!blind` `!chicken` `!hole` `!block`
- 管理: `!sab start|start defend|mode|stop|pause|resume|status|clear|reset|test`
- Bridge debug: `POST /api/debug/events`（development のみ）

## 4. 現在の実装状況

### 完了

- [x] Bridge Server
- [x] `fill_challenge` モード
- [x] **`fill_and_defend` モード**
- [x] モード切替（`!sab mode` / `!sab start defend`）
- [x] 10×10 フィールド / タイマー / 進捗 / 勝敗判定
- [x] 妨害 5 種 + イベントキュー
- [x] **`getGameSnapshot()`**（OBS 将来用）
- [x] **Java OSS 調査** + 効果 registry（category / risk / enabled）
- [x] **StreamPlatform / StreamEvent** 抽象化（Bridge）

### 未実装（MVP 後）

- [ ] Super Chat / メンバーイベント
- [ ] Twitch EventSub 実装（[twitch-setup.md](./twitch-setup.md)）
- [ ] `vote_event` / `random_roulette` モード

## 5. ディレクトリ構成

<!-- sync:auto:directory-tree:start -->
```
sabotage-minecraft/
├── addon/behavior_packs/sabotage_behavior/
├── bridge/
└── docs/
```
<!-- sync:auto:directory-tree:end -->

## 6. 注意事項

- OAuth / API キーは Bridge のみ（Addon には `apiKey` のみ）
- `@minecraft/server-net` は BDS 専用 — Realms 非対応
- 強妨害（TNT / クリーパー等）は MVP では未実装
- debug endpoint は本番（`NODE_ENV=production`）では 404

## 7. 関連ドキュメント

- [game-design.md](./game-design.md)
- [research-java-oss.md](./research-java-oss.md)
- [twitch-setup.md](./twitch-setup.md)
- [youtube-api-setup.md](./youtube-api-setup.md)
- [bds-setup.md](./bds-setup.md)
- [safety-policy.md](./safety-policy.md)
