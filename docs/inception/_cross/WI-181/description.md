---
id: WI-181
type: issue
severity: high
status: tested
affects: [skill-quality, installation]
source: github#6
external_ref: https://github.com/junpei-9898/phasegate/issues/6
---

# WI-181: Packaged cascade update fails because tinyglobby is not declared

> 起票日: 2026-05-14
> 起票経緯: GitHub Issue #6 の再現確認。`skill:apply-cascade-update` が `tinyglobby` を dynamic import するが、`package.json` の dependencies に含まれていない。

## 再現結果

`npm pack` で作成した `phasegate-0.160.0.tgz` を一時展開し、runtime dependency として `tsx` / `ajv` / `picomatch` のみを解決できる状態にした。

```text
$ /private/tmp/phasegate-issue-repro-6/pkg/package/bin/phasegate skill:apply-cascade-update --story WI-XXX --dry-run
Updated 0 files with tags:
Errors:
  - Failed to process scripts/**/*.ts: Cannot find package 'tinyglobby' imported from .../scripts/harness/skill-quality/composition-root.ts
  - Failed to process docs/**/*.md: Cannot find package 'tinyglobby' imported from .../scripts/harness/skill-quality/composition-root.ts
```

補足: checkout 環境では `tinyglobby` が dev/transitive dependency として存在するため成功するが、packaged downstream では再現する。

## 問題

- `scripts/harness/skill-quality/composition-root.ts` が `await import('tinyglobby')` を使用している。
- `package.json` の dependencies は `ajv` / `picomatch` / `tsx` のみで、runtime import と package contract が一致していない。
- downstream の lesson cascade loop が missing dependency で停止する。

## 受け入れ基準

- [x] packaged install でも `skill:apply-cascade-update --dry-run` が missing dependency で失敗しない。
- [x] `tinyglobby` を runtime dependency に追加するか、既存 dependency で glob 解決する。
- [x] package tarball ベースの regression test か同等の packaging dependency test がある。

## 実装メモ

- `package.json` の runtime dependencies に `tinyglobby` を追加。
- `scripts/harness/__tests__/integration/packaging/package-runtime-contract.test.ts` で packaged runtime import と dependency declaration の整合を検証。
