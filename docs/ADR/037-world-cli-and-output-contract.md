---
adr_id: "037"
title: "World CLI と output/persistence contract"
status: Proposed
date: 2026-07-16
---

# World CLI と output/persistence contract

<!-- @work-item-id WI-284 -->

## Context

World Modelはread-only inventory、constraint pin更新、obligation導出という異なる副作用境界を持つ。command名、output、exit code、control file、generated reportを先に固定しないと、CLI実装ごとに暗黙writeや別schemaが生まれ、ADR-031のartifact lifecycleとADR-035の「report手編集は判定を変えない」が崩れる。

既存CLIは`main.ts`のtop-level `switch`と、sorted `KNOWN_HARNESS_COMMANDS`の集合一致をconformance testで強制する。capability namespaceには`phasegate:*`, `p2:*`, `ci:*`, `integrity:*`, `regression:*`があり、`p2:check-freshness`等は独立top-level commandである。validation commandは概ね0=pass、1=domain / gate failure、2=usage / config / execution failureを使い、`--json`をmachine-readable outputに使う。

既存generated artifactの配置は二系統ある。

- `.harness/requirement-test-matrix.json`, `.harness/attestation.json`, `.harness/lesson-artifacts/**`等、machine consumer向け再生成物は`.harness/`。
- phase / regression等のhuman reportはresolved `reporting.outputDir`または`reports/`。

`.gitignore`は`.harness/`と`reports/`の両方を除外する。World obligation reportはtooling / operator向けのmachine-readable derived cacheであり、review対象のcontrol inputではないため、matrix / attestation側の慣行に合わせる。

config-foundationは`phasegate.config.json`をAJV schemaで検証し、presetとsource documentをdeep mergeしたresolved configをconsumerへ渡す。schemaはtop-level `additionalProperties: false`である。root control fileには`phasegate.config.json`, `phasegate.integrity.json`という`phasegate.<capability>.json`慣行がある。

本ADRはADR-031〜036のcontractをCLI / persistenceへ写像し、Phase 0のWorld意思決定を完結させる。

## Decision

### 1. 三つの`world:*` top-level commandを固定する

次をcanonical public commandとする。

```text
world:inspect
world:pin
world:derive
```

`phasegate world inspect`のようなnested subcommandや`phasegate:world:*` aliasは作らない。既存colon namespaceと同様、実際の呼び出しは`phasegate world:inspect`等になる。

実装時は三commandを同じWIで次へ追加し、集合一致を保つ。

- `scripts/harness/main.ts` help / switch dispatch
- `scripts/harness/harness-api/domain/value-objects/known-harness-commands.ts`
- known-command conformance / help / E2E tests

#### `world:inspect`

corpusを読み取り、World snapshot、node / edge count、corpus role / artifact kind、extraction diagnostics、`corpusRoot`を表示するread-only command。

- control declarationやreportを書かない。
- explicit constraintがなくても実行できる。
- hard extraction diagnosticがなければexit 0。
- snapshotを生成できたがduplicate ID等のhard diagnosticがあればexit 1。
- config / schema / I/O / hashing failureでsnapshotを生成できなければexit 2。

#### `world:pin`

一意に解決したconstraint endpointのcurrent digestから、ConstraintRecord pin candidateを作るcommand。

- defaultはpreview-onlyで、candidate / diffをstdoutへ出す。
- `--apply`を明示した場合だけ`phasegate.world-constraints.json`をatomic updateする。
- missing / duplicate / ambiguous alias endpoint、malformed declarationではwriteせずexit 1。
- unknown schema、invalid config、I/O / hashing failureはexit 2。
- baseline、waiver、semantic debt、obligation reportを更新しない。
- Git add / commitやbaseline adoptionを自動実行しない。

`--apply`はreview対象external declarationへのmutationであり、`--write` report modeとは区別する。

#### `world:derive`

current snapshotとexternal declarationsからWCR evaluation、fingerprint、policy classification、obligation reportを再導出するcommand。

- defaultはpure/read-only。stdoutへ結果を出すだけでfilesystemを変更しない。
- `--write`を明示した場合だけraw obligation report JSONをpersistする。
- `--out <project-relative-path>`は`--write`と同時指定する。`--out`単独はusage error exit 2。
- default write targetは`.harness/world-obligations.json`。
- reportはtemp file + atomic renameで置換し、partial fileを残さない。
- current blocking obligation / cleanup-required policy findingがなければexit 0。
- derive成功かつblocking resultがあればexit 1。
- unknown schema、invalid config / policy input、canonicalization / hashing / I/O failureでtrustworthyなevaluationを作れなければexit 2。

