---
id: WI-318
type: fix
severity: high
status: drafted
affects: [harness-api]
source: github#38
---

# WI-318: complete-check が severity-aware 集約を通らず warning-only failure で exit 1 になる

<!-- @work-item-id WI-318 -->

## 背景

`scripts/harness/harness-api/domain/services/command-dispatch-service.ts` の
`case 'phasegate:complete-check'` は validator の生の `passed` フラグだけを見て
errors を集約していたため、warning-only の validator failure（severity: "warning"
のエラーのみで `passed: false`）でも exit 1 になっていた。

ADR-017 / WI-260 で導入された severity-aware 集約（`CiCheckResult` の
`isEffectivelyPassed`: failOnWarning=false 既定で warning-only failure を実質 pass
と判定）は `phasegate:ci-check` と `validate --layer L2` には適用済みだったが、
complete-check だけ未適用だった。その結果:

- `validate --layer L2` は warning-only で exit 0 なのに `phasegate:complete-check`
  は exit 1 という乖離が発生
- L2-016 の `<!-- @coverage-gating: ungated-legacy -->` マーカー（error を可視な
  warning に落として通す仕組み）が、Stop hook（`handle-stop-usecase` →
  `phasegate:complete-check`、exitCode !== 0 で enforce）の経路で無効化されていた
- skipped validator（`passed: false, skipped: true`）も fail 扱いになり、ci-check
  の skipped 判定（green state）と乖離していた

## 修正

- complete-check を ci-check case と同一の `CiCheckResult.fromResults(validatorResults)`
  経由の判定に統一（両コマンドが同一の domain VO の `isEffectivelyPassed` を通る）
- 実質 fail の validator（`result.getFailedValidators()`）のエラーのみ `allErrors`
  に集約。errors 空の実質 fail は従来どおり `Validator {id} failed` を合成
- warning severity のエラー件数を summary の `warnings` カウントに反映
  （warning-only pass 時も件数が可視化される）
- lint fail → exit 1 の合流構造は現状維持
- validatorResults が空の場合は集約をスキップし、lint 結果のみで判定
  （`fromResults` の INV-5 例外による behavior change を回避）
- テスト追加（`__tests__/unit/harness-api/command-dispatch-service.test.ts`
  UT-DS-013〜016）: warning-only pass / error severity fail 回帰 / lint fail 回帰 /
  skipped validator の ci-check 一致
