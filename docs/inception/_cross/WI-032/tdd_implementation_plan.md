---
traceability:
  initial_creation: true
---

# WI-032 TDD Implementation Plan

<!-- @work-item-id WI-032 -->

## Scope

AGENTS.md / CLAUDE.md を手動更新に依存しない agent context refresh pipeline にする。

対象 Unit:

- `ci-governance`: agent context refresh use case / CLI / CI template
- `harness-api`: `init --with-ci` で workflow を配布
- `skill-quality`: lesson artifact 収集結果を AGENTS.md refresh 入力として扱う

## Acceptance Mapping

| AC | 実装方針 | 検証 |
|---|---|---|
| `ci:auto-refresh-agent-context --dry-run` で差分プレビュー | AGENTS.md migration と CLAUDE.md refresh をまとめる handler を追加 | handler integration test / CLI smoke |
| `--apply` で更新 | apply mode のみ file write | use case integration test |
| CI workflow template | `docs/templates/ci/agent-context-refresh.yml` を追加 | template render / deploy test |
| `init --with-ci` で配置 | `deployCiWorkflows` に agent context workflow を追加 | setup unit / init integration |
| CLAUDE.md user section 保持 | marker 間を既存ファイルから移植 | use case integration test |
| agent context drift 検出 | `p2:check-agent-context` で AGENTS.md / CLAUDE.md freshness を検査 | handler/CLI smoke |

## TDD Steps

1. Red: refresh handler / CLAUDE.md marker preservation / workflow deploy のテストを追加する。
2. Green: 最小 use case、file adapter、template、CLI dispatch を実装する。
3. Refactor: 出力と README / product docs を整理し、既存 template render と整合させる。
4. Verify: 対象テスト、CLI smoke、`pnpm harness:check-ready`、`npm pack --dry-run` を実行する。

## Release Prep

実装完了後、npm publish 直前の準備として以下を完了させる。

- `package.json` version bump
- `CHANGELOG.md` 追記
- release commit 作成
- `npm pack --dry-run` で bundled template が含まれることを確認
