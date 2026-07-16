---
traceability:
  initial_creation: true
---

# Unit定義: world-model

<!-- @work-item-id WI-285 -->

> **Unit ID**: world-model  
> **作成日**: 2026-07-16  
> **Wave**: 4（World Model）  
> **対応ストーリー**: H17-01〜H17-12  
> **Architecture**: Clean Architecture（domain / application / infrastructure / presentation）

---

## 1. 概要

world-modelは、Phasegate repository内のdesign document、source、generated artifact、external declarationをowner Unitのplain DTO / public facadeから観測し、型付き事実、canonical Snapshot、明示的な構造制約評価、immutable obligation reportを提供するfederated read modelである。

このUnitはStory、WorkItem、TestReference、gate evidence、integrity declarationを再定義しない。各概念のownerを維持したままconsumer-owned anti-corruption adapterでWorld-local Node / Edgeへ写像する。validator-systemはgate実行、severity、blocking policyを所有し、world-modelは事実組立とpolicy-free WCR評価を所有する。

## 2. 担当ストーリー

| Story | 実装マイルストーン | 要旨 | 優先度 |
|---|---|---|---|
| H17-01 | WM-06 | Unit非依存の公開SHA-256 capability | Must |
| H17-02 | WM-07 | World domain primitiveとcanonical Snapshot | Must |
| H17-03 | WM-08 | traceability-model plain read facade | Must |
| H17-04 | WM-09 | product / inception / ADR extractor | Must |
| H17-05 | WM-10 | source / test / evidence / integrity extractor | Must |
| H17-06 | WM-11 | graph assemblyと`world:inspect` | Must |
| H17-07 | WM-12 | ConstraintRecordとWCR-001〜008評価 | Must |
| H17-08 | WM-13 | constraints / baseline / waiver / debt repository | Must |
| H17-09 | WM-14 | violation fingerprintとobligation derivation | Must |
| H17-10 | WM-15 | `world:pin` / `world:derive` CLI | Must |
| H17-11 | WM-16 | mutation / determinism E2E | Must |
| H17-12 | WM-17 | self-repo inventoryとadoption baseline | Must |

## 3. 所有する責務

### 3.1 Domain ownership

- `WorldNodeId`、World-local Node / Edge、Artifact / Fragment identity projection
- `Snapshot`、`corpusRoot`、`constraintRoot`、`evaluationId`のcanonical preimage
- `ConstraintRecord`、`NodePin`、WCR-001〜008の構造評価
- `ExtractionDiagnostic`、`ChangeProvenance`、`ViolationFingerprint`
- current evaluationからのobligation report導出

### 3.2 Application ownership

- `BuildSnapshot`、`InspectWorld`、`EvaluateConstraints`、`DeriveObligations`、`PinConstraints`
- provider DTOを受け取るconsumer-owned port
- control declarationのschema admissionとrepository contract
- read-only / write modeを分離したcommand result DTO

### 3.3 Presentation ownership

- top-level command `world:inspect`、`world:pin`、`world:derive`のhandler
- human / JSON output、stdout / stderr、exit code 0 / 1 / 2の契約
- JSON envelope `phasegate-world-cli/v1`

## 4. 所有しない責務

| 責務 | Owner | world-modelでの扱い |
|---|---|---|
| Unit / Story / AC / WorkItem identityとstatus lifecycle | traceability-model | plain read DTOをWorld-local factへ変換 |
| Story / AC / TestReference matrix | nyquist-validation | owner projectionを観測 |
| gate-run evidence、署名、verification | attestation | public evidence DTOを観測 |
| instruction corpus integrity declaration | ci-governance | public declaration DTOを観測 |
| validator registry、layer execution、severity、blockingPolicy | validator-system | policy-free finding DTOを公開 |
| command dispatch / top-level composition | harness-api / composition-root | public handlerを登録・注入してもらう |

world-modelからこれらproviderのdomain / infrastructure / composition-rootへのdeep importは禁止する。

## 5. Corpusとartifact lifecycle

