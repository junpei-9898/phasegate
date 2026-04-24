# TDD実装計画: H13-04 — Work-Item trailer validation in pre-commit/CI

@unit ci-governance
@layer test
@story-id H13-04
@work-item-id WI-026

## Red

- `runPreCommit()` に `commitMessage` optionを渡せるテストを追加する。
- WI配下document変更時にtrailer欠落で失敗するケースを追加する。

## Green

- `PreCommitOptions` を追加する。
- staged pathからWI配下document変更を判定する。
- `PHASEGATE_COMMIT_MESSAGE` をCLIの `commitMessage` optionへ渡す。
- `Work-Item: WI-XXX` trailerが無い場合にexitCode 1へ合成する。
- `phasegate commit-msg <message-file>` を追加し、message fileを読み取って同じ検証へ渡す。
- `.husky/commit-msg` とテンプレートを追加する。

## Refactor

- 通常pre-commit互換性を維持するため、`commitMessage` 未指定時はtrailer検証を行わない。
- 出力セクションは既存のL2/metadataセクションと同じ形式で追加する。
