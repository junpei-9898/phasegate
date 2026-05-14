---
id: WI-200
type: issue
severity: high
status: tested
source: github#25
external_ref: https://github.com/junpei-9898/phasegate/issues/25
---

# WI-200: Reject unknown ci:generate-template flags

> 起票日: 2026-05-15
> 起票経緯: GitHub Issue #25。v0.160.6 dogfood で `ci:generate-template` が unknown flags を成功扱いし、既定 template を返すことを確認。

## 問題

`ci:generate-template` は `--kind` や `--output` のような未定義 flag を無視し、既定の `--type aidlc-gate` として成功 banner を出す。ユーザーは consistency-check や output file 生成に成功したと誤認する。

## Dogfood 再現

```text
$ pnpm exec tsx scripts/harness/main.ts ci:generate-template --kind consistency-check
✓ CI Template Generated
  Template Type: aidlc-gate
[exit 0]

$ pnpm exec tsx scripts/harness/main.ts ci:generate-template --type aidlc-gate --output /private/tmp/aidlc-gate.yml
✓ CI Template Generated
  Template Type: aidlc-gate
[exit 0]

$ ls -l /private/tmp/aidlc-gate.yml
No such file or directory
```

Correct flag は動作する。

```text
$ pnpm exec tsx scripts/harness/main.ts ci:generate-template --type consistency-check --render
# Phasegate — 週次整合性チェックワークフロー
```

## 影響

- 古い docs の `--kind` を使うと wrong template が生成されたように見える。
- `--output` を指定しても file が作られず、CI setup automation が silent failure になる。
- 成功 banner が「生成済み」を示すため、stdout render なしの invocation が特に紛らわしい。

## 受け入れ基準

- [x] `ci:generate-template --kind ...` は unknown option として non-zero exit するか、正式 alias として明示的に扱う。
- [x] `--output <path>` は正式実装して file を書くか、unknown option として non-zero exit する。
- [x] `--render` / `--json` / `--output` のいずれもない場合の human output が「生成先なし」を誤解させない。
- [x] e2e test が unknown options rejection と valid render を検証する。

## Verification

- `pnpm exec vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts -t "legacy|ci:generate-template --kind|ci:generate-template --output"`
- `pnpm test`
- `pnpm harness:check-ready`

## Post-publish Dogfood

2026-05-15 に published `phasegate@0.160.7` から取得した tarball を展開し、`/private/tmp/phasegate-wi197-200-dogfood` で検証した。

- `phasegate ci:generate-template --kind consistency-check` -> exit 2、`unknown flag '--kind'`。
- `phasegate ci:generate-template --type aidlc-gate --output /private/tmp/phasegate-wi197-200-dogfood/aidlc-gate.yml` -> exit 2、`unknown flag '--output'`、file 未作成。
- `phasegate ci:generate-template --type consistency-check --render` -> exit 0、workflow YAML を stdout に出力。
- `phasegate ci:generate-template --type aidlc-gate` -> exit 0、human output は `CI Template Plan Ready` と `Output: no file written; use --render to print template YAML` を表示。
