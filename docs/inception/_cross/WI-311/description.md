---
id: WI-311
type: fix
severity: high
status: implemented
affects: [harness-api]
source: internal
---

# WI-311: Hermetic CI-facing harness integration tests

<!-- @work-item-id WI-311 -->

## 背景

CIのtest stepではmatrix generationより前にtest suiteを実行する。ところがharness-apiのreal lint integrationとCLI E2Eの一部は、test fixtureではなくself-repoのcwd、coverage report、untracked requirement matrixを暗黙入力としていた。clean tracked treeでは`phasegate:ci-check --json`がL3-003/004/005/007で正しくfail-closedとなり、テストのPASS期待と矛盾する。real lint scanもOSとcheckoutの全corpusへ結合していた。

## 修正

- `BiomeAstEngineLintAdapter`のreal implementationへ明示rootを注入できるようにし、tracked minimal workspace fixtureだけをscanする。
- `phasegate:ci-check --json`とlegacy `complete-check` aliasを、L3 / Worldを明示無効化したtemp workspaceで検証する。
- productionのfail-closed、L1 rule、CI順序、matrix生成契約は変更しない。

## 受け入れ基準

- real lint adapter testがhost OSとself-repoの一時状態に依存せずPASSする。
- matrix / coverageが存在しないclean checkoutでも対象CLI E2Eがfixture内で契約どおりPASSする。
- self-repoに対するL2/L3のauthoritative検証は従来どおり維持する。