adopted legacy / active waiver / declared semantic debtが存在するだけではexit 1にしない。ADR-035のblocking mappingをvalidator-system adapterが適用する。

### 2. Human / JSON output contractを統一する

三commandは次を受理する。

```text
--format human|json
--json
```

`--json`は`--format json`のalias。両方を矛盾する値で指定した場合はexit 2とする。defaultはTTY / non-TTYに依存させず`human`。

#### stdout

- primary resultだけを出す。
- human modeは固定section順・stable ID順でsummary / findings / next actionを表示する。
- JSON modeは一つのJSON documentだけを出し、progress、ANSI color、warning proseを混ぜない。
- exit 1のdomain / gate resultもstdoutへ完全なresultを出す。
- `world:derive --write`のstdoutはderive resultとwritten pathを返すが、persist fileはCLI envelopeでなくraw obligation reportとする。

JSON envelope:

```text
{
  schemaVersion: "phasegate-world-cli/v1",
  command: "world:inspect" | "world:pin" | "world:derive",
  ok: boolean,
  exitCode: 0 | 1 | 2,
  data: command-specific DTO | null,
  diagnostics: sorted diagnostic DTOs
}
```

`generatedAt`を入れない。diagnosticsはcode、stable subject ID、PathKey、line、canonical payloadでsortする。

#### stderr

- human modeのusage error、invalid flag、unknown / unsupported schema、unexpected execution failureを出す。
- optional progress / verbose logを将来追加する場合もstderrだけを使う。
- expected WCR finding、adopted debt、waiver、semantic debtをstderrへ重複出力しない。
- JSON modeのexpected errorはJSON envelopeをstdoutへ出す。stderrはJSON parserを必要としないunexpected process-level failureの一行だけに限定する。

exit code:

| code | meaning |
|---|---|
| 0 | command completed and no blocking / hard diagnostic condition |
| 1 | command completed enough to report a domain, structural, or policy failure |
| 2 | invocation、config、schema、I/O、canonicalization、hashing等によりtrustworthyなresultを作れない |

process signal等のplatform exitはこの表の外とする。

### 3. Control declarationの正式file nameを固定する

project rootのGit-tracked external declarationとして次を採用する。

| purpose | canonical file | schemaVersion |
|---|---|---|
| constraints / pins / aliases / explicit claims | `phasegate.world-constraints.json` | `phasegate-world-constraints/v1` |
| adoption baseline | `phasegate.world-baseline.json` | `phasegate-world-adoption-baseline/v1` |
| waivers | `phasegate.world-waivers.json` | `phasegate-world-waivers/v1` |
| explicit semantic debts | `phasegate.world-debts.json` | `phasegate-world-debts/v1` |

`phasegate.<capability>.json`というroot control file慣行に従い、既存`.phasegate/baseline.json`との衝突を`world-` qualifierで避ける。

- constraints file不在はempty explicit declaration set。global ID uniqueness等のimplicit WCRは引き続き評価する。
- baseline / waiver / debt file不在はそれぞれcanonical empty policy input。
- fileが存在する場合、`schemaVersion`は必須。
- unknown / unsupported schemaVersionはemptyとして扱わずfail-closed exit 2。
- supported schema内のmalformed constraintはADR-034 `WCR-001`としてexit 1。document envelope自体を解釈できない場合はexit 2。
- duplicate record ID / fingerprintでwinnerを選ばない。
- input array orderやJSON formattingはsemantic identityに使わない。

schemaは実装WIで次へ配置する。

```text
docs/contracts/world-constraints.schema.json
docs/contracts/world-baseline.schema.json
docs/contracts/world-waivers.schema.json
docs/contracts/world-debts.schema.json
docs/contracts/world-obligation-report.schema.json
```

schemaはpublished packageの`docs/contracts/` contractとして扱う。ADR-037ではschema fileをまだ作成せず、constraint / policy schemaはWM-13、report schemaはWM-14、debt schemaは必要に応じてWM-17のimplementation scopeに残す。

