# Java 版 OSS 調査メモ — sabotage-minecraft

> Java / Spigot / Paper 系 OSS を**仕様参考**として調査。コードの直接移植は行わない。
> 調査日: 2026-06-04

---

## 調査方針

| OK（参考にする） | NG（しない） |
|------------------|--------------|
| ゲーム性・効果カテゴリ | Java コードのコピー |
| クールタイム / キュー設計 | Bukkit API 前提の移植 |
| 安全制御の考え方 | ライセンス不明コードの転用 |
| Bridge / Plugin 分離 | 統合版で使えない API 前提 |

---

## 1. qixils/minecraft-crowdcontrol

| 項目 | 内容 |
|------|------|
| URL | https://github.com/qixils/minecraft-crowdcontrol |
| ライセンス | **MPL-2.0** |
| 概要 | Java 版 Crowd Control。Twitch / YouTube / TikTok / Discord 等から tips・bits・channel points・寄付でゲーム干渉 |

### 参考にできる点

- **配信プラットフォームを Crowd Control プロトコルで抽象化**（Minecraft 側は効果実装に集中）
- 効果の**カテゴリ分け**（移動・視界・Mob・インベントリ等）
- **サーバープラグイン / クライアント Mod** の二形態 — 今回の BDS addon + Bridge に相当
- 公式セットアップガイド（mccc.qixils.dev）による**安全な導入手順**

### そのまま使えない点

- Fabric / Bukkit 向け Java 実装
- Crowd Control 専用プロトコル（YouTube 公式 API とは別経路）
- 統合版 Script API 非対応

### sabotage-minecraft への反映

- Bridge で `StreamPlatform` / `StreamEvent` 抽象化
- 効果を `category` + `risk` + `enabled` で管理
- MVP は YouTube 公式 API のみ、将来 CC 相当の multi-platform adapter を Bridge に追加

---

## 2. jordanmruczynski/TikTok-Live-Connector

| 項目 | 内容 |
|------|------|
| URL | https://github.com/jordanmruczynski/TikTok-Live-Connector |
| ライセンス | **MIT** |
| 概要 | **Node.js Bot（Rest API）+ Spigot Plugin**。ギフト・コメント・いいね等を Minecraft へ |

### 参考にできる点

- **外部 Bot + Minecraft Plugin** — 今回の `bridge/` + `addon/` とほぼ同型
- `gifts.json`: ギフト ID → アクション ID / コンソールコマンドの**マッピング表**
- `settings.json`: Bot の host/port（OAuth は Minecraft 側に置かない）
- デフォルトアクション ID 1〜16（zombie / creeper / tnt / freeze 等）— **危険度分級**の参考
- Minecraft 側は HTTP ポーリングで Bot からイベント取得

### そのまま使えない点

- TikTok **非公式 API**（README に明記）— YouTube では公式 API に置換必須
- Spigot 1.19.2 専用 Java プラグイン
- kill player / tnt 等 — 配信安全ポリシー上 MVP では禁止

### sabotage-minecraft への反映

- Bridge の `POST /api/debug/events` ≒ 開発用 gift 注入
- ギフト → 効果マッピングは将来 `giftMap` として Bridge rules に追加
- 危険アクション（ID 5 creeper, 10 tnt, 12 kill）は `risk: "dangerous"`, `enabled: false`

---

## 3. TimeCodings/TikTokLIVEMC

| 項目 | 内容 |
|------|------|
| URL | https://github.com/TimeCodings/TikTokLIVEMC |
| ライセンス | **記載なし（GitHub licenseInfo: null）** — コードコピー禁止、仕様参考のみ |
| 概要 | TikFinity 連携 Spigot プラグイン。Donation → Minecraft アクション |

### 参考にできる点

- **Webhook 経由**で外部サービス（TikFinity）→ Minecraft を接続
- config.yml で gift-action（command / message / actionbar / teleport）
- **AntiSpam** — Bridge 側 cooldown + 重複除外と同等
- 対象プレイヤーリスト（selected players）— `mainPlayerName` 設計の参考

### そのまま使えない点

- TikFinity 専用 Socket / Webhook
- Spigot API
- BETA 品質・ライセンス不明

### sabotage-minecraft への反映

- Bridge `safety.ts` の NG ワード・長文・messageId  dedup
- 管理者 `/tiktoklive reload` ≒ Bridge 再起動 + config  hot reload（将来）

---

## 4. nglmercer/TikTokLiveSpigotMultiLIVE

| 項目 | 内容 |
|------|------|
| URL | https://github.com/nglmercer/TikTokLiveSpigotMultiLIVE |
| ライセンス | **記載なし** — 仕様参考のみ |
| 概要 | TikTok Live + Spigot。ギフトでクリーパー召喚等 |

### 参考にできる点

- **コメント / ギフト → 効果** の対応表設計
- 複数ライブ同時接続（MultiLIVE）— 将来の multi-stream 参考