| Artifact kind | Corpus role / lifecycle |
|---|---|
| design document | `docs/product/**`はcanonical、`docs/inception/**`はproposal / delta。digest一致でもdeduplicateしない |
| source | implementation sourceとtest source。TestReference indexとは別artifact |
| generated artifact | matrix projection、attestation projection、Snapshot、obligation report。再生成可能で保存物を一次正本にしない |
| external declaration | constraints、baseline、waiver、explicit debt。人がreviewして採用するversioned control input |

explicit Fragmentは`@world-fragment-id`、proposalからcanonicalへの反映はinception側の`@world-reflects product:<DeclaredKey>`で宣言する。heading text / orderから継続性を推論せず、path renameのcontinuityは明示aliasだけで表す。

## 6. Import / export契約

### 許可する入力

```text
world-model/infrastructure
  -> traceability-model public facade / plain DTO
  -> nyquist-validation public matrix facade / plain DTO
  -> attestation public evidence / SHA facade
  -> ci-governance integrity public facade / plain DTO
```

adapterはconsumerであるworld-modelのinfrastructure層に置く。domain / applicationはconsumer-owned portだけに依存する。provider facadeが存在しない場合はowner Unitで追加し、deep importで代替しない。

### 公開する出力

- Snapshot / Node / Edge / extraction diagnosticのplain DTO
- policy-free WCR evaluation / violation / obligation DTO
- World CLI handlerとcommand result DTO
- validator-system infrastructureが消費するpublic evaluation facade

attestation v2へ将来`worldSnapshotRoot`を渡す場合、top-level compositionがprimitive DTOを注入し、attestationからworld-modelへのimportを作らない。

## 7. Persistence / config / CLI契約

| 種別 | Canonical path / key | 方針 |
|---|---|---|
| Config | `phasegate.config.json`の`world` | automatic gateはdefault false、明示commandは実行可能 |
| Constraints | `phasegate.world-constraints.json` | reviewed external declaration |
| Adoption baseline | `phasegate.world-baseline.json` | 同一rulesetのclosed set。返済削除のみ |
| Waivers | `phasegate.world-waivers.json` | fingerprint、理由、期限、WIが必須 |
| Semantic debts | `phasegate.world-debts.json` | structural obligationと別分類 |
| Obligation report | `.harness/world-obligations.json` | derived、atomic write、既定Git非追跡 |

`world:inspect`は常にread-only。`world:pin`はdefault previewで`--apply`時だけreviewed constraint declarationを更新する。`world:derive`はdefault pureで`--write`時だけgenerated reportを保存する。unknown schema / invalid configはfail-closedのexit 2とする。

## 8. 不変条件

1. World node identityは`pgw:v1` schemaに従い、file identityとfragment identityを分離する。
2. Product / inception、異なるartifact kind、異なるcorpus roleをcontent digestだけで統合しない。
3. Snapshot rootのcanonicalizationはrecursive key sort、owner-defined array semantics、project-relative POSIX PathKey、strict UTF-8、CRLF / CRからLFへの正規化、Unicode非正規化に従う。
4. symlinkをfollowせず、pathはcase-sensitiveに保持し、case-fold collisionをdiagnosticにする。
5. constraint factはtyped directed、評価はendpoint-symmetricとし、両endpoint ID / digestを保持する。
6. `refines`は明示ID宣言だけを事実化し、意味的類似から推論しない。
7. obligation reportと`repaid`を保存stateにせず、current evaluationから毎回再導出する。
8. hashingはattestation public capabilityをconsumer-owned portで利用し、world-modelに新しい`node:crypto`呼び出しを追加しない。
9. generatedAt、absolute path、mtime、Git SHA、report formatting、root自身をroot preimageへ含めない。
10. L2-017 / L3-008はPhase Cまで予約であり、本Unitがvalidator registryへ登録しない。

## 9. 実装境界

実装予定の配置は`scripts/harness/world-model/{domain,application,infrastructure,presentation}/`。WM-06〜17がH17-01〜12を順に実装し、WM-05時点では本書とconstruction設計が実装契約を定義する。validator登録、session-start表示、attestation v2連携は後続Phase CのWIで行う。

## 10. 関連文書

- ADR-031〜037
- `docs/inception/_cross/WI-280/delivery_plan.md`
- `docs/inception/_cross/WI-285/description.md`
- `docs/product/construction/world-model/`
- `docs/product/units/integration_contract.md`
