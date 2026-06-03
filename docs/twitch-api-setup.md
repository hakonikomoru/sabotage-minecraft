# Twitch API / EventSub セットアップ（将来対応）

> **MVP では未実装。** Bridge の型・ディレクトリのみ準備済み。
> **YouTube debug 連携が動いてから** 設定を始める。
> 実装順: debug → YouTube コメント → YouTube Super Chat → **Twitch EventSub**

---

## 手元で必要なもの（将来）

| 項目 | 用途 |
|------|------|
| Twitch Developer App | API 利用 |
| Client ID / Client Secret | OAuth |
| Access Token / Refresh Token | Bridge 認証 |
| Broadcaster User ID | 配信者チャンネル |
| Moderator User ID | チャット読取（EventSub） |
| EventSub 設定 | WebSocket / Webhook |

---

## 概要

[Twitch EventSub](https://dev.twitch.tv/docs/eventsub/) でチャット・チャンネルポイント・Cheer・Subscribe・Follow 等を受信。

```txt
Twitch EventSub
    ↓
bridge/src/platforms/twitch/
    ↓
NormalizedStreamEvent → SabotageEvent
    ↓
Minecraft Addon（変更不要）
```

---

## 1. Twitch Developer Console

1. [Twitch Developer Console](https://dev.twitch.tv/console) でアプリケーション作成
2. **Client ID** / **Client Secret** を取得
3. OAuth Redirect URL を設定

---

## 2. 必要 Scope（参考）

| 用途 | Scope 例 |
|------|----------|
| チャット読取 | `chat:read` |
| チャンネルポイント | `channel:read:redemptions` |
| EventSub 購読 | 公式ドキュメント参照 |

---

## 3. `.env` 設定

```env
ENABLE_TWITCH=true
ENABLE_TWITCH_CHAT=true
ENABLE_CHANNEL_POINT_EVENTS=true
ENABLE_CHEER_EVENTS=true
ENABLE_SUBSCRIBE_EVENTS=true
ENABLE_FOLLOW_EVENTS=true

TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
TWITCH_BROADCASTER_USER_ID=
TWITCH_MODERATOR_USER_ID=
TWITCH_ACCESS_TOKEN=
TWITCH_REFRESH_TOKEN=
TWITCH_EVENTSUB_TRANSPORT=websocket
```

MVP ではすべて `false`（`.env.example` 参照）。

---

## 4. EventSub 購読候補

| Subscription | 用途 |
|--------------|------|
| `channel.chat.message` | `!slow` 等 |
| `channel.channel_points_custom_reward_redemption.add` | チャンネルポイント |
| `channel.cheer` | Bits → 演出ルーレット |
| `channel.subscribe` / `channel.subscription.gift` | 特別演出 |
| `channel.follow` | 軽演出 |

実装: `bridge/src/platforms/twitch/twitchClient.ts`（スタブ）

---

## 5. チャンネルポイント報酬マッピング

`bridge/src/platforms/twitch/twitchRewardMap.ts` — `rewardId` 優先、なければ `rewardTitle`。

---

## 6. Cheer / Bits 方針

YouTube Super Chat 相当。**演出ルーレットのみ** — 高額 Bits で即死・TNT 購入は不可。

---

## 7. YouTube との対応表

| 配信 | 視聴者アクション | Minecraft |
|------|------------------|-----------|
| YouTube | 通常コメント | 通常コマンド |
| YouTube | Super Chat | ルーレット（将来） |
| Twitch | チャット | 通常コマンド |
| Twitch | Channel Points | 指定イベント |
| Twitch | Cheer | ルーレット |
| Twitch | Subscribe / Gift Sub | 特別演出 |
| Twitch | Follow | 軽演出 |

---

## 参考

- [EventSub 概要](https://dev.twitch.tv/docs/eventsub/)
- [EventSub Reference](https://dev.twitch.tv/docs/eventsub/eventsub-reference/)
- [research-java-oss.md](./research-java-oss.md)
- [youtube-api-setup.md](./youtube-api-setup.md)
