---
adr_id: "032"
title: "World node identity と fragment locator"
status: Proposed
date: 2026-07-16
---

# World node identity と fragment locator

<!-- @work-item-id WI-282 -->

## Context

World Model は snapshot 間で同じ node を追跡し、constraint endpoint の missing / changed / duplicate を区別する必要がある。content digest をidentityにすると編集のたびにnodeが入れ替わり、line numberやheading textをidentityにすると文書の並べ替えや見出し修正がrenameとして誤検出される。

現行実装には複数のidentity / locator慣行がある。

- traceability-modelは`WI-\d+` directoryとdescription frontmatter `id` の一致、inception全体の重複を検証し、`legacy_id`を保持する。
- StoryIdは`HXX-XX` / `HF\d+-XX`、WorkItem frontmatter parserはmigration互換IDも読む。
- `ProjectRelativePath`はproject-relative POSIX pathを表し、absolute path、backslash、`..`を拒否する。
- matrixのTestReferenceは`filePath`, `testType`, optional `testName`, optional `binding`を持ち、dedup時にmissing bindingを`file`へ正規化する。
- `@work-item-id`はカンマ / 空白区切りの複数参照を表し、`@attestation`はcoverage_reportのStory scope参照をline locator付きで表すが、いずれもannotation occurrence自身のstable IDを持たない。
- integrity manifestはproject-relative pathをSHA-256へpinし、include / exclude globでtargetを宣言する。

ADR-031はproductをcanonical、inceptionをproposal / deltaとして別artifactに保ち、design document / source / generated artifact / external declarationのkindを分離すると決めた。本ADRはこの非同一性を保ったまま、node identity、fragment locator、migrationを決める。

## Decision

### 1. Versioned World Node ID schemaを採用する

全World IDは`pgw:v1:` prefixを持つ。ID schema versionはextractor / ruleset / snapshot schema versionとは独立に管理する。

可変componentはURI percent-encoded UTF-8を使う。pathはexisting `ProjectRelativePath`と同じlexical contractで正規化し、各segmentをencodeして`/`を保持する。case folding、Unicode normalization、symlink resolutionはidentity生成では行わない。

ID形式:

| node | ID |
|---|---|
| Artifact | `pgw:v1:artifact:<artifact-kind>:<corpus-role>:<path-key>` |
| SourceFile | `pgw:v1:source-file:<path-key>` |
| explicit Fragment | `pgw:v1:fragment:<corpus-role>:<declared-key>` |
| legacy whole-file Fragment | `pgw:v1:fragment:legacy:<artifact-kind>:<corpus-role>:<path-key>` |
| WorkItem | `pgw:v1:work-item:<WI-ID>` |
| TestReference | `pgw:v1:test-reference:<story-id>:<ac-id>:<binding>:<test-type>:<path-key>:name:<name-key>` |
| ExplicitClaim | `pgw:v1:explicit-claim:<declared-key>` |
| Constraint | `pgw:v1:constraint:<declared-key>` |
| Snapshot | `pgw:v1:snapshot:sha256:<64-lowercase-hex>` |

`DeclaredKey`は`[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*`とし、人が明示する。headingやpathから自動slug化しない。

Artifact kind / corpus roleはADR-031に従う。SourceFileはsource kind Artifactのspecializationであり、同じfileにgeneric Artifact nodeを二重生成しない。Snapshot hashの入力bytesはADR-033が決める。

### 2. File identityとFragment identityを分離する

Artifact / SourceFile IDはproject-relative pathをidentityに含む。rename / moveはold nodeのmissingとnew nodeのaddedとして観測し、同じdigestからrenameを推論しない。

explicit Fragment IDは`corpus-role + DeclaredKey`であり、artifact path、heading text、heading level、document order、line number、content digestを含まない。同じcorpus role内でmarker keyが維持されれば、file move、heading rename、level変更、並べ替え後も同じFragmentである。

Fragment locatorはartifact ID、marker / heading / start / end line、heading level、表示用heading textを持つ。locatorはsnapshotごとに変化でき、identityではない。

### 3. Markdown fragment markerを定義する

```markdown
<!-- @world-fragment-id world-model.ownership -->
## Ownership
```

