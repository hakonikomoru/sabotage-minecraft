# YouTube API セットアップ

Bridge Server が YouTube ライブチャットを取得するための設定手順。

> **前提:** Windows ローカルで `debug POST → Minecraft 妨害発動` の E2E が完了していること。
> 以下は **Mac または Windows** 上で Bridge を動かし、YouTube Live Chat を接続する手順です。

---

## ゴール

```txt
YouTube Live Chat (!slow / !hole / !block …)
  → Bridge (NormalizedStreamEvent → SabotageEvent)
  → Minecraft Addon ポーリング
  → ゲーム内効果発動
```

---

## 必要なもの

| 項目 | 用途 |
|------|------|
| Google Cloud Project | API 利用 |
| YouTube Data API v3 有効化 | ライブチャット取得 |
| OAuth Client ID / Secret | Bridge 認証 |
| Refresh Token | 自動更新（初回 OAuth で取得） |
| 配信ごとの Video ID | `activeLiveChatId` 解決 |
| YouTube チャンネル ID | 任意（将来用） |

---

## 1. Google Cloud 設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. **API とサービス > ライブラリ** で **YouTube Data API v3** を有効化
3. **OAuth 同意画面** を設定
   - ユーザータイプ: **外部**
   - テストユーザーに **配信に使う Google アカウント** を追加
4. **認証情報 > OAuth クライアント ID** を作成
   - 種類: **ウェブアプリケーション**
5. **承認済みのリダイレクト URI** に **両方** 登録（ブラウザの開き方でどちらか使うため）

```txt
http://localhost:8787/auth/youtube/callback
http://127.0.0.1:8787/auth/youtube/callback
```

6. 発行された **クライアント ID** と **クライアント シークレット** を控える

---

## 2. Bridge `.env` 設定

`bridge/.env.example` をコピーして `bridge/.env` を作成（または更新）。

```env
PORT=8787
NODE_ENV=development
BRIDGE_API_KEY=change-me

ENABLE_YOUTUBE=true
ENABLE_YOUTUBE_CHAT=true

YOUTUBE_CLIENT_ID=your-client-id
YOUTUBE_CLIENT_SECRET=your-client-secret
YOUTUBE_REDIRECT_URI=http://localhost:8787/auth/youtube/callback
YOUTUBE_REFRESH_TOKEN=
YOUTUBE_CHANNEL_ID=
YOUTUBE_LIVE_VIDEO_ID=

ENABLE_TWITCH=false
ENABLE_SUPER_CHAT_EVENTS=false
ENABLE_MEMBER_EVENTS=false
ENABLE_STRONG_EFFECTS=false
```

**重要:** 次の **両方** が `true` であること。

```txt
ENABLE_YOUTUBE=true
ENABLE_YOUTUBE_CHAT=true
```

Addon 側 `addon/behavior_packs/sabotage_behavior/scripts/config.js` の `bridge.apiKey` も `change-me`（または `.env` の `BRIDGE_API_KEY`）と一致させる。

BDS にコピーした Pack も同じ `config.js` であることを確認する。

---

## 3. Refresh Token 取得（初回 OAuth）

`YOUTUBE_REFRESH_TOKEN` が空でも OAuth 開始は可能（Client ID / Secret のみ必要）。

```bash
cd bridge
npm install   # 初回のみ
npm run dev
```

ブラウザで開く（どちらでも可）:

```txt
http://127.0.0.1:8787/auth/youtube
http://localhost:8787/auth/youtube
```

Google 認証後、コールバック JSON の `refreshToken` を `bridge/.env` の `YOUTUBE_REFRESH_TOKEN` に保存し、Bridge を再起動。

**開発環境 (`NODE_ENV=development`) のみ** レスポンスに `refreshToken` を含める。本番では返さない。

### OAuth エラー時の確認

```txt
- GCP のリダイレクト URI に localhost と 127.0.0.1 の両方があるか
- bridge/.env の YOUTUBE_REDIRECT_URI が GCP と一致しているか
- OAuth 同意画面のテストユーザーに自分のアカウントが入っているか
- YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET が正しいか
```

---

## 4. `YOUTUBE_LIVE_VIDEO_ID` の設定

1. YouTube で **テスト配信（または本番配信）をライブ開始**
2. 配信 URL から Video ID を取得

```txt
https://www.youtube.com/watch?v=XXXXXXXXXXX
                              ^^^^^^^^^^^
                              これが YOUTUBE_LIVE_VIDEO_ID
```

3. `bridge/.env` に設定して Bridge を再起動

Bridge は `videos.list` で `activeLiveChatId` を自動解決する。

### 期待ログ

```txt
[OK] YouTube live chat connected: <liveChatId>
```

ライブ開始前・終了後に `activeLiveChatId` が取れない場合、Bridge 全体は落ちず **debug platform のみ継続** する（`ENABLE_YOUTUBE=true` でもチャット接続失敗は警告ログのみ）。

---

## 5. YouTube コメント → イベント確認

ライブチャットで以下を投稿:

```txt
!slow
!blind
!chicken
!hole
!block
```

### 期待ログ（Bridge）

```txt
[INFO] Received command: !hole from <name> (youtube/normalChat)
[OK] Event queued: hole by <name>
```

クールダウンで無視された場合:

```txt
[INFO] Ignored command due to cooldown: !hole from <name>
```

---

## 6. Minecraft 連携確認

Bridge + BDS を起動し、ゲーム内で:

```txt
/scriptevent sab:command start
```

その後ライブチャットで `!block` / `!hole` 等を投稿。

