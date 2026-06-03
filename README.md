# sabotage-minecraft（妨害マイクラ）

YouTube ライブチャット連動の Minecraft Bedrock Dedicated Server 向けミニゲーム。

**配信企画名:** コメントで世界が壊れる妨害マイクラ

## ゲームモード

| モード | 開始 | 勝利条件 |
|--------|------|----------|
| `fill_challenge` | `!sab start` | 90% 到達で即勝利 |
| `fill_and_defend` | `!sab start defend` | 10 分終了時に 90 個以上キープ |

視聴者は YouTube コメントで妨害・応援。

## 前提

| 対応 | 非対応 |
|------|--------|
| Bedrock Dedicated Server (BDS) | Realms |
| ローカル / VPS 上の BDS | 通常クライアント単体 |

## 構成

```txt
視聴者コメント → Bridge Server → Behavior Pack → ゲーム内イベント
```

## クイックスタート

### 1. Bridge Server

```bash
cd bridge
cp .env.example .env
npm install
npm run dev
```

### 2. 手動イベント投入（開発環境）

```bash
curl -X POST http://127.0.0.1:8787/api/debug/events \
  -H "Content-Type: application/json" \
  -H "X-Bridge-Api-Key: change-me" \
  -d '{"command":"hole","authorName":"debug-user"}'
```

### 3. Behavior Pack 配置

`addon/behavior_packs/sabotage_behavior` を BDS ワールドに配置。

詳細: [docs/bds-setup.md](docs/bds-setup.md)

### 4. ゲーム内

```txt
!sab mode fill_and_defend   # モード切替
!sab start defend         # 防衛モードで開始
!sab start                # 通常モードで開始
!sab status
!sab test hole
!sab reset
```

`scripts/config.js` の `bridge.apiKey` を Bridge の `BRIDGE_API_KEY` と一致させてください。

## YouTube コマンド（MVP）

| コマンド | 効果 |
|----------|------|
| `!slow` | 鈍足 10 秒 |
| `!blind` | 暗闇 8 秒 |
| `!chicken` | ニワトリ 5 匹召喚 |
| `!hole` | 設置済み羊毛を最大 3 個削除 |
| `!block` | 白色の羊毛 +16（応援） |

## ドキュメント

- [docs/twitch-setup.md](docs/twitch-setup.md)
- [docs/research-java-oss.md](docs/research-java-oss.md)
- [docs/project-sync.md](docs/project-sync.md)
- [docs/game-design.md](docs/game-design.md)
- [docs/youtube-api-setup.md](docs/youtube-api-setup.md)
- [docs/bds-setup.md](docs/bds-setup.md)
- [docs/safety-policy.md](docs/safety-policy.md)