### 4. Obligation reportは`.harness/`へ非追跡で保存する

canonical default path:

```text
.harness/world-obligations.json
```

schemaVersion:

```text
phasegate-world-obligation-report/v1
```

理由:

- matrix / attestation等のmachine-consumed regenerated artifactと同じlifecycle。
- repositoryの`.gitignore`が`.harness/`を既に除外する。
- `reports/`のhuman-oriented reporting outputとreview対象のroot declarationsから分離できる。
- local toolingが固定defaultで発見できる。

Git tracking policy:

- default reportをcommitしない。
- `world:derive --write`は`.gitignore`やGit indexを変更しない。
- persisted reportはcache / inspection convenienceであり、L2 / L3 / attestation / session-startが正本として信頼しない。
- L3はclean corpusとcontrol declarationsから再導出する。
- report削除・改竄は次のderive result / gateを変えない。
- humanが`reports/`へ必要なら`--write --out reports/<name>.json`を明示できるが、generated artifact semanticsと非追跡方針は変わらない。

report path、JSON whitespace、written path、mtimeを`corpusRoot`, `constraintRoot`, `evaluationId`, `violationFingerprint`へ含めない。

### 5. `world:derive`のpure modeとwrite modeを分離する

| mode | invocation | filesystem effect | intended use |
|---|---|---|---|
| pure | `world:derive` | none | local review、L2/L3 authoritative re-derivation、CI |
| write default | `world:derive --write` | atomic write to `.harness/world-obligations.json` | local cache、non-authoritative inspection |
| write explicit | `world:derive --write --out <path>` | atomic write to explicit project-relative path | diagnostic export |

pure modeとwrite modeは同じdomain use case / canonical serializerを使う。同一inputsならraw obligation report bytesは同じでなければならない。write modeだけでfinding、classification、exit codeが変化してはならない。

report repositoryをevaluation input portへ接続せず、read-after-writeで判定しない。`--write`失敗はexit 2とし、stdout / previous complete reportを成功扱いしない。

### 6. Top-level config keyを`world`とする

config-foundation v2 / v3 schemaへ、lower camelCaseの既存top-level慣行に合わせて`world`を追加する。`worldModel`、`world-model`、`worldConstraints` aliasは作らない。

resolved contract:

```text
world: {
  enabled: boolean
  corpus: {
    productRoots: string[]
    inceptionRoots: string[]
    adrRoots: string[]
    sourceRoots: string[]
    include: string[]
    exclude: string[]
  }
  inputs: {
    matrixPath: string
    attestationPath: string
    integrityManifestPath: string
  }
  declarations: {
    constraintsPath: string
    baselinePath: string
    waiversPath: string
    debtsPath: string
  }
  output: {
    obligationReportPath: string
  }
  sessionStart: {
    enabled: boolean
    maxItems: integer
    maxChars: integer
  }
}
```

全pathはproject-relative POSIX path。absolute、backslash、`..`をrejectする。root role overlap、同一pathの複数corpus role、case-fold collisionはsilent mergeせずconfig / extraction diagnosticにする。

`world.enabled`はautomatic validator / hook integrationを制御し、Phase C rolloutのbackward compatibilityのためdefault `false`。explicit `world:*` commandはL4 explicit executionと同様、`enabled: false`でも実行する。

### 7. Config不在時もcanonical defaultsで明示commandを実行する

`phasegate.config.json`が見つからない場合、explicit `world:*` commandは次のresolved defaultsを使う。

```text
world.enabled = false
world.corpus.productRoots = ["docs/product"]
world.corpus.inceptionRoots = ["docs/inception"]
world.corpus.adrRoots = ["docs/ADR"]
world.corpus.sourceRoots = ["scripts/harness"]
world.corpus.include = ["**/*"]
world.corpus.exclude = []
world.inputs.matrixPath = ".harness/requirement-test-matrix.json"
world.inputs.attestationPath = ".harness/attestation.json"
world.inputs.integrityManifestPath = "phasegate.integrity.json"
world.declarations.constraintsPath = "phasegate.world-constraints.json"
world.declarations.baselinePath = "phasegate.world-baseline.json"
world.declarations.waiversPath = "phasegate.world-waivers.json"
world.declarations.debtsPath = "phasegate.world-debts.json"
world.output.obligationReportPath = ".harness/world-obligations.json"
world.sessionStart.enabled = true
world.sessionStart.maxItems = 5
world.sessionStart.maxChars = 2000
```