### そのまま使えない点

- 非公式 TikTok 連携
- クリーパー召喚等の危険効果がデフォルト想定

### sabotage-minecraft への反映

- 効果 registry に `creeper` を `dangerous` / `enabled: false` で登録
- ギフト連動は第 2 段階以降

---

## 5. EshwarAnad/TwitchControlsMinecraft

| 項目 | 内容 |
|------|------|
| URL | https://github.com/EshwarAnad/TwitchControlsMinecraft |
| ライセンス | **記載なし** — 仕様参考のみ |
| 概要 | Twitch チャット**投票**でランダムイベント。投票ラウンド默认 60 秒 |

### 参考にできる点

- **即時コマンド型以外**の妨害モード（投票型）
- ランダム 3 選択肢から最多票を実行 — 将来 `vote_event` モード
- 60 秒ラウンド — 10 分 fill モードとは別の短周期イベント

### そのまま使えない点

- Fabric Mod（Java）
- Twitch 専用

### sabotage-minecraft への反映

- 将来モード `vote_event` を game-design に記載
- Bridge で投票集計 → 1 イベントに集約する設計を予約

---

## 6. twitch4j/twitch4j-minecraft-plugin

| 項目 | 内容 |
|------|------|
| URL | https://github.com/twitch4j/twitch4j-minecraft-plugin |
| ライセンス | **MIT** |
| 概要 | Twitch4J + Bukkit テンプレート |

### 参考にできる点

- **プラットフォーム SDK を Bridge 層に閉じ込める**テンプレート構造
- OAuth / token をサーバープラグイン（≒ Bridge）側のみに配置

### そのまま使えない点

- Bukkit / Twitch4J 依存

### sabotage-minecraft への反映

- `bridge/src/youtube/` と将来 `bridge/src/twitch/` を同階層 adapter として追加
- 正規化後は共通 `StreamEvent` 型へ

---

## 共通パターンまとめ

| パターン | Java OSS の例 | sabotage-minecraft |
|----------|---------------|-------------------|
| 外部 Bot + MC Plugin | TikTok-Live-Connector | bridge + addon |
| ギフト ID → 効果 | gifts.json | 将来 `giftMap.ts` |
| Anti-spam / cooldown | TikTokLIVEMC | CooldownManager + safety |
| 危険効果の分離 | CC / TikTok actions | `EffectRisk` + enabled |
| 投票型 | TwitchControlsMinecraft | 将来 `vote_event` |
| ルーレット型 | CC / TikTok gifts | 将来 `random_roulette` + Super Chat |

---

## sabotage-minecraft 反映一覧（実装済み / 予定）

### 実装済み（本 PR）

- [x] `docs/research-java-oss.md`（本ファイル）
- [x] `bridge/src/effects/registry.ts` — category / risk / enabled / cooldown
- [x] `bridge/src/types.ts` — `StreamPlatform`, `StreamEvent`
- [x] `addon/.../effects/registry.js` — Bedrock 側ミラー
- [x] `config.js` / Bridge config — effects 設定

### 将来

- [ ] `vote_event` モード
- [ ] `random_roulette` モード（Super Chat 連動）
- [ ] TikTok / Twitch adapter（公式 or ポリシー確認後）
- [ ] OBS overlay（`GameSnapshot` 拡張）

---

## 将来モード案（MVP 未実装）

### vote_event

```txt
一定間隔で3つの妨害候補を提示
視聴者がコメント投票（!1 !2 !3）
最多票の効果を1回発動
```

### random_roulette

```txt
Super Chat / ギフトでルーレット演出
safe〜medium 効果からランダム抽選
dangerous は初期 OFF
```

---

## ライセンス一覧

| リポジトリ | ライセンス | コード利用 |
|------------|------------|------------|
| minecraft-crowdcontrol | MPL-2.0 | 設計参考のみ（ファイル単位コピーは MPL 条件要確認） |
| TikTok-Live-Connector | MIT | 設計参考のみ |
| twitch4j-minecraft-plugin | MIT | 設計参考のみ |
| TikTokLIVEMC | 不明 | **参考のみ** |
| TikTokLiveSpigotMultiLIVE | 不明 | **参考のみ** |
| TwitchControlsMinecraft | 不明 | **参考のみ** |

---

## Bedrock 実現性メモ

| 効果カテゴリ | Script API | 備考 |
|--------------|------------|------|
| movement | 可 | addEffect, applyKnockback |
| vision | 可 | darkness, blindness |
| mob | 部分可 | spawnEntity（BDS 負荷注意） |
| field | 可 | block.setType（fill モード実装済み） |
| support | 可 | ItemStack, addItem |
| visual | 可 | title, sound（将来） |
| dangerous | 制限 | TNT / 即死は MVP 禁止 |

 `@minecraft/server-net` は **BDS 専用**。Realms / 通常クライアント非対応。
