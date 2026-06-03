# YouTube API セットアップ

Bridge Server が YouTube ライブチャットを取得するための設定手順。

## 必要なもの

- Google Cloud プロジェクト
- YouTube Data API v3 有効化
- OAuth 2.0 クライアント ID / Secret
- Refresh Token
- 配信中の `liveVideoId`（または `liveChatId`）

## 1. Google Cloud 設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. **API とサービス > ライブラリ** で **YouTube Data API v3** を有効化
3. **OAuth 同意画面** を設定（外部 / テストユーザーに自分を追加）
4. **認証情報 > OAuth クライアント ID** を作成（種類: ウェブアプリケーション）
5. リダイレクト URI: `http://localhost:8787/auth/youtube/callback`

## 2. Bridge `.env` 設定

```env
YOUTUBE_CLIENT_ID=your-client-id
YOUTUBE_CLIENT_SECRET=your-client-secret
YOUTUBE_REDIRECT_URI=http://localhost:8787/auth/youtube/callback
YOUTUBE_REFRESH_TOKEN=
YOUTUBE_LIVE_VIDEO_ID=your-live-video-id
BRIDGE_MODE=youtube
```

## 3. Refresh Token 取得

Bridge を起動後、ブラウザで:

```txt
http://127.0.0.1:8787/auth/youtube
```

Google 認証後、コールバックレスポンスの `refreshToken` を `.env` の `YOUTUBE_REFRESH_TOKEN` に保存します。

**本番では refresh token をログや API レスポンスに出さないでください。** 開発時のみコールバックで受け取ります。

## 4. liveChatId の解決

Bridge は `YOUTUBE_LIVE_VIDEO_ID` から `videos.list` で `activeLiveChatId` を自動取得します。

配信開始後に ID を設定し、Bridge を再起動してください。

## 5. チャット取得方式

継続的な取得には `liveChatMessages.list` をポーリングします（API の `pollingIntervalMillis` に従う）。

公式ドキュメントでは高頻度ポーリング用途に `streamList` も言及されています。MVP では `list` ポーリングで実装しています。

## 6. 取得イベント種別

| 種別 | MVP | 備考 |
|------|-----|------|
| 通常コメント | 対応 | `!command` 解析 |
| Super Chat | 将来 | `superChatDetails` |
| Super Sticker | 将来 | `superStickerDetails` |
| メンバー | 将来 | `isChatSponsor` 等 |

## 7. 注意事項

- OAuth 情報は **Bridge Server のみ** に保持（Minecraft Addon には置かない）
- メンバー情報の第三者共有は YouTube 利用規約に従う
- API クォータに注意（ライブチャットポーリングは units を消費）

## 参考リンク

- [LiveChatMessages: list](https://developers.google.com/youtube/v3/live/docs/liveChatMessages/list)
- [LiveChatMessages: streamList](https://developers.google.com/youtube/v3/live/docs/liveChatMessages/streamList)
- [YouTube Live Streaming API](https://developers.google.com/youtube/v3/live/docs)
