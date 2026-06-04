# sabotage-minecraft

YouTube / Twitch ライブ連動の Minecraft **Bedrock Dedicated Server** 向け妨害ミニゲーム。

**配信企画名:** コメントで世界が壊れる妨害マイクラ  
**制作:** komolab - こもらぼ -  
**Repository:** [github.com/hakonikomoru/sabotage-minecraft](https://github.com/hakonikomoru/sabotage-minecraft)

| 用途 | ドキュメント |
|------|-------------|
| 配信企画・世界観 | [docs/worldview.md](docs/worldview.md) |
| 配布・紹介文 | [docs/addon-description.md](docs/addon-description.md) |
| ゲーム仕様 | [docs/game-design.md](docs/game-design.md) |
| **AI / 開発者向け詳細** | [docs/project-sync.md](docs/project-sync.md) |

---

## これは何か

視聴者がライブコメント（将来: チャンネルポイント・Bits 等）で、配信者の **10 分ブロック埋めチャレンジ** を妨害・応援する参加型ミニゲームです。

```txt
視聴者 (!slow / !hole / !block …)
    ↓
Bridge Server（Node.js）— 正規化・安全フィルタ
    ↓
Behavior Pack（BDS Script API）— ゲーム内効果
```

Minecraft 側は **コマンド名だけ** を見ます。YouTube / Twitch の違いは Bridge が吸収します。

---

## MVP のゴール

**YouTube API なし**で以下が動くこと:

1. Bridge Server 起動
2. `POST /api/debug/events` でイベント投入
3. Minecraft が Bridge からポーリング（約 2 秒）
4. `!hole` / `!block` / `!slow` / `!blind` / `!chicken` が発動

YouTube / Twitch 連携は debug 確認 **後** に設定します。

---

## 前提

| 対応 | 非対応 |
|------|--------|
| Bedrock Dedicated Server (BDS) 1.21+ | Realms |
| ローカル / VPS 上の BDS | 通常クライアント単体ホスト |
| `!sab start` 位置基準のフィールド生成 | 固定座標マップ |
| debug / YouTube / Twitch（将来） | locate 自動実行・自動 TP |

---

## リポジトリ構成

```txt
sabotage-minecraft/
├── addon/behavior_packs/sabotage_behavior/   # Behavior Pack
│   └── scripts/          main, modes, effects, bridge-client
├── bridge/               # Node.js Bridge Server
│   ├── src/platforms/    youtube / twitch / debug
│   └── .env.example      ← 手元で .env を作成
├── docs/                 # 仕様・セットアップ
└── scripts/              # project-sync 等
```

詳細ツリー: [docs/project-sync.md](docs/project-sync.md)

---

## クイックスタート

### 1. 依存インストール

```bash
npm run bridge:install
cd bridge && cp .env.example .env
```

`bridge/.env` は **Git 管理外**。Addon の `bridge.apiKey` と `BRIDGE_API_KEY` を一致させる。

| 変数 | ローカル初期値 |
|------|----------------|
| `BRIDGE_API_KEY` | `change-me` |
| `ENABLE_YOUTUBE` | `false` |
| `ENABLE_TWITCH` | `false` |
| `ENABLE_STRONG_EFFECTS` | `false` |

### 2. Bridge 起動

```bash
npm run bridge:dev
# または: cd bridge && npm run dev
```

### 3. debug イベント

```bash
curl -X POST http://127.0.0.1:8787/api/debug/events \
  -H "Content-Type: application/json" \
  -H "X-Bridge-Api-Key: change-me" \
  -d '{"command":"hole","authorName":"debug-user"}'
```

### 4. Behavior Pack → BDS

```bash
cp -R addon/behavior_packs/sabotage_behavior /path/to/bds/worlds/YourWorld/behavior_packs/
```

`world_behavior_packs.json` の `pack_id` を `manifest.json` と一致させる。  
手順: [docs/bds-setup.md](docs/bds-setup.md)

### 5. ゲーム内（管理者）

```txt
!sab start              # 平坦な場所で — フィールド生成
!sab start defend       # 防衛モード
!sab test hole          # ローカルテスト
!sab status
!sab reset              # 生成範囲を元の地形に戻す
```

管理者: `config.js` の `admin.playerNames` または `/tag @s add sab:admin`

---

## ゲームモード

| モード | 開始 | 勝利条件 |
|--------|------|----------|
| `fill_challenge` | `!sab start` | 90% 到達で**即勝利** |
| `fill_and_defend` | `!sab start defend` | **10 分終了時**に 90 個以上キープ |

---

## コマンド早見

### 視聴者（YouTube / Twitch / debug）

| コマンド | 効果 |
|----------|------|
| `!slow` | 鈍足 10 秒 |
| `!blind` | 暗闇 8 秒 |
| `!chicken` | ニワトリ 5 匹 |
| `!hole` | 羊毛 3 個削除（床に戻す） |
| `!block` | 羊毛 +16（応援） |

### 管理者（`!sab`）

```txt
!sab start | start defend | mode [id]
!sab stop | pause | resume | status | clear | reset
!sab test slow | blind | chicken | hole | block
```

将来: 名前付きアイテム `SAB:menu`, `SAB:start`, … — [docs/game-design.md](docs/game-design.md)

---

## Bridge API（概要）

| Method | Path | 用途 |
|--------|------|------|
| GET | `/health` | ヘルスチェック |
| GET | `/api/minecraft/events` | Addon ポーリング |
| POST | `/api/minecraft/events/ack` | 処理済み ACK |
| POST | `/api/debug/events` | 開発用イベント投入 |
| GET | `/api/admin/status` | 状態確認 |

認証: ヘッダー `X-Bridge-Api-Key`

---

## 開発

```bash
npm run bridge:build          # TypeScript コンパイル
npm run sync:project-docs     # docs/project-sync.md 更新
npm run sync:project-docs:check  # CI 用
```

作業前に [docs/project-sync.md](docs/project-sync.md) を読むこと（[AGENTS.md](AGENTS.md) 参照）。

GitHub 運用: [`~/app/AGENTS.md`](/Users/ebata/app/AGENTS.md)（`hakonikomoru` のみ push）

---

## トラブルシュート

| 症状 | 確認 |
|------|------|
| `Bridge poll failed` | `apiKey` / `baseUrl` / Bridge 起動 |
| フィールドが出ない | 管理権限 / 平坦な場所 / 上書き不可ブロック |
| debug が 404 | `NODE_ENV=production` になっていないか |
| イベントが発動しない | `!sab start` 済みか / `running` 状態か |
| reset 後にブロック残存 | 古いセッション — 再度 `!sab reset` |

詳細: [docs/bds-setup.md](docs/bds-setup.md)

---

## ドキュメント一覧

| ファイル | 内容 |
|----------|------|
| [docs/project-sync.md](docs/project-sync.md) | 構成・API・実装状況（AI 向け正） |
| [docs/bds-setup.md](docs/bds-setup.md) | BDS 導入・配信前チェック |
| [docs/youtube-api-setup.md](docs/youtube-api-setup.md) | YouTube API（MVP 後） |
| [docs/twitch-api-setup.md](docs/twitch-api-setup.md) | Twitch EventSub（将来） |
| [docs/research-java-oss.md](docs/research-java-oss.md) | Java OSS 参考調査 |
| [docs/safety-policy.md](docs/safety-policy.md) | 安全・クールダウン |

---

## ライセンス / 制作

**komolab - こもらぼ -**

Java 版 OSS は設計参考のみ。コードの直接移植は行いません。
