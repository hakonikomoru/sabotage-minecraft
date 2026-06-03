# sabotage-minecraft — agent instructions

作業前に **`docs/project-sync.md`** を読むこと。

## 実装時の必須事項

- **リポジトリ構成を変えたら `docs/project-sync.md` を同期する** — Route・`src/` トップレベル・`scripts/` 追加などに該当したら、同じ変更で `npm run sync:project-docs` を実行する（`<!-- sync:auto:... -->` ブロックが自動更新される）。
- 仕様・UI・運用の意味的な変更は、該当セクションを手でも追記する。
- 初回セットアップは `/Users/ebata/app` 直下の `node scripts/init-app-repository.mjs <リポジトリ名>` で自動生成できる。
- **GitHub 運用（remote / push / `gh repo create`）は [`/Users/ebata/app/AGENTS.md`](/Users/ebata/app/AGENTS.md) に従う。** 各リポジトリの AGENTS.md に重複記載しない。
