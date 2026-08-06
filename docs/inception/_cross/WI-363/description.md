---
id: WI-363
type: fix
severity: high
status: drafted
affects: [agent-integration]
source: GitHub issue #46（WI-348〜361 の検証で判明した hardening 残課題）
---

# WI-363: `.husky/**` を protected-file の既定パターンに追加する

<!-- @work-item-id WI-363 -->

## 背景

WI-352 で quick-mode の `config` カテゴリ allowlist に `.husky/` 配下が追加され、
`.husky/pre-commit` / `.husky/commit-msg` / `.husky/pre-push` が Quick Mode の
書き込み許可対象に入った。

一方で CLAUDE.md および `docs/guide/layer-model.md` §L0 は、これらのファイルを
**L0 runtime の実施点**（Work-Item trailer 強制・pre-commit backstop）と明記している。
防御機構そのものを、防御機構の緩和モードで書き換えられる状態は
`.phasegate/baseline.json` を protected file にしたときと同じ性質の穴にあたる。

`ProtectedFileList.DEFAULT_PATTERNS` には `.husky` 系の項目が無く、
`phasegate.config.json` の `protectedFiles.patterns` で各プロジェクトが個別に
追加しない限り保護されなかった。

## 修正

1. `ProtectedFileList` の `DEFAULT_PATTERNS` に `.husky/**` と `**/.husky/**` を追加する。
   後者は monorepo のサブパッケージ直下に置かれた husky hook を拾うためで、
   `.phasegate/baseline.json` と同じ二段構えに揃えた。
2. `HandlePreToolUseUseCase.PROTECTED_FILE_GUIDANCE` に `.husky/` 用のエントリを追加する。

## ガイダンス文言を追加した理由

protected-file ブロックは `HandlePreToolUseUseCase.execute()` の最初期
（quick-mode 判定・phase-gate 判定より前）で確定するため、Quick Mode では解除できない。
既定のフォールバック文言は「/quick-implementor スキルで変更可能か確認してください」であり、
`.husky/**` に対しては**解けない回避策を案内してしまう**。

そのため専用文言で以下を案内する:

- `.husky/` 配下が L0 runtime の実施点であり Quick Mode でも変更できないこと
- 未導入 hook の配置は `npx phasegate setup:agent --apply --with-husky` を使うこと
  （既存ファイルは skip される = 上書きしない実装）
- 意図的に手編集する場合は `phasegate.config.json` の `protectedFiles.exclude` に
  対象パターンを明示すること（`ProtectedFileList.createWithAdditionalAndExclusions`
  が exclude を尊重する）

## 自リポジトリへの影響

phasegate 自身の `.husky/pre-commit` / `commit-msg` / `pre-push` の更新も
今後は protected 経路になる。これは意図した挙動で、変更が必要になった場合は
上記ガイダンスのとおり exclude を明示するか、ユーザー承認のうえで実施する。

## テスト

- `scripts/harness/__tests__/unit/agent-integration/protected-file-list.test.ts`
  - UT-PFL-072〜076: 既定保護 / サブディレクトリ / 前方一致のみのディレクトリ非保護 / exclude 解除
  - UT-PFL-052（全 DEFAULT_PATTERNS 除外時のフォールバック）の除外リストを追加分に追随
- `scripts/harness/__tests__/integration/agent-integration/handle-pre-tool-use-config-plan-guidance.test.ts`
  - `.husky/pre-commit` ブロック時のガイダンス文言