defaultでarchiveやlegacy文書をsilent除外しない。extractorがsupported artifactを分類し、unsupported fileはversioned selection rule / diagnosticで扱う。

matrix / attestation / integrity manifestはoptional provider inputである。default pathにfileが存在しないことだけでconfig failureにせず、`not-present` observation / diagnosticとして保持する。存在するfileがowner schemaに反する場合はsilent omissionせずhard diagnosticとし、そのendpointを要求するconstraintはmissing / invalid evidenceとして評価する。

configが存在する場合はraw JSONを各commandが直接読むのではなく、config-foundation `LoadResolvedConfigUseCase`とWorld mapperを通す。

- `world` source sectionをpreset / defaultとmergeし、resolved DTOをWorldへ渡す。
- existing resolved `paths.inceptionDocs`を、explicit `world.corpus.inceptionRoots`がない場合のinception rootとして使う。
- existing resolved `paths.designDocs`がdefault product root外なら、explicit product design rootとして追加し、product corpus roleを保つ。
- existing resolved `layers.L3.requirementMatrixPath`を、explicit `world.inputs.matrixPath`がない場合に使う。
- output format / session limitはcorpus / constraint config digestへ混ぜず、ADR-033のscope別relevant config digestへ振り分ける。

config fileが存在するのにinvalid、unknown top-level / field、type mismatch、unsupported config schemaである場合、defaultsへfallbackしない。exit 2でfail-closedにする。

### 8. Phase C validator IDを予約する

現在未使用の次のID / nameを予約する。

| Phase C WI | validator ID | canonical name | responsibility |
|---|---|---|---|
| WM-19 | `L2-017` | `world-constraint-admission` | changed / new claim・pin・constraint declarationのfast-path、WCR-001、unresolved new endpointをfail-closed |
| WM-20 | `L3-008` | `world-constraint-rederivation` | clean corpus / declarationsからauthoritative deriveし、baseline / waiver policyを適用 |

`WCR-NNN`はWorld内部rule IDであり、`L2-017` / `L3-008`はvalidator-system execution identityである。一つのvalidator resultに複数WCR findingを含められる。

本ADRではreservationだけを行う。`ValidatorId`, registry、RunL2 / RunL3、composition-root、presetへの実登録はそれぞれWM-19 / WM-20で行い、登録前の現行runtimeがこれらをrejectする挙動を変更しない。

`world.enabled: false`ではautomatic L2-017 / L3-008 integrationをskipする。explicit `world:derive`は実行できる。default enablementを変更するPhase C rolloutはconfig / preset migrationと同じWIでreviewする。

### 9. SessionStart summaryを5件・2000文字に制限する

WM-21のWorld obligation sectionは、resolved config defaultで次のhard capを持つ。

```text
maxItems = 5
maxChars = 2000
```

- maxItemsは表示するobligation / policy diagnostic entry数。
- maxCharsはWorld section全体のUnicode scalar value数で、header、summary、omission lineを含む。
- blockingを先、次にcleanup-required、adopted / waivedの順とし、同順位はrule ID、constraint ID、fingerprintでsortする。
- char capを超えるentryは途中切断せずentry単位で省略する。
- 省略時は`... <N> more; run phasegate world:derive`を末尾へ入れる。このlineもmaxChars内。
- constraint prose、waiver reason、semantic debt free text、full obligation reportをpromptへ注入しない。stable ID、rule ID、PathKey、classification、countだけを使う。
- repository由来文字列を含める場合は既存untrusted-data fence / neutralizationを使う。
- summaryはcurrent World query / in-process deriveから作り、persisted obligation reportだけを読んで生成しない。cacheが存在してもcurrent deriveと独立照合できない場合は無視する。

`maxItems` / `maxChars`はconfigでより小さくできる。schema上限をそれぞれ20件 / 8000文字とし、0 / negative / over-limitはinvalid configとしてfail-closedする。session hook自体は既存どおりwarn-only / exit 0で、World summary取得失敗はsessionをblockせず短いunavailable lineを出す。authoritative blockingはL2 / L3が所有する。

### 10. Attestation v2 contractはWM-23へ委譲する

