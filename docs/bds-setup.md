# Bedrock Dedicated Server セットアップ

## 前提

- Minecraft Bedrock Dedicated Server 1.21+
- Script API 有効
- `@minecraft/server-net`（BDS 専用）

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

## Bridge 接続設定

### Bridge `.env`

```env
PORT=8787
NODE_ENV=development
BRIDGE_API_KEY=your-api-key
```

### Addon `scripts/config.js`

```javascript
bridge: {
  baseUrl: "http://127.0.0.1:8787",
  apiKey: "your-api-key",
},
```

BDS と Bridge が別マシンの場合は `baseUrl` を変更。

## 起動確認

1. Bridge: `npm run bridge:dev`
2. BDS 起動・ワールド参加
3. ログ: `[SAB] sabotage-minecraft addon loaded`
4. チャット: `!sab start`
5. 10×10 フィールド（黄枠 + 黒床）が生成される
6. debug endpoint でイベント投入

```bash
curl -X POST http://127.0.0.1:8787/api/debug/events \
  -H "Content-Type: application/json" \
  -H "X-Bridge-Api-Key: change-me" \
  -d '{"command":"blind","authorName":"debug"}'
```

## 管理権限

- `CONFIG.admin.playerNames` にプレイヤー名を追加
- または `/tag <player> add sab:admin`

## トラブルシュート

| 症状 | 確認 |
|------|------|
| Bridge poll failed | apiKey / baseUrl / ファイアウォール |
| フィールド未生成 | `!sab start` / 管理権限 |
| server-net エラー | BDS 以外では不可 |
| イベント未発動 | `!sab start` 済みか / キュー状態 |

## 非対応

- Realms
- 通常クライアント単体ホスト
