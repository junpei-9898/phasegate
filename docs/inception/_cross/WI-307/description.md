---
id: WI-307
type: story
severity: high
status: tested
affects: [ci-governance, regression-suite, harness-api, world-model, attestation]
source: internal
---

# WI-307: World Model production-ready CI integration

<!-- @work-item-id WI-307 -->

## 背景

WM-20までに`L2-017` / `L3-008`、WM-21〜23でSessionStart、commit-msg reflection、attestation v2が実装された。一方、self-repo CIと配布`aidlc-gate` templateはWorld derive、決定性確認、attestation v2 produce / verifyを明示的な順序で実行しておらず、README / CLI guideにはvalidator未登録という旧状態が残る。

CI smokeで、warning-only validatorを含む`phasegate:ci-check --json`がtop-level `allPassed: true`とitem-level `passed: false`を同時に公開し、attestationの正しいINV-1検査を失敗させる潜在契約欠陥が顕在化した。WI-260はseverity-aware aggregateを導入したが、public item projectionを同じpolicyへ揃えていなかった。

## 目的

- CIをtest、matrix生成、World derive / authoritative L3、attestation / integrity verificationのtrust chainへ整列する。
- self-repoでpure `world:derive --json`を二回実行し、byte-identicalであることをCIで固定する。
- 配布`aidlc-gate`へWorld有効projectだけが同じWorld段階を実行する条件付きcontractを追加する。
- regression-suiteが3つの`world:*` commandのcatalog、JSON envelope、exit 0 / 1 / 2をprocess境界で固定する。
- public docsを登録済みenforcement、SessionStart、attestation v2を含むproduction-ready状態へ更新する。
- ci-checkのpublic aggregateとper-validator結果を同じwarning policyへ揃え、attestationがseverity規則を複製せずv2 evidenceを生成できるようにする。

## 受け入れ基準

- self-repo CIは`pnpm test`の後にmatrixを生成し、World derive二重一致、L3、attestation v2 produce / verify、integrity verifyの順に実行する。
- 二回のderiveはgenerated reportを書かず、stdout bytesとexit codeを比較し、不一致またはblocking resultでCIを失敗させる。
- bundled `aidlc-gate`はconfigの`world.enabled === true`の場合だけWorld deriveを実行し、false / absentなら従来projectを壊さずskipする。config parse failureはskipへlaunderしない。
- regression-suite testは`KNOWN_HARNESS_COMMANDS`の3 command存在、`phasegate-world-cli/v1` envelope、代表的なexit 0 / 1 / 2を実CLIで検証する。
- README / README.ja / CLI guideは`L2-017` / `L3-008`登録済み、self-repo dogfood、SessionStart bounded summary、attestation v2 root pinを正しく説明する。
- H17-19をtestと同じ着地で`required`として登録し、matrix / L2 / L3 / check-readyをgreenに保つ。
- `npm pack --dry-run`でbundled CI template、World / attestation schema、guideがpackageに含まれる。
- `failOnWarning:false`ではwarning-only itemをpublic `passed:true`へ射影しつつwarning diagnosticsを保持する。`failOnWarning:true`では同じitemをfailのまま保持する。
- self-repoの`phasegate:attest --require-pass --json`と生成物のverifyがexit 0となり、v2 `worldSnapshotRoot`を含む。

## 非目標

- 新しいWorld command、validator ID、schema versionの追加
- `consistency-check`（scheduled L4）やagent-context-refresh workflowへのWorld L3段階の追加
- disabled consumer projectでのWorld enforcement強制
- attestation v1 / v2 invariant、baseline、waiver、WCR policyの変更

## Story lifecycle

H17-19は本WIでcatalog登録し、同一着地のcontract / integration testで`required`とする。Phase Cに未実装Storyは残さない。