attestation v2の`schemaVersion`, `predicateType`, v1 coexistence periodは本ADRで決めない。WM-23がattestation ownerのdomain / schema / backward compatibility testとともに決定する。

本ADRが固定するのは、attestation input default pathと、将来top-level compositionがplain `worldSnapshotRoot`を注入するCLI / config側の境界だけである。attestation v2 schemaをWorld config / obligation reportへ複製しない。

### 11. §10未決事項のdispositionを完結する

| §10 item | disposition |
|---|---|
| fragment ID notation | ADR-032で`@world-fragment-id`に確定 |
| legacy whole-file migration | ADR-032でmixed-mode ratchetに確定 |
| raw prose Unicode normalization | ADR-033で非適用に確定 |
| hashing capability owner | ADR-033でattestation public facadeに確定 |
| World declaration file names | 本ADR §3で確定 |
| obligation report path | 本ADR §4で`.harness/world-obligations.json`に確定 |
| world config key / validator ID | 本ADR §6 / §8で`world`, `L2-017`, `L3-008`に確定 / 予約 |
| initial structural fingerprint count | ADR-031どおりWM-17実測。推測値を置かない |
| semantic debt ID / coverage annotation | ADR-035で確定 |
| attestation v2 schema / coexistence | 本ADR §10どおりWM-23へ明示委譲 |
| session-start limit | 本ADR §9で5件 / 2000文字に確定 |

## Consequences

### Positive

- read-only、reviewed control mutation、generated report writeの副作用境界が明確になる。
- Git-tracked declarationsとignored derived reportを物理的に分離できる。
- JSON stdoutをCI / agentが安定してparseできる。
- config不在の明示inspectionを可能にしつつ、存在するinvalid config / schemaはfail-closedにできる。
- WCR rule IDとvalidator execution IDを混同せずPhase Cへ予約できる。
- session-startへreport全文やfree textを注入せずprompt budgetを制限できる。

### Negative / Trade-off

- rootに4つのWorld control JSON fileが増える。
- `world:pin --apply`と`world:derive --write`で異なるmutation flagを覚える必要がある。
- persisted reportはGit管理されないため、historical comparisonはevaluation IDs / CI artifactsを別途保存する必要がある。
- `world.enabled: false`でも明示commandが動くため、automatic integrationとの違いをdocumentする必要がある。
- reserved validator IDはPhase C実装までcurrent registryではinvalidである。

## Alternatives

- **`phasegate world <subcommand>`にする** — current canonical command registryがtop-level case集合を正本とし、他capabilityがcolon namespaceを使うため不採用。
- **`phasegate:world:*`にする** — `phasegate:*` core harness-api namespaceへWorld capabilityを二重nestするため不採用。
- **deriveをdefault writeにする** — inspection / CIで意図しないworktree mutationを起こすため不採用。
- **obligation reportを`reports/`へ出す** — human reportとmachine cacheを混在させ、matrix / attestationの`.harness/`慣行から外れるため不採用。
- **obligation reportをGit trackする** —手編集 / stale outputをcontrol inputと誤認させ、ADR-035に反するため不採用。
- **既存`.phasegate/baseline.json`をWorld file名として再利用する** — path / SHA-1 hook grandfatherとfingerprint adoptionを混同するため不採用。
- **validator IDをWCR IDと同一にする** — gate executionとindividual structural ruleのidentityを混同するため不採用。
- **session-startへ全obligationを注入する** — prompt budget、free-text injection、stale report依存を生むため不採用。

## 関連要件・文書

- `docs/inception/_cross/WI-280/delivery_plan.md` §1, §3 WM-04, §7 ADR-037, §10
- `docs/inception/_cross/WI-284/description.md`
- `docs/inception/_cross/WI-284/logical_design.md`
- ADR-031（ownership / artifact lifecycle）
- ADR-032（identity / fragment / alias）
- ADR-033（canonical roots / relevant config）
- ADR-034（WCR semantics）
- ADR-035（obligation / baseline / waiver / semantic debt）
- ADR-036（L4-004 coexistence）
- `scripts/harness/harness-api/domain/value-objects/known-harness-commands.ts`
- `scripts/harness/config-foundation/infrastructure/schemas/harness-config-v2.schema.json`
- `scripts/harness/config-foundation/infrastructure/schemas/harness-config-v3.schema.json`
- `docs/contracts/`
