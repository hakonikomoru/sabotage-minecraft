# ゲーム設計 — 妨害マイクラ

**制作:** komolab - こもらぼ -

## コンセプト

**コメントで世界が壊れる妨害マイクラ**

YouTube / Twitch ライブ視聴者がコメントで 10 分ブロック埋め系チャレンジを妨害・応援する参加型ミニゲーム。

配信向けの世界観説明: [worldview.md](./worldview.md)

---

## 座標・フィールド設計（配布前提）

| 方針 | 内容 |
|------|------|
| 固定座標 | **禁止** — ワールドごとに座標が違うため |
| 生成基準 | `!sab start` を実行した **プレイヤーの現在位置** |
| 安全確認 | 生成前に 12×12 範囲をスキャン。上書き不可ブロックがあれば中止 |
| 範囲記録 | `state.field` に origin / structureSize / originalBlocks を保存 |
| リセット | `!sab reset` で **生成範囲のみ** 元のブロック状態に復元 |
| 範囲外 | フィールド外のブロックは **一切変更しない** |

### MVP に入れない（locate / 自動 TP 系）

```txt
- locate コマンドの自動実行
- 構造物座標の自動取得
- 自動 TP 前提のゲーム進行
```

代わりに `!sab start` した場所にフィールドを出す。

---

## モード一覧

| モードID | 表示名 | 勝利タイミング |
|----------|--------|----------------|
| `fill_challenge` | 10分ブロック埋めチャレンジ | 90% 到達の**瞬間** |
| `fill_and_defend` | ブロック埋め防衛チャレンジ | **10 分終了時点**で 90 個以上キープ |

### 使い分け（配信向け）

| モード | 配信での使い方 |
|--------|----------------|
| `fill_challenge` | 初回・ルール説明・短時間枠 |
| `fill_and_defend` | 本番・コメント多い枠・盛り上げ向け |

---

## fill_challenge

| 項目 | 値 |
|------|-----|
| 制限時間 | 10 分 |
| フィールド | 10×10（外枠 12×12） |
| 勝利条件 | 途中で 90 ブロック以上設置した瞬間 |
| 初期支給 | 白色の羊毛 128 個 |
| winTiming | `on_reach` |

## fill_and_defend

| 項目 | 値 |
|------|-----|
| 配信用呼び方 | 10分で埋めて守れ！妨害マイクラ |
| 制限時間 | 10 分 |
| フィールド | 10×10（fill_challenge と同じ） |
| 勝利条件 | **10 分終了時点**で白色羊毛 90 個以上 |
| 敗北条件 | 10 分終了時点で 89 個以下 |
| 初期支給 | 白色の羊毛 **160 個** |
| winTiming | `on_time_up` |

### ゲーム性

90 個埋めても即勝利にならない。終盤の `!hole` で 89 個まで落ちるドラマが起きやすい。

---

## フィールド構成（共通）

```txt
YYYYYYYYYYYY
YBBBBBBBBBBY
...
Y = 黄色コンクリート / B = 黒コンクリート / 内側10×10が判定エリア
```

---

## モード切替コマンド

```txt
!sab mode                              # 現在モード表示
!sab mode fill_challenge
!sab mode fill_and_defend
!sab start defend                      # ショートカット（defendモードで開始）
```

`running` / `paused` 中はモード変更不可。

---

## Minecraft 管理コマンド（`!sab`）

```txt
!sab start | start defend | mode | stop | pause | resume | status | clear | reset
!sab test slow | blind | chicken | hole | block
```

### 将来: 名前付きアイテムメニュー（MVP 未実装）

チャットの代わりに **名前付きアイテム** で同じ操作を行う案。`config.js` の `menuItems` に定義済み。

| 表示名 | 操作 |
|--------|------|
| `SAB:menu` | 時計 — コマンド一覧表示 |
| `SAB:start` | ゲーム開始 |
| `SAB:stop` | 停止 |
| `SAB:pause` | 一時停止 |
| `SAB:resume` | 再開 |
| `SAB:status` | 状態表示 |
| `SAB:clear` | イベントキュークリア |
| `SAB:reset` | フィールド復元 + 状態リセット |