- markerは対象ATX heading直前のcontiguous metadata preludeに置く。preludeは`@world-fragment-id` / `@world-reflects` / `@work-item-id`の単独HTML comment行だけで構成し、空行やproseを挟まない。headingはpreludeの直後に置く。
- fenced code / inline code / example comment内部は抽出しない。
- 一つのheadingにmarkerは1件。
- fragment rangeはheadingから次のmarker-bound heading直前、またはEOFまで。
- heading text / orderはlocatorでありidentityに使わない。
- 同じcorpus role内のduplicate keyはhard extraction diagnosticとし、winnerを選ばない。

markerより前のunmarked contentもArtifact全体として観測する。Fragmentがないことをcontent omissionにはしない。

### 4. Legacy whole-file fallbackを段階移行する

明示markerを持たないMarkdown Artifactには、Artifact tupleから導出したlegacy whole-file Fragmentを1件生成する。

移行state:

1. **whole-file** — markerなし。fallbackを互換targetとして観測する。
2. **mixed** — marker導入後、completion markerがない間はexplicit fragmentsとcompatibility fallbackを併存させる。新規declarationからfallbackへの参照は禁止する。
3. **explicit** — legacy inbound referenceが0であることをmigration gateで確認し、YAML frontmatterがあればその直後、なければ最初のheadingより前に`<!-- @world-fragment-migration complete -->`を追加する。次snapshotからfallbackを除外する。

whole-file constraintをone fragmentへ自動aliasしない。どの意味境界へ分割するかは機械では判断できないため、人が一つ以上のexplicit Fragment IDへretargetする。

completion markerがexplicit fragmentなしで宣言された場合、またはlegacy inbound referenceが残る場合はdiagnosticとする。fallback emissionはcorpus上のmarkerだけで決め、constraint declarationの有無に依存させない。

### 5. 既存owner IDとannotationをそのまま尊重する

- WorkItem nodeはtraceability-modelが解決したcanonical `WI-\d+`をpayloadにする。`legacy_id`はaliasであり別nodeを作らない。
- TestReference IDはmatrix ownerのtuple `(storyId, acId, binding ?? "file", testType, filePath, testName)`から作る。`generatedAt`、array index、line numberを含めない。
- `@work-item-id`はWorkItem provenance / reflection reference factへ一IDずつ展開する。
- `@attestation`はStory scope evidence reference factとして観測する。
- annotation line / occurrence ordinalからstable ExplicitClaim IDを生成しない。future ExplicitClaimはexternal declarationにrequired `claimId`を持つ。
- Constraintもrequired `constraintId`からidentityを作り、violation fingerprintとは分離する。
- integrity manifestのpath / glob / digestはtarget / claim payloadであり、node identityにはしない。

### 6. Rename / move / deleteを明示的に扱う

- path-based Artifact / SourceFile、matrix-derived TestReferenceのkey componentが変わればold missing + new added。
- explicit Fragmentは同じcorpus roleとDeclaredKeyを保つmove / heading変更ではidentityを維持する。
- productからinception、またはinceptionからproductへのrole変更は別identity。
- deleteされたnodeはcurrent snapshotから消え、参照endpointはmissingになる。
- content digest一致、類似heading、同じtest bodyからsuccessorを推論しない。

continuityが必要ならexplicit alias declarationを使う。

### 7. Aliasはidentityでなくsingle-hop resolution ruleとする

Alias declarationは`aliasId`, `canonicalId`, `reason`, `workItemId`を必須とする。正式file name / schemaはADR-037で決める。

- aliasは新nodeを作らず、reference resolutionをcanonical nodeへ導く。
- targetはcanonical IDでなければならず、alias chain / cycleを禁止する。
- 一つのaliasIdから複数targetを禁止する。
- resolutionは`resolved-via-alias` factを残し、renameを不可視化しない。
- Fragment aliasは同じcorpus role内だけ。product / inceptionをaliasで同一化しない。
- traceability-model `legacy_id`はprovider-owned aliasとして投影する。
- digest一致からaliasを自動生成しない。

### 8. Duplicate IDはno-winnerで扱う

WorkItem、Fragment、ExplicitClaim、Constraint、TestReferenceなど同一canonical IDが複数locatorへ解決した場合、extractorはどれかを採用せず`duplicate-node-id` diagnosticを返す。array orderやfilesystem列挙順でwinnerを選ばない。

