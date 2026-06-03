# アドオン説明文（配布・紹介用）

**制作:** komolab - こもらぼ -

---

## 短い説明（1〜2 行）

YouTube / Twitch ライブの視聴者コメントで妨害・応援が飛び交う、Bedrock Dedicated Server 向け参加型ミニゲームアドオン。**立った場所にフィールドが出る**ので、どのワールドでも使えます。

---

## 配布サイト向け（中程度）

### コメントで世界が壊れる妨害マイクラ

視聴者が `!slow` `!blind` `!hole` などのコメントで配信者の 10 分ブロック埋めチャレンジを妨害・応援できる Behavior Pack です。

- **対応環境:** Minecraft Bedrock Dedicated Server（Script API）
- **連携:** 同梱 Bridge Server 経由で YouTube / Twitch（将来）と接続
- **配布向け:** 固定座標不要 — `!sab start` を実行した位置に 10×10 フィールドを生成
- **テスト:** YouTube なしでも debug API で動作確認可能

制作: **komolab - こもらぼ -**

---

## タグ・キーワード案

```txt
Minecraft, Bedrock, BDS, ライブ配信, YouTube, Twitch, 参加型, ミニゲーム,
視聴者参加, VTuber, 妨害, 羊毛, fill, 配信企画
```

---

## 注意書き（配布時）

- Realms / 通常の統合版ワールド単体では `@minecraft/server-net` が使えないため非対応
- Bridge Server の起動と API 設定が必要（YouTube 連携は任意）
- 危険効果はデフォルト OFF。配信ポリシーに合わせて設定してください

---

## 関連リンク

- 開発・導入: [../README.md](../README.md)
- 世界観: [worldview.md](./worldview.md)
- BDS セットアップ: [bds-setup.md](./bds-setup.md)
