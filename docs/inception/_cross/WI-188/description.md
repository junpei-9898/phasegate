---
id: WI-188
type: issue
severity: high
status: tested
affects: [skill-quality]
source: github#13
external_ref: https://github.com/junpei-9898/phasegate/issues/13
---

# WI-188: skill check coverage invokes vitest before validating story existence

> 起票日: 2026-05-14
> 起票経緯: GitHub Issue #13 の再現確認。

## 再現結果

一時 project に空の `.harness/requirement-test-matrix.json` を置き、存在しない story ID を指定した。

```text
$ phasegate skill:check-coverage --story NONEXISTENT-99 --json
Error: Coverage run failed: Command failed: npx vitest run --coverage --coverage.reporter=json-summary "--coverage.reportsDirectory=/private/tmp/phasegate-issue-repro-13/.harness"
npm error network request to https://registry.npmjs.org/vitest failed ...
```

## 問題

- nonexistent story ID でも matrix lookup が `{total:0, covered:0}` 扱いになり、coverage runner へ進む。
- vitest が未導入の downstream では `npx vitest` が install/network path に入り、story not found とは無関係の error になる。
- quick/story implementor が actionable な story validation error を受け取れない。

## 受け入れ基準

- [ ] `--story` が matrix に存在しない場合は vitest を起動せず `story not found` 相当の structured error を返す。
- [ ] tests が存在しない場合は `skipped/no-tests` として扱い、npx auto-install に進まない。
- [ ] vitest 実行は downstream devDependency の存在確認後に行い、missing dependency は明確な guidance を返す。
