# 初回配信 運用チェックリスト

**制作:** komolab - こもらぼ -

YouTube Live Chat → Bridge → BDS → Minecraft 内効果発動が **動作確認済み** の状態で、初回配信を安全に行うための手順書。

関連: [bds-setup.md](./bds-setup.md) / [youtube-api-setup.md](./youtube-api-setup.md) / [safety-policy.md](./safety-policy.md)

---

## MVP 達成状況（2026-06-05 時点）

```txt
[x] BDS + Behavior Pack 読み込み
[x] /scriptevent 手動操作
[x] Bridge debug endpoint → Minecraft
[x] YouTube OAuth + Refresh Token
[x] YouTube Live Chat 取得
[x] YouTube コメント連動（!block / !hole / !slow 等）
[x] Minecraft 内効果発動
```

主要ルート:

```txt
debug POST        → Bridge → Minecraft   OK
YouTube Live Chat → Bridge → Minecraft   OK
```

**Git にコミットしない:** `YOUTUBE_REFRESH_TOKEN` / `YOUTUBE_CLIENT_SECRET` / `bridge/.env`

---

## 視聴者向けコマンド（配信概要欄・固定コメント用）

```txt
!slow   … 配信者を鈍足にする（10秒）
!blind  … 配信者の視界を暗くする（10秒）
!chicken … ニワトリを召喚
!hole   … 白色羊毛を3個戻す（妨害）
!block  … 白色羊毛を16個追加（応援）
```

クールダウンあり（同一ユーザー 30 秒 + コマンド別 CD）。連投しても無視されることがあります。

---

## 1. 配信前（30〜60 分前）

```txt
[ ] bridge/.env 確認（ENABLE_YOUTUBE=true / ENABLE_YOUTUBE_CHAT=true）
[ ] YOUTUBE_REFRESH_TOKEN 設定済み
[ ] BRIDGE_API_KEY = Addon config.js の bridge.apiKey
[ ] ENABLE_STRONG_EFFECTS=false
[ ] ENABLE_SUPER_CHAT_EVENTS=false
[ ] ENABLE_MEMBER_EVENTS=false
[ ] BDS behavior_packs に最新 Addon をコピー済み
[ ] 平坦な開始位置を決めた
[ ] npm run dev:local または bridge:dev + BDS で起動テスト
[ ] /health → youtubeOAuthConfigured: true
[ ] ゲーム内 /scriptevent sab:command test block で単体テスト
[ ] /scriptevent sab:command reset で片付け確認
```

---

## 2. 配信開始直後

```txt
[ ] YouTube でライブ開始（限定公開でも可）
[ ] 配信 URL から YOUTUBE_LIVE_VIDEO_ID を bridge/.env に設定
[ ] Bridge 再起動
[ ] Bridge ログ: [OK] YouTube live chat connected: <liveChatId>
[ ] ライブチャットで !block を1回投稿 → Bridge で Event queued を確認
[ ] Minecraft に接続（127.0.0.1:19132）
[ ] BDS ログ: [SAB] Bridge connected
```

Video ID 例: `https://www.youtube.com/watch?v=XXXXXXXX` → `YOUTUBE_LIVE_VIDEO_ID=XXXXXXXX`

---

## 3. ゲーム開始

```txt
[ ] 平坦な場所で /scriptevent sab:command start
[ ] フィールド（12×12 黄枠）生成を確認
[ ] ライブチャットで !block → ゲーム内で羊毛追加を確認
[ ] ライブチャットで !hole → ゲーム内で羊毛減少を確認
[ ] /scriptevent sab:command status でタイマー・進捗を確認
[ ] OBS / 配信画面にコマンド一覧を表示（任意）
```

管理者コマンド（配信者のみ）:

```txt
/scriptevent sab:command pause    # イベント一時停止
/scriptevent sab:command resume   # 再開
/scriptevent sab:command clear    # キュー全削除
/scriptevent sab:command reset    # フィールド復元 + リセット
```

---

## 4. トラブル時

| 症状 | 対処 |
|------|------|
| YouTube コメントが Bridge に来ない | `YOUTUBE_LIVE_VIDEO_ID` / 配信ライブ中か / Bridge 再起動 |
| Bridge に来るが Minecraft で発動しない | `/scriptevent sab:command start` 済みか / BDS ログの Bridge connected |
| `EADDRINUSE :8787` | `npm run dev:local:stop` または該当プロセス終了 |
| 効果が連発しすぎる | 正常（CD 内は無視）。`clear` でキュー停止 |
| フィールド生成失敗 | 別の平坦な場所で start / 上書き不可ブロックを避ける |
| OAuth エラー | GCP リダイレクト URI / Refresh Token を再取得 |
| 荒らし・長文スパム | Bridge が自動無視（100 文字超・URL 等） |

緊急停止:

```txt
/scriptevent sab:command pause
/scriptevent sab:command clear
/scriptevent sab:command stop
```

---

## 5. 配信終了後

```txt
[ ] /scriptevent sab:command reset（地形復元）
[ ] npm run dev:local:stop（Bridge + BDS 停止）
[ ] 次回用: YOUTUBE_LIVE_VIDEO_ID を空にするか、次の配信 ID に差し替え
[ ] bridge/.env / ログにトークンを貼らない
```

---

## クールダウン・荒らし対策（初回配信前に確認）

| 項目 | 値 |
|------|-----|
| 同一ユーザー CD | 30 秒 |
| `!slow` / `!blind` | 10 秒 |
| `!chicken` / `!hole` | 15 秒 |
| `!block` | 20 秒 |
| キュー最大 | 50 件 |
| 長文無視 | 100 文字以上 |
| 強妨害 | OFF（`ENABLE_STRONG_EFFECTS=false`） |

詳細: [safety-policy.md](./safety-policy.md)

---

## 起動コマンド早見

```powershell
# Windows 一括起動
npm run dev:local

# 終了
npm run dev:local:stop

# Bridge のみ
npm run bridge:dev
```

Minecraft 接続: `127.0.0.1:19132`