### 期待ログ（Bridge）

```txt
[OK] Event queued: block by <name>
[INFO] Minecraft polled events: 1
[INFO] Minecraft acked events: 1
```

### 期待ログ（BDS）

```txt
[SAB] Bridge connected
[SAB] Received events: 1
[SAB] Queue event from bridge: block
[SAB] Processing queued event: block
[SAB][BROADCAST] Effect executed: block
[SAB] Acked events: 1
```

---

## 7. 推奨手順（安全な順番）

```txt
1. Google Cloud で OAuth Client ID を作成
2. bridge/.env に CLIENT_ID / SECRET を入れる
3. ENABLE_YOUTUBE=true / ENABLE_YOUTUBE_CHAT=true
4. Bridge 起動 (npm run dev)
5. /auth/youtube で Refresh Token 取得 → .env に保存 → 再起動
6. テスト用ライブを開始
7. YOUTUBE_LIVE_VIDEO_ID を設定 → Bridge 再起動
8. ライブチャットで !block を確認
9. BDS 起動 → /scriptevent sab:command start → ゲーム内発動確認
```

---

## 8. トラブルシュート

### Bridge で YouTube が起動しない

```txt
- YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN
- YOUTUBE_LIVE_VIDEO_ID（配信がライブ中か）
- ENABLE_YOUTUBE=true かつ ENABLE_YOUTUBE_CHAT=true
```

### コメントは取れるが Minecraft で発動しない

```txt
- /scriptevent sab:command start 済みか
- Addon config.js の bridge.baseUrl (http://127.0.0.1:8787)
- Addon config.js の bridge.apiKey = BRIDGE_API_KEY
- BDS 側 Pack の config.js が最新か（手動コピー）
- GET /api/minecraft/events / POST ack がログに出るか
```

### `EADDRINUSE :8787`

前の Bridge プロセスが残っている。`npm run dev:local:stop` または該当 PID を終了。

### API クォータ超過（quota exceeded） {#quota}

YouTube Live Chat に **Webhook はない**ため、公式 API のポーリングが必須。無料枠は **1日 10,000 ユニット**、`liveChatMessages.list` は **1回 5 ユニット**（約 **2,000 回/日**）。

| ポール間隔 | 10分ゲーム | 2時間配信 | 24時間常時 |
|-----------|-----------|----------|-----------|
| 5秒 | 600U | 7,200U | ❌ 約2.8時間で枯渇 |
| 15秒（推奨） | 200U | 2,400U | ❌ 約8時間で枯渇 |
| 43秒+ | 70U | 840U | ✅ 24hギリ可 |

**本リポジトリの対策（実装済み）:**

1. **`YOUTUBE_POLL_ONLY_WHEN_GAME_RUNNING=true`（デフォルト）**  
   Minecraft が `running` / `paused` の間だけ API を叩く。  
   Bridge 起動〜`/scriptevent sab:command start` 前は **API ゼロ**。

2. **`YOUTUBE_MIN_POLL_INTERVAL_MS=15000`**  
   ポール間隔の下限 15 秒（API の `pollingIntervalMillis` より長い方を採用）。

3. **クォータ超過時**  
   5分〜最大1時間バックオフ。ERROR 連打を停止。

**10分チャレンジ配信（本企画）の目安:** ゲーム中 15 秒間隔 ≒ **200 ユニット/回** → 1日 50 回以上余裕。

**すぐの対処（クォータ枯渇時）:**

```env
ENABLE_YOUTUBE_CHAT=false
```

Bridge 再起動 → テストは `POST /api/debug/events`。クォータは **太平洋時間 0:00** 頃リセット。

**本番・長時間配信:**

- [Google Cloud Console](https://console.cloud.google.com/) → YouTube Data API v3 → **クォータの引き上げ** を申請（配信アプリとして審査あり。数千〜数万ユニット/日まで通る例あり）
- 申請用 PDF 一式: [youtube-quota-application/](./youtube-quota-application/)（01〜07 を番号順に添付）
- 開発中は `ENABLE_YOUTUBE_CHAT=false` + debug 投入を徹底

**`bridge/.env` 推奨:**

```env
YOUTUBE_MIN_POLL_INTERVAL_MS=15000
YOUTUBE_POLL_ONLY_WHEN_GAME_RUNNING=true
YOUTUBE_IDLE_CHECK_INTERVAL_MS=30000
YOUTUBE_QUOTA_BACKOFF_MS=300000
```

`/health` で `sabGameActive` / `youtubeQuotaLimited` を確認できる。

---

## 9. 取得イベント種別（MVP 範囲）

| 種別 | MVP | 備考 |
|------|-----|------|
| 通常コメント | 対応 | `!command` 解析 |
| Super Chat | 無効 | `ENABLE_SUPER_CHAT_EVENTS=false` |
| Super Sticker | 無効 | 同上 |
| メンバー milestone | 無効 | `ENABLE_MEMBER_EVENTS=false` |

チャンネルメンバーが通常コメントで `!hole` を送る場合は **通常チャットとして処理** される。

---

## 10. 注意事項

- OAuth / Refresh Token は **Bridge のみ**（Addon には置かない）
- API クォータに注意（テスト配信で十分確認してから本番）
- Twitch 設定: [twitch-api-setup.md](./twitch-api-setup.md)

---

## 参考リンク

- [LiveChatMessages: list](https://developers.google.com/youtube/v3/live/docs/liveChatMessages/list)
- [YouTube Live Streaming API](https://developers.google.com/youtube/v3/live/docs)
