# 安全ポリシー — 妨害マイクラ

## スパチャ連動方針（MVP 後）

- 購入型アイテムではなく**配信演出トリガー**
- 景品・返礼品・勝利保証をしない
- 金額に応じた勝利確定効果は禁止
- ランダムルーレット + 演出差

MVP では `ENABLE_SUPER_CHAT_EVENTS=false`

## 禁止イベント

- 即死 / 全ロスト
- TNT / クリーパー / ワールド破壊（MVP 未実装）
- フィールド外のブロック変更
- 外枠（黄色コンクリート）の破壊
- 高額スパチャによる勝利確定

## 強妨害

`ENABLE_STRONG_EFFECTS=false`（Bridge / Addon 両方）

将来コマンド `!zombie` `!creeper` `!tnt` 等は初期 OFF。

## 緊急停止

- `!sab stop` — 手動終了
- `!sab clear` — キュー全削除
- `!sab reset` — 状態初期化

## クールタイム（Bridge 側）

| 種別 | 間隔 |
|------|------|
| 同一ユーザー | 30 秒 |
| `!slow` / `!blind` | 10 秒 |
| `!chicken` / `!hole` | 15 秒 |
| `!block` | 20 秒 |

## 荒らし対策

- 100 文字以上の長文は無視
- messageId 重複除外
- NG ワード（URL 等）除外
- キュー最大 50（満杯時は破棄 + `[WARN] queue full`）

## セキュリティ

- YouTube OAuth は Bridge のみ
- `X-Bridge-Api-Key` ヘッダー必須
- ログにトークンを出さない
- `.env` は git 管理外
- `POST /api/debug/events` は development のみ

## フィールド安全

`!hole` はフィールド内の白色羊毛のみ対象。外枠・フィールド外は変更しない。

## インシデント時

1. `!sab stop`
2. `!sab clear`
3. Bridge 再起動
4. 必要なら BDS 再起動
