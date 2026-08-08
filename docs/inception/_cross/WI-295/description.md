---
id: WI-295
type: story
severity: high
status: tested
affects: [world-model]
source: internal
---

# WI-295: Fingerprint と immutable obligation derivation

<!-- @work-item-id WI-295 -->

## 背景

WM-12はpolicy-free WCR finding、WM-13はversioned control repositoryを実装した。WM-14ではADR-035に従い、findingのsemantic evidenceからstable fingerprintを作り、baseline / waiver / semantic debtをpolicy inputとして毎回immutable obligation reportを再導出する。

## スコープ

- `phasegate-world-violation-fingerprint/v1` preimageとSHA-256 fingerprint
- duplicate candidate digestを含むWCR endpoint evidenceの補完
- `phasegate-world-policy-inputs/v1` digest
- policy inputを含む`phasegate-world-evaluation/v1` evaluation ID再導出
- adopted / new / repaid / invalid declaration / waived分類
- expired waiver、ruleset mismatch等のpolicy diagnostic
- 4 collectionのimmutable obligation reportとpublished schema
- pure deriveとoptional atomic report writeの分離
- composition-rootへのrepository / writer / derive use case配線
- H17-09を`planned -> required`へ進め、同じ着地のtestでAC-1〜6をbindする

## スコープ外

- validator-systemのseverity / blocking / exit code適用
- `world:derive` / `world:pin` presentation、main dispatch、CLI flags（WM-15）
- adoption baselineへの新規entry追加workflow（WM-17）
- persisted reportのreadまたはWorld corpusへの再投入

## 受け入れ基準

- fingerprintはADR-035の10 field preimageだけをhashし、locator、message、evaluation ID、policyを含めない。
- duplicate findingはcandidate cardinalityとsorted content-digest multisetをobserved evidenceへ含める。
- waiverが0件ならpolicy dateを`null`に正規化し、waiverがあればvalid explicit dateを必須にする。
- invalid policy repository resultはempty fallbackせず、report / policy digestを生成しない。
- same-ruleset baselineで`B∩V`, `B−V`, `V−B`を毎回導出し、repaid stateを保存しない。
- WCR-001は`invalid-declaration`でbaseline / waiverを適用しない。
- active exact waiverだけを`waived`にし、exclusive expiry当日以降は元分類へ戻してdiagnosticを出す。
- reportは4 collectionをstable sortし、`generatedAt`を持たずbyte-identicalにserializeする。
- write modeはpure modeと同じreport bytesをatomic writeし、保存済みreportを入力にしない。

## Coverage lifecycle 運用

WI-292のratchetに従い、本WIの実装testと同じ着地でH17-09を`planned -> required`へ進める。以後`required -> planned`へ戻さない。
