# AGENTS.md

## 必読ドキュメント

- `docs/folder_management_rules.md` — ドキュメント配置・AIDLCフェーズ順序の正本
- `docs/principles/` — 設計・テスト原則の正本

## ドキュメント作成・配置ルール

詳細な配置・成果物・frontmatter・フェーズ順序は `docs/folder_management_rules.md` を正とし、PhaseGate / metadata validator の指示に従う。

エージェントは、ユーザーが「調査して計画」「実装計画」「対応計画」「TDD計画」「設計して」などを依頼した場合、会話だけで終わらせず、対象 WI の `docs/inception/.../{WI-XXX}/` 配下に適切な計画・設計ファイルを作成または更新する。

- cross-cutting WI は `docs/inception/_cross/{WI-XXX}/`
- 単一 Unit WI は `docs/inception/{unit}/{WI-XXX}/`
- WI に紐付かない横断調査は `docs/inception/_shared/`

新規 WI 作成時は `docs/inception/**/WI-XXX/` と `id: WI-XXX` を確認し、inception 全体で重複しない番号を使う。`description.md` の parent directory 名と frontmatter `id` は一致させる。

実装・テスト変更の前に、必要な inception 成果物と `docs/product/...` への `@work-item-id WI-XXX` 付き反映が済んでいるか確認する。未反映なら、先にドキュメントを整える。

## ハーネス検証

詳細なコマンド、バリデーター、L4 検出器は README / docs / CLI help を正とする。実装前後は必要に応じて `pnpm harness:check-ready` や該当レイヤーの検証を実行する。

## Git hook bypass の扱い

`git commit --no-verify` / `git push --no-verify` などの hook bypass は安易に使用しない。pre-commit / pre-push が失敗した場合は、まずエラー内容を確認し、修正して通常の commit / push を通す。

やむを得ず `--no-verify` を使う必要がある場合は、実行前に理由・残るリスク・確認済みの代替検証をユーザーへ説明し、明示的な許可を得る。

## エラー発生時の対処

1. エラーコードを確認（例: `HARNESS-PG-001`）
2. `AGENT INSTRUCTION` セクションの指示に従う
3. `DOCUMENTATION` のリンク先を必要に応じて参照
4. 修正完了後、再度コマンドを実行して確認
