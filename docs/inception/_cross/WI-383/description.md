---
id: WI-383
type: fix
severity: normal
status: drafted
affects: [regression-suite]
source: v0.334.0 (63ed43f7) の CI 赤 — 失敗テストがログから特定できなかった
---

# WI-383: coverage の blob 実行に人間可読 reporter を併用して CI 失敗を診断可能にする

<!-- @work-item-id WI-383 -->

## 背景

v0.334.0（`63ed43f7`、WI-382）の CI が `test (22)` の `pnpm coverage` で exit 1 になった。
WI-382 の変更は docs 4 ファイル（`_cross/WI-360`・`WI-366` の frontmatter severity 修正、
`WI-382/description.md` 新規、version bump）のみだった。

CI ログには次の 2 行しか残らず、**どのテストが落ちたのか一切分からなかった**。

```
blob report written to .../coverage/.blob/threads.json
 ELIFECYCLE  Command failed with exit code 1.
```

`coverage` スクリプトの forks 相・threads 相は `--reporter=blob` のみを指定している。
blob reporter は結果をバイナリ blob に書くだけで stdout に何も出さないため、
失敗テスト名・アサーション差分・スタックトレースがすべて失われる。
合否は 3 番目の `--merge-reports` 実行で初めて表示されるが、
その手前の 2 相が exit 1 で落ちると `&&` チェーンが切れて merge に到達しない。
つまり **coverage 相の失敗は構造的に診断不能**だった。

## 原因調査の結果（WI-382 は無罪）

- ローカルで CI と同一 config を実行 → 全緑
  - `vitest run --config scripts/harness/__tests__/vitest.config.ts`: 681 files / 5136 tests passed
  - `vitest run --config scripts/harness/__tests__/vitest.config.coverage.ts`: 672 files / 5021 tests passed
- `world:derive` の structural obligations は baseline 579 件と完全一致（新規・消失ともに 0）
- **同一コミット `63ed43f7` の CI 再実行が node 18 / 20 / 22 すべて success**

再実行が同一 checkout で緑になった以上、WI-382 の内容による決定的な回帰ではなく
flaky failure だったと判断する。revert も期待値の書き換えも不要。

修復すべき実体は「CI が落ちても原因を特定できない」という観測性の欠落であり、
本 WI はそこだけを直す。今回落ちたテストが特定できなかったこと自体が、
この欠落の証拠である。

## 修正

`package.json` の `coverage` スクリプトで blob を出す 2 相に `--reporter=default` を併用する。
blob の出力先は複数 reporter 指定と両立する `--outputFile.blob=` 形式へ変更する。

```
--reporter=blob --outputFile=coverage/.blob/threads.json
→ --reporter=blob --reporter=default --outputFile.blob=coverage/.blob/threads.json
```

blob 生成（`--merge-reports` によるカバレッジ統合の入力）はそのまま維持しつつ、
失敗時には default reporter が失敗テスト名と差分を stdout に出す。

あわせて、回帰テストを追加した `production-ci-world-contract.test.ts` が
`@work-item-id WI-307` を持つため L2-014 が WI-307 の台帳 status 陳腐化
（current=drafted / derived=tested）を検出した。
`work-items:status --apply --id WI-307` で台帳側を導出値へ更新する。

## 検証

- `production-ci-world-contract.test.ts` に、blob を出す 2 相がいずれも
  `--reporter=default` と `--outputFile.blob=coverage/.blob/` を伴うことを固定する回帰テストを追加
- `npm run test` / `npx phasegate lint` / `npx phasegate validate --layer L2` が緑
- coverage スクリプト実行で blob が従来どおり書かれ、merge 相が json-summary を生成すること

## スコープ外

flaky の発生源そのものの特定は行わない（今回のログからは特定不能で、
再現もしていない）。本修正により次に同じ赤が出たときは失敗テストが
ログに残るため、そこで初めて個別に対処する。
