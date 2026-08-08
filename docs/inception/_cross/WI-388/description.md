---
id: WI-388
type: fix
status: drafted
severity: normal
affects: [ci-governance, phase-dependency-model]
source: WI-385 validation type regression
---

# WI-388: CI に fail-fast TypeScript typecheck を追加する

<!-- @work-item-id WI-388 -->

## 問題

CI が `tsc --noEmit` を実行せず、型退行を検出できない。現 HEAD には
`StoryReflectionFileSystemPort.storyTouchesUnitLayer` 追加後に test fixture が追随していない
既知エラーが 1 件残っている。

## 修正

- 既知 test fixture に port method を補完して `tsc --noEmit` を green にする。
- `.github/workflows/ci.yml` の test job に既存 `tsconfig.json` を使う
  `pnpm exec tsc --noEmit` step を追加し、失敗を許容しない。