MVP ではチャットコマンドのみ。配信オペレーションが安定したらアイテム操作を追加。

---

### status 表示例（fill_and_defend）

```txt
状態：running
モード：fill_and_defend
残り時間：07:32
白色羊毛：64 / 100
防衛ライン：90
達成率：64%
キュー数：3
Bridge接続：OK
```

30 秒ごとに進捗通知:

```txt
残り 07:30 / 白色羊毛 64個 / 防衛ライン 90個 / キュー 3件
```

---

## YouTube コマンド（MVP・両モード共通）

| コマンド | 効果 | 全体 CD |
|----------|------|---------|
| `!slow` | 鈍足 10 秒 | 10 秒 |
| `!blind` | 暗闇 8 秒 | 10 秒 |
| `!chicken` | ニワトリ 5 匹 | 15 秒 |
| `!hole` | 羊毛 3 個を床に戻す | 15 秒 |
| `!block` | 羊毛 +16 | 20 秒 |

`fill_and_defend` では `!hole` と `!block` が特に重要。

---

## 将来追加：fill_and_defend 専用妨害（MVP 未実装）

```txt
!crack   - ひび割れ扱い（別ブロック置換）
!erase   - 羊毛10個消去（強妨害・初期OFF）
!paint   - 別色羊毛に変換（カウント外）
!lock    - 採掘疲労付与
!mob     - 邪魔モブ召喚
```

## 将来追加：fill_and_defend 専用応援（MVP 未実装）

```txt
!repair  - 非羊毛床を5個羊毛に戻す
!wall    - 一時防壁
!speed   - 移動速度アップ
!protect - 次の !hole を1回無効
!bonus   - 羊毛32個支給
```

---

## Java OSS 参考（設計のみ）

[research-java-oss.md](./research-java-oss.md) に調査結果を記載。

| 参考リポジトリ | 反映内容 |
|----------------|----------|
| minecraft-crowdcontrol | プラットフォーム抽象化・効果カテゴリ |
| TikTok-Live-Connector | Bridge + Addon 分離、gift マッピング |
| TwitchControlsMinecraft | 将来 `vote_event` モード |

### 効果 registry（category + risk）

| 危険度 | MVP | 例 |
|--------|-----|-----|
| `safe` | 有効 | slow, blind, chicken, hole, block |
| `medium` | OFF | zombie, paint, speed, protect |
| `dangerous` | OFF | tnt, creeper, erase, mob_rush |

### 将来モード（未実装）

```txt
vote_event         — 3択投票で妨害決定（TwitchControlsMinecraft 参考）
random_roulette    — Super Chat / Bits で演出ルーレット（CC 参考）
wolf_capture_race  — オオカミ100匹捕獲レース（下記）
```

---

## 将来モード: wolf_capture_race（MVP 未実装）

**モード ID:** `wolf_capture_race`

| 項目 | 内容 |
|------|------|
| 概要 | 各プレイヤーごとに 30×30 の羊毛箱部屋を生成し、100 匹のオオカミを最速で全捕獲した順位を競う |
| 部屋 | プレイヤーごとに **羊毛色を分けた** 30×30 箱部屋 |
| オオカミ | 各部屋に **100 匹** 配置 |
| 納品 | 部屋色と揃えた色の **シュルカーボックス** を納品場所に配置 |
| 連動 | 将来 YouTube / Twitch 妨害イベントにも対応可能な設計にする |

fill 系モード（YouTube/Twitch 連動 MVP）が安定してから着手。

---

## GameSnapshot（OBS 将来用）

`getGameSnapshot()` で以下を取得可能:

```ts
{
  state, mode, modeDisplayName,
  remainingSeconds, whiteWoolCount, totalCells, requiredCount,
  progressRate, queueSize, bridgeConnected, result?
}
```

---

## 将来難易度案

```txt
Easy：10×10 / 90個 / 10分
Normal：12×12 / 130個 / 10分
Hard：15×15 / 200個 / 10分
Hell：20×20 / 360個 / 10分
```

`fill_and_defend` は最初 10×10 固定推奨。
