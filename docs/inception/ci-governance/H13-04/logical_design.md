# 論理設計: H13-04 — Work-Item trailer validation in pre-commit/CI

@unit ci-governance
@layer logical
@story-id H13-04
@work-item-id WI-026

## 設計方針

`scripts/harness/integrations/pre-commit.ts` は既にstaged fileを受け取り、L2 validatorとmetadata validatorを合成している。H13-04では同じ統合点にオプションの `commitMessage` 入力を追加し、CI / commit-msg相当の呼び出し元が本文を渡したときだけtrailer検証を実行する。

pre-commit hook単体はGitの仕様上コミットメッセージを参照できない。そのため、通常の `npx phasegate pre-commit` は既存挙動を維持し、`phasegate commit-msg <message-file>` がGitのcommit message fileを読み取って `Work-Item: WI-XXX` を検証する。CIでは `PHASEGATE_COMMIT_MESSAGE` を渡すことで同じ検証を実行できる。

## 判定ルール

- staged fileに `docs/inception/**/WI-<number>/**` が含まれる場合、WI document変更とみなす。
- WI document変更で `commitMessage` が指定されている場合、本文に `Work-Item: WI-<number>` 行を要求する。
- `commitMessage` が未指定の場合はtrailer検証をスキップし、既存pre-commit互換性を優先する。
- WI配下以外の変更ではtrailerを要求しない。

## Hook接続

- `.husky/pre-commit` は従来通り staged files のL2/metadata検証を担う。
- `.husky/commit-msg` は `npx phasegate commit-msg "$1"` を呼び、commit message fileをCLIへ渡す。
- `init --with-husky` は pre-commit hook と commit-msg hook の両方を配布する。

## 出力

検証対象の場合は `== Work-Item trailer ==` セクションを追加する。欠落時はexitCode 1としてcommitをブロックし、期待形式 `Work-Item: WI-XXX` を表示する。