duplicateを含むsnapshotはidentity-completeではない。どのlayerでblockingするかはvalidator-system所有であり、ADR-034以降で決める。

### 9. ProposalとcanonicalをWorkItem hubと明示relationで接続する

現行`@work-item-id`からartifact-level provenanceを作る。

```text
inception proposal Artifact ──proposed-by──> WorkItem
WorkItem ──reflected-in──> product canonical Artifact / Fragment
```

これは同じWIのprovenanceであり、fragment-to-fragment exact mappingではない。

exact mappingが必要なcanonical headingでは次を記述する。

```markdown
<!-- @world-fragment-id world-model.ownership -->
<!-- @world-reflects inception:world-model.ownership -->
<!-- @work-item-id WI-282 -->
## Ownership
```

`@world-reflects`はrepeatableで、targetは`<corpus-role>:<declared-key>`。v1 source roleは`inception`、current fragmentは`product`でなければならない。World edgeは`proposal --reflected-as--> canonical`方向に作る。

same key、heading、order、digestからreflectionを推論しない。target不在、role不正、duplicate targetはdiagnosticとする。

### 10. ADR-032 scopeの未決事項へ回答する

#### 明示fragment IDのMarkdown記法

`<!-- @world-fragment-id <DeclaredKey> -->`を採用し、ATX heading直前のcontiguous metadata preludeからbindする。HTML commentにすることでrendered proseを汚さず、既存`@work-item-id` / `@attestation`と同じ機械可読annotation慣行に合わせる。heading text / orderはidentityにしない。

#### legacy whole-fileからfragmentへのmigration

whole-file → mixed → explicitのratchetを採用する。marker導入時にfallbackを即削除せず、completion markerがない間はcompatibility nodeとして残す。新規fallback参照を禁止し、人がconstraint / pinを明示fragmentへretargetする。inbound reference 0を確認後に`<!-- @world-fragment-migration complete -->`を追加し、次snapshotでfallbackを除去する。一対一aliasや意味的自動分割は行わない。

## Consequences

### Positive

- prose編集やheading並べ替えでconstraint endpoint identityが不要に変わらない。
- path-based file eventとlogical fragment continuityを区別できる。
- product / inceptionのprovenanceを維持し、reflectionだけを明示factにできる。
- current annotationのlocatorをstable identityに偽装しない。
- legacy corpusを一括marker化せず段階導入できる。

### Negative / Trade-off

- marker keyのproject-wide管理とduplicate検出が必要になる。
- path-based Artifact / SourceFileはrename時にidentityが変わり、continuityにはalias declarationが必要。
- mixed migration中はexplicit fragmentとcompatibility whole-file fragmentが併存する。
- existing annotationだけではfragment-level exact reflectionやstable ExplicitClaimを表せない。

## Alternatives

- **content digestをnode IDにする** — 内容変更がdelete + addになりstalenessを追えないため不採用。
- **heading text / heading pathをFragment IDにする** — rename / reorderでidentityが変わり、同名headingも衝突するため不採用。
- **line number / occurrence ordinalをannotation claim IDにする** — 無関係な行挿入でidentityが変わるため不採用。
- **same key / digestでproposalとcanonicalを自動接続する** — ADR-031のcorpus role分離と「意味的伝播を機械で主張しない」原則に反するため不採用。
- **marker導入時にlegacy fallbackを即削除する** — existing constraint endpointを一斉にmissingへするため不採用。
- **whole-file fallbackを一つのfragmentへ自動aliasする** — one-to-manyの意味分割を機械が決めることになるため不採用。

## 関連要件・文書

- `docs/inception/_cross/WI-280/delivery_plan.md` §1, §3 WM-02, §7 ADR-032, §10
- `docs/inception/_cross/WI-281/logical_design.md`
- `docs/inception/_cross/WI-282/description.md`
- `docs/inception/_cross/WI-282/domain_model.md`
- `docs/inception/_cross/WI-282/logical_design.md`
- ADR-027（成果物駆動の状態導出）
- ADR-030（明示参照と再導出）
- ADR-031（ownership、artifact kind、product / inception corpus role）
