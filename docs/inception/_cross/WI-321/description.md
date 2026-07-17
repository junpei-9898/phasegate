---
id: WI-321
type: fix
severity: normal
status: implemented
affects: [harness-api]
source: verification-followup (github#38 残課題)
---

# WI-321: complete-check の JSON 出力に warning 内容（validator 別詳細）が含まれない

<!-- @work-item-id WI-321 -->

## 課題

`phasegate:complete-check` の JSON 出力は warning を `summary.warnings` の件数
としてしか返しておらず、どの validator がどんな warning を出したかが読めなかった
（WI-318 で warning 件数の可視化までは実装済み）。既存の `phasegate:ci-check` は
`data: CiCheckResult` として全 validator のエラー/警告詳細を返しており、
complete-check だけ非対称だった。

## 修正内容

`scripts/harness/harness-api/domain/services/command-dispatch-service.ts` の
`case 'phasegate:complete-check'`:

- `validatorResults.length > 0` のとき、WI-318 で導入済みの
  `CiCheckResult.fromResults(validatorResults)` の結果をそのまま
  `data` ペイロードとして応答に含める（pass 時・fail 時とも）。
  応答の型・フィールド名（`data.allPassed` / `data.validatorResults[].validatorId`
  / `.passed` / `.skipped` / `.errors[]`）は ci-check case と完全に同形
- `validatorResults` が空の場合は従来どおり `data` なし（lint 結果のみで判定）
- 判定ロジック（severity-aware 集約・lint 合流・exit code）は一切変更なし

human 向け出力について: complete-check は ci-check と同様に
`CompleteCheckHandler` → `HarnessApiJsonFormatter` の JSON 出力のみを持つため、
この `data` ペイロード（validator 名 + severity + message）がそのまま人間にも
見える唯一の出力面であり、追加の出力面は存在しない。

## 検証

`scripts/harness/__tests__/unit/harness-api/command-dispatch-service.test.ts`:

- UT-DS-012: 全 pass 時に `data`（`allPassed: true` + validatorResults）を含むこと
- UT-DS-013: warning-only pass 時に `data.validatorResults` から warning の
  validator 名（L2-016）と message が読めること（ci-check の UT-DS-005b と同形）
- UT-DS-014: error fail 時も `data` を含むこと（ci-check と対称）
- UT-DS-017（新規）: validatorResults 0 件のとき `data` が undefined のままであること

実行: `npx vitest run --config scripts/harness/__tests__/vitest.config.forks.ts scripts/harness/__tests__/unit/harness-api/command-dispatch-service.test.ts` green。
