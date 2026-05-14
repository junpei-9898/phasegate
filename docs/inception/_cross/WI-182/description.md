---
id: WI-182
type: issue
severity: high
status: tested
affects: [installation, ci-governance]
source: github#7
external_ref: https://github.com/junpei-9898/phasegate/issues/7
---

# WI-182: Installed pre-commit template uses monorepo-only HARNESS_CMD

> 起票日: 2026-05-14
> 起票経緯: GitHub Issue #7 の再現確認。downstream 向け pre-commit template が `scripts/harness/main.ts` を直接参照している。

## 再現結果

`ci:generate-template --type pre-commit --render` で生成される pre-commit hook に以下が含まれることを確認した。

```sh
HARNESS_CMD="npx tsx scripts/harness/main.ts"
```

また一時 downstream project の `install --dry-run --force` は `.husky/pre-commit` を deploy 対象として計画するため、同 template が install lifecycle 経由でも配布される。

## 問題

- npm-installed downstream project には `scripts/harness/main.ts` が存在しない。
- install 直後の初回 commit で pre-commit hook が失敗する。
- template コメントも「コピーして使用する」前提で、install が deploy する実態とずれている。

## 受け入れ基準

- [x] downstream 用 pre-commit hook が `npx phasegate` など package bin 経由で動く。
- [x] monorepo dogfood 用の呼び出しと downstream 用 template が混同されない。
- [x] `install --dry-run` / `ci:generate-template --type pre-commit --render` の両方で同じ修正済み template が確認できる。

## 実装メモ

- `docs/templates/hooks/pre-commit` を `PHASEGATE_CMD="${PHASEGATE_CMD:-npx phasegate}"` に変更し、repository-local `scripts/harness/main.ts` 参照を除去。
- install integration test と render integration test で downstream contract を検証。
