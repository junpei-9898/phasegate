---
id: WI-297
type: story
severity: high
status: drafted
affects: [world-model]
source: internal
---

# WI-297: Synthetic World mutation E2E

<!-- @work-item-id WI-297 -->

## 背景

WM-12〜15でConstraint evaluation、obligation derivation、`world:derive` CLIが接続された。WM-16ではCP-3のmutation集合をrepository-shaped fixtureで固定し、正常系、構造違反、policy境界、determinism、保存report非信頼をprocess / filesystem境界で再現する。

## スコープ

- base fixtureは明示constraintが全て解決し、structural obligation 0件、exit 0とする。
- missing、claimant / premise drift、deleted / renamed legacy Fragment、duplicate ID、stale matrix reference、malformed / new constraint、new unpinned claim、waiver expiryを独立mutationとして表現する。
- baseline/current Snapshot pairをapplicationへ明示できる比較入力を追加する。通常CLIはbaselineを渡さず、ADR-034どおりinitial missingをWCR-002として維持する。
- test clockをcompositionへ注入できるようにし、waiverのexclusive expiryを固定UTC dateで検証する。
- persisted obligation reportは入力にせず、存在・改竄・削除でderive bytes / exit codeが変わらないことを検証する。

## 受け入れ基準

- 各blocking mutationは期待する`WCR-NNN`、exact violation fingerprint、classification、exit 1を返す。
- unknown constraint schemaはtrustworthy resultを作らずexit 2とする。
- valid single-hop aliasは`resolved-via-alias`として解決され、findingを作らないためexit 0とする。
- waiverは`policyAsOfDate < expiresOn`で`waived` / exit 0、同日で`expired-waiver` + `new-structural` / exit 1となる。
- 同一fixtureのJSON outputは2回byte-identicalである。
- clean `.harness`、stale reportあり、report手編集後、report削除後でpure derive resultが一致する。
- H17-11をtestと同じ着地で`planned -> required`へ進める。

## スコープ外

- self-repo adoption baselineとsemantic debt inventory（WM-17）
- L2/L3 validator登録（WM-19/20）
- CLIへのbaseline path / policy date flag追加

