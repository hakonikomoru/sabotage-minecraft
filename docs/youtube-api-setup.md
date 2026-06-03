# YouTube API セットアップ

Bridge Server が YouTube ライブチャットを取得するための設定手順。

> **MVP の最初のゴールは YouTube なしで debug endpoint から動かすこと。**
> 以下の設定は **debug → BDS 連携が動いてから** 行ってください。

---

## 必要なもの（手元作業）

| 項目 | 用途 |
|------|------|
| Google Cloud Project | API 利用 |
| YouTube Data API v3 有効化 | ライブチャット取得 |
| OAuth Client ID / Secret | Bridge 認証 |
| Refresh Token | 自動更新 |
| YouTube チャンネル ID | 任意（将来） |
| 配信ごとの Video ID | `liveChatId` 解決 |

---

## 1. Google Cloud 設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. **API とサービス > ライブラリ** で **YouTube Data API v3** を有効化
3. **OAuth 同意画面** を設定（外部 / テストユーザーに自分を追加）
4. **認証情報 > OAuth クライアント ID** を作成（種類: ウェブアプリケーション）
5. リダイレクト URI: `http://localhost:8787/auth/youtube/callback`

---

## 2. Bridge `.env` 設定

```env
ENABLE_YOUTUBE=true
ENABLE_YOUTUBE_CHAT=true

YOUTUBE_CLIENT_ID=your-client-id
YOUTUBE_CLIENT_SECRET=your-client-secret
YOUTUBE_REDIRECT_URI=http://localhost:8787/auth/youtube/callback
YOUTUBE_REFRESH_TOKEN=
YOUTUBE_CHANNEL_ID=
YOUTUBE_LIVE_VIDEO_ID=your-live-video-id
```

最初の動作確認だけなら `ENABLE_YOUTUBE=false` のままで OK。

---

## 3. Refresh Token 取得

Bridge を起動後、ブラウザで:

```txt
http://127.0.0.1:8787/auth/youtube
```

Google 認証後、コールバックレスポンスの `refreshToken` を `.env` の `YOUTUBE_REFRESH_TOKEN` に保存。

**本番では refresh token をログや API レスポンスに出さない。** 開発時のみコールバックで受け取る。

---

## 4. liveChatId の解決

Bridge は `YOUTUBE_LIVE_VIDEO_ID` から `videos.list` で `activeLiveChatId` を自動取得。

配信開始後に ID を設定し、Bridge を再起動。

---

## 5. チャット取得方式

`liveChatMessages.list` をポーリング（API の `pollingIntervalMillis` に従う）。

---

## 6. 取得イベント種別

| 種別 | MVP | 備考 |
|------|-----|------|
| 通常コメント | 対応 | `!command` 解析 |
| Super Chat | 将来 | 演出ルーレット |
| Super Sticker | 将来 | 演出ルーレット |
| メンバー | 将来 | 特別演出 |

---

## 7. 注意事項

- OAuth 情報は **Bridge Server のみ**（Addon には置かない）
- API クォータに注意
- Twitch 設定: [twitch-api-setup.md](./twitch-api-setup.md)

---

## 参考リンク

- [LiveChatMessages: list](https://developers.google.com/youtube/v3/live/docs/liveChatMessages/list)
- [YouTube Live Streaming API](https://developers.google.com/youtube/v3/live/docs)
