# Bedrock Dedicated Server セットアップ

**制作:** komolab - こもらぼ -

## 前提

- Minecraft Bedrock Dedicated Server 1.21+
- Script API 有効
- `@minecraft/server-net`（BDS 専用）
- **固定座標不要** — 平坦な場所で `!sab start` する

| 対応 | 非対応 |
|------|--------|
| ローカル BDS | Realms |
| VPS 上の BDS | 通常クライアント単体ホスト |

---

## Behavior Pack 配置

```bash
cp -R addon/behavior_packs/sabotage_behavior /path/to/bds/worlds/YourWorld/behavior_packs/
```

## world_behavior_packs.json

```json
[
  {
    "pack_id": "c7d8e9f0-a1b2-4c3d-9e0f-1a2b3c4d5e6f",
    "version": [0, 2, 0]
  }
]
```

`pack_id` は `manifest.json` の header UUID と一致させます。

---

## Bridge 接続設定

### Bridge `.env`（ローカル）

```bash
cd bridge
cp .env.example .env   # 初回のみ（`.env` は Git 管理外）
```

**パス:** `sabotage-minecraft/bridge/.env`

ローカル開発の初期値（MVP = debug のみ）:

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

YouTube / Twitch の Client ID 等は **空のまま**で OK。設定手順:

- YouTube: [youtube-api-setup.md](./youtube-api-setup.md)
- Twitch: [twitch-api-setup.md](./twitch-api-setup.md)

### Addon `scripts/config.js`

```javascript
bridge: {
  baseUrl: "http://127.0.0.1:8787",
  apiKey: "change-me",   // ← bridge/.env の BRIDGE_API_KEY と一致
},
```

BDS と Bridge が別マシンの場合は `baseUrl` を変更。

---

## 起動確認（MVP 優先順）

### 1. Bridge 起動

```bash
cd bridge && npm install && npm run dev
```

### 2. BDS 起動・ワールド参加

ログ: `[SAB] sabotage-minecraft addon loaded`

### 3. フィールド生成

平坦な場所で:

```txt
!sab start
```

12×12（黄枠 + 黒床）が **立っている位置を基準** に生成される。

上書きできないブロックがある場合は生成中止 + チャットで理由表示。

### 4. debug イベント

```bash
curl -X POST http://127.0.0.1:8787/api/debug/events \
  -H "Content-Type: application/json" \
  -H "X-Bridge-Api-Key: change-me" \
  -d '{"command":"blind","authorName":"debug"}'
```

### 5. ゲーム内テスト

```txt
!sab test hole
!sab test block
!sab status
!sab reset    # 生成範囲を元の地形に戻す
```

---

## 管理コマンド一覧

| コマンド | 権限 | 説明 |
|----------|------|------|
| `!sab start` | 管理者 | 通常モード開始 + フィールド生成 |
| `!sab start defend` | 管理者 | 防衛モードで開始 |
| `!sab mode [id]` | 管理者 | モード表示 / 切替 |
| `!sab stop` | 管理者 | 手動終了 |
| `!sab pause` | 管理者 | 一時停止（イベント停止） |
| `!sab resume` | 管理者 | 再開 |
| `!sab status` | 全員 | 状態・進捗表示 |
| `!sab clear` | 管理者 | イベントキュークリア |
| `!sab reset` | 管理者 | フィールド復元 + 状態リセット |
| `!sab test <cmd>` | 管理者 | slow/blind/chicken/hole/block テスト |

将来: 名前付きアイテム `SAB:start` 等 — [game-design.md](./game-design.md)

---

## 配信前チェックリスト

詳細な5段階手順（配信前〜終了後）: **[stream-runbook.md](./stream-runbook.md)**

```txt
[x] BDS + Behavior Pack 読み込み確認
[x] Bridge 起動（YouTube Live Chat 連携済み）
[x] bridge.apiKey と BRIDGE_API_KEY が一致
[ ] 平坦な開始位置を決めた（本番直前）
[x] /scriptevent sab:command start → フィールド生成 OK
[x] YouTube で !hole / !block 発動確認
[x] /scriptevent sab:command reset でフィールドが片付く
[x] ENABLE_STRONG_EFFECTS=false を確認
[ ] 配信開始前に /scriptevent sab:command clear でキュー空
```

YouTube API 設定: [youtube-api-setup.md](./youtube-api-setup.md)

---

## 管理権限

- `CONFIG.admin.playerNames` にプレイヤー名を追加
- または `/tag <player> add sab:admin`

---

## トラブルシュート

| 症状 | 確認 |
|------|------|
| Bridge poll failed | apiKey / baseUrl / ファイアウォール |
| フィールド未生成 | 管理権限 / 上書き不可ブロックがないか |
| 「生成範囲に上書きできないブロック」 | 別の平坦な場所で `!sab start` |
| server-net エラー | BDS 以外では不可 |
| イベント未発動 | `!sab start` 済みか / キュー状態 |
| reset 後にブロックが残る | 古いセッション — 再度 `!sab reset` |

---

## 非対応

- Realms
- 通常クライアント単体ホスト
- locate / 自動 TP / 固定座標マップ前提
