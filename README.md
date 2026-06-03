# sabotage-minecraft

YouTube / Twitch ライブ連動の Minecraft **Bedrock Dedicated Server** 向け妨害ミニゲーム。

**制作:** komolab - こもらぼ -

| 用途 | ドキュメント |
|------|-------------|
| 配信企画・世界観 | [docs/worldview.md](docs/worldview.md) |
| 配布・紹介文 | [docs/addon-description.md](docs/addon-description.md) |
| ゲーム仕様 | [docs/game-design.md](docs/game-design.md) |

---

## MVP のゴール（YouTube なしで動く）

1. Bridge Server 起動
2. `POST /api/debug/events` でイベント投入
3. Minecraft が Bridge からポーリング
4. `!hole` / `!block` / `!slow` / `!blind` / `!chicken` が発動

YouTube / Twitch 連携は **debug 動作確認の後** に設定する。

---

## 前提

| 対応 | 非対応 |
|------|--------|
| Bedrock Dedicated Server (BDS) | Realms |
| ローカル / VPS 上の BDS | 通常クライアント単体ホスト |
| `!sab start` 実行位置を基準にフィールド生成 | 固定座標前提 |

**MVP に入れない:** locate 自動実行 / 構造物座標自動取得 / 自動 TP 前提の進行

---

## 構成

```txt
視聴者アクション (YouTube / Twitch / debug)
    ↓
Bridge Server (Node.js / TypeScript)
    ↓
SabotageEvent
    ↓
Behavior Pack (Script API)
```

---

## クイックスタート

### 1. Bridge `.env`

```bash
cd bridge
cp .env.example .env   # 未作成の場合
npm install
```

リポジトリ clone 直後は **`bridge/.env` を手元で用意**する（`.gitignore` のため Git には含まれない）。

ローカル開発の初期値:

```env
PORT=8787
NODE_ENV=development
BRIDGE_API_KEY=change-me

ENABLE_YOUTUBE=false
ENABLE_TWITCH=false
ENABLE_YOUTUBE_CHAT=false
ENABLE_SUPER_CHAT_EVENTS=false
ENABLE_MEMBER_EVENTS=false
ENABLE_STRONG_EFFECTS=false
```

| 変数 | ローカル初期値 | 備考 |
|------|----------------|------|
| `BRIDGE_API_KEY` | `change-me` | Addon `config.js` の `bridge.apiKey` と **同一**にする |
| `ENABLE_YOUTUBE` | `false` | debug 動作確認後に `true` |
| `ENABLE_YOUTUBE_CHAT` | `false` | OAuth 設定後に `true` |
| `ENABLE_TWITCH` | `false` | MVP 後 |

本番では `BRIDGE_API_KEY` を推測困難な値に変更すること。

### 2. Bridge 起動

```bash
npm run dev
```

### 3. debug イベント投入

```bash
curl -X POST http://127.0.0.1:8787/api/debug/events \
  -H "Content-Type: application/json" \
  -H "X-Bridge-Api-Key: change-me" \
  -d '{"command":"hole","authorName":"debug-user"}'
```

### 4. Behavior Pack を BDS に配置

`addon/behavior_packs/sabotage_behavior` → BDS ワールドの `behavior_packs/`

詳細: [docs/bds-setup.md](docs/bds-setup.md)

### 5. ゲーム内（管理者）

```txt
!sab start              # 立っている位置を基準にフィールド生成
!sab start defend       # 防衛モードで開始
!sab status
!sab test hole
!sab reset              # 生成範囲を元の地形に戻す
```

`scripts/config.js` の `bridge.apiKey` を Bridge の `BRIDGE_API_KEY` と一致させる。

---

## ゲームモード

| モード | 開始 | 勝利条件 |
|--------|------|----------|
| `fill_challenge` | `!sab start` | 90% 到達で即勝利 |
| `fill_and_defend` | `!sab start defend` | 10 分終了時に 90 個以上キープ |

---

## 視聴者コマンド（MVP）

| コマンド | 効果 |
|----------|------|
| `!slow` | 鈍足 10 秒 |
| `!blind` | 暗闇 8 秒 |
| `!chicken` | ニワトリ 5 匹 |
| `!hole` | 設置済み羊毛を最大 3 個削除 |
| `!block` | 白色の羊毛 +16（応援） |

---

## 管理コマンド（`!sab`）

```txt
!sab start | start defend | mode | stop | pause | resume
!sab status | clear | reset | test <command>
```

将来の名前付きアイテム操作案: `SAB:menu`, `SAB:start`, … — [docs/game-design.md](docs/game-design.md)

---

## ドキュメント

- [docs/bds-setup.md](docs/bds-setup.md) — BDS 導入・配信前チェック
- [docs/youtube-api-setup.md](docs/youtube-api-setup.md) — YouTube API（MVP 後）
- [docs/twitch-api-setup.md](docs/twitch-api-setup.md) — Twitch EventSub（将来）
- [docs/research-java-oss.md](docs/research-java-oss.md) — Java OSS 参考調査
- [docs/safety-policy.md](docs/safety-policy.md)
- [docs/project-sync.md](docs/project-sync.md)

---

## 開発

```bash
cd bridge && npm run build
npm run sync:project-docs   # ルートから project-sync 更新
```

GitHub 運用は [`~/app/AGENTS.md`](/Users/ebata/app/AGENTS.md) に従う。
