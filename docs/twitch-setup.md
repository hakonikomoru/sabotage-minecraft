# Twitch EventSub セットアップ（将来対応）

> **MVP では未実装。** Bridge の型・ディレクトリのみ準備済み。
> 実装順: debug → YouTube コメント → YouTube Super Chat → **Twitch EventSub**

---

## 概要

Twitch では [EventSub](https://dev.twitch.tv/docs/eventsub/) により、チャット・チャンネルポイント・Cheer・Subscribe・Follow 等のイベントを Webhook / WebSocket / Conduits で受信できます。

sabotage-minecraft では **Bridge Server 側だけ** Twitch 対応を追加し、Minecraft Addon は共通 `SabotageEvent` のみ処理します。

```txt
Twitch EventSub
    ↓
bridge/src/platforms/twitch/
    ↓
NormalizedStreamEvent
    ↓
SabotageEvent
    ↓
Minecraft Addon（変更不要）
```

---

## 1. Twitch Developer Console

1. [Twitch Developer Console](https://dev.twitch.tv/console) でアプリケーション作成
2. **Client ID** / **Client Secret** を取得
3. OAuth Redirect URL を設定（ローカル開発用）

---

## 2. 必要 Scope（参考）

| 用途 | Scope 例 |
|------|----------|
| チャット読取 | `chat:read` |
| チャンネルポイント | `channel:read:redemptions` |
| EventSub 購読 | `user:read:email` 等（公式ドキュメント参照） |

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

MVP ではすべて `false` のまま。

---

## 4. EventSub 購読候補

| Subscription | 用途 |
|--------------|------|
| `channel.chat.message` | `!slow` 等のチャットコマンド |
| `channel.channel_points_custom_reward_redemption.add` | チャンネルポイント報酬 |
| `channel.cheer` | Bits → 演出ルーレット |
| `channel.subscribe` | サブスク特別演出 |
| `channel.subscription.gift` | ギフトサブ演出 |
| `channel.follow` | 軽演出（花火等） |

実装ファイル: `bridge/src/platforms/twitch/twitchClient.ts`（現状スタブ）

---

## 5. チャンネルポイント報酬マッピング

`bridge/src/platforms/twitch/twitchRewardMap.ts`:

```txt
報酬名：妨害：暗闇     → command: blind
報酬名：妨害：床を消す → command: hole
報酬名：応援：ブロック追加 → command: block
```

`rewardId` 優先、なければ `rewardTitle` で照合。

Twitch ダッシュボードで同名の Custom Reward を作成し、必要なら `rewardId` を map に追加。

---

## 6. Cheer / Bits 方針

Bits は YouTube Super Chat 相当。**演出ルーレット**として扱い、直接強妨害の購入にはしない。

| Bits | Tier |
|------|------|
| 〜499 | small |
| 500〜1999 | medium |
| 2000〜4999 | large |
| 5000+ | special |

実装: `bridge/src/platforms/twitch/cheerTier.ts`

---

## 7. Follow / Subscribe 効果（将来）

| Source | Command | 効果例 |
|--------|---------|--------|
| follow | `follow_firework` | タイトル + 花火 + ニワトリ1匹 |
| subscribe | `sub_support` | タイトル + 羊毛+32 |
| giftSub | `gift_sub_event` | タイトル + スピード5秒 |

いずれも MVP では `enabled: false`。

---

## 8. YouTube との対応表

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

## 参考リンク

- [EventSub 概要](https://dev.twitch.tv/docs/eventsub/)
- [EventSub Reference](https://dev.twitch.tv/docs/eventsub/eventsub-reference/)
- [research-java-oss.md](./research-java-oss.md)
