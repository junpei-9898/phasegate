# WI-294 Logical Design: Schema admission and repositories

<!-- @work-item-id WI-294 -->

## Boundary

```text
application-owned repository port
  <- infrastructure filesystem adapter
       -> strict UTF-8 / JSON parse
       -> versioned envelope admission
       -> record mapper
       -> domain declarations | explicit invalid result
```

application contractは`absent | loaded | invalid`を区別する。`absent`だけがcanonical empty valueを持ち、`invalid`はvalueを持たない。これによりunknown schemaやparse failureをemptyへlaunderしない。

## Files and schemas

| Kind | Root file | schemaVersion | Contract |
|---|---|---|---|
| constraints | `phasegate.world-constraints.json` | `phasegate-world-constraints/v1` | `docs/contracts/world-constraints.schema.json` |
| adoption baseline | `phasegate.world-baseline.json` | `phasegate-world-adoption-baseline/v1` | `docs/contracts/world-baseline.schema.json` |
| waivers | `phasegate.world-waivers.json` | `phasegate-world-waivers/v1` | `docs/contracts/world-waivers.schema.json` |
| semantic debts | `phasegate.world-debts.json` | `phasegate-world-debts/v1` | `docs/contracts/world-debts.schema.json` |

constraints schemaはenvelopeとrecord `$defs`を分ける。envelopeがsupportedならrecord単位のschema / domain errorをWCR-001 admissionへ変換できる。baseline / waiver / debtのmalformed inputはpolicy input全体をinvalidとする。

## Ports and adapters

- `ConstraintDeclarationRepositoryPort`: constraints / aliasesのloadとatomic replace
- `AdoptionBaselineRepositoryPort`: optional singleton baselineのloadとatomic replace
- `WaiverDeclarationRepositoryPort`: waiver setのloadとatomic replace
- `SemanticDebtRepositoryPort`: debt setのloadとatomic replace
- filesystem adapter: project-relative canonical path、strict read、schema loader、mapper、temp-file + same-directory rename

portはfilesystem path、Ajv error、Node errorを公開しない。diagnosticはstable code、relative path、message、record locatorを持つplain application DTOとする。

## Duplicate handling

- constraint ID: 同一IDの全candidateをrecord集合から除外し、各candidateをWCR-001入力へする。
- alias source: 同一sourceの全candidateをalias集合から除外しdiagnosticを返す。
- baseline entry fingerprint: documentをinvalidにする。
- waiver IDまたはtarget fingerprint: 衝突candidateを採用せずdocumentをinvalidにする。
- debt ID: 衝突candidateを採用せずdocumentをinvalidにする。

## Atomic replacement

adapterは同一directoryへcomplete JSONをtemporary fileとしてwriteし、write成功後にcanonical fileへrenameする。schema admissionに失敗するcandidateはwriteしない。mutationを実行するuse caseと`--apply`判断はWM-15が所有する。

## Composition

WM-13はrepository classを実装するが、derive / pin use caseへはまだ配線しない。WM-15でcomposition rootが4 portをbindする。CLI、main dispatch、public indexは変更しない。
