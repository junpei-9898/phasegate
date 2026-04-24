# 単体テスト設計: H13-04 — Work-Item trailer validation in pre-commit/CI

@unit ci-governance
@layer test
@story-id H13-04
@work-item-id WI-026

## 対象

- `scripts/harness/integrations/pre-commit.ts`
- `runPreCommit(stagedFiles, deps, options)`

## テストケース

| ID | 条件 | 期待 |
|----|------|------|
| UT-PC-17 | `docs/inception/_cross/WI-026/description.md` がstagedで、commit messageにtrailerが無い | exitCode 1、`Work-Item: WI-XXX` を含む |
| UT-PC-18 | WI配下documentがstagedで、commit messageに `Work-Item: WI-026` がある | exitCode 0 |
| UT-PC-19 | WI配下以外のdocumentがstagedで、commit messageにtrailerが無い | exitCode 0、trailerセクションを出さない |

## 統合テスト

| ID | 条件 | 期待 |
|----|------|------|
| IT-PC-10 | `phasegate commit-msg <file>` でWI document stagedかつtrailerなし | exitCode 1、trailer欠落を表示 |
| IT-PC-11 | `phasegate commit-msg <file>` でWI document stagedかつvalid trailerあり | trailer検証セクションがPASSになる |

## 配布テスト

- `deployHuskyCommitMsgHook()` は `.husky/commit-msg` を作成し、実行権限 `0o755` を付与する。
- 既存 `.husky/commit-msg` は上書きしない。
