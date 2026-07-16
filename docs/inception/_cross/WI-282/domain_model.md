# WI-282 Domain Model: World node identity と fragment locator

<!-- @work-item-id WI-282 -->

## 1. Ubiquitous Language

| 用語 | 定義 |
|---|---|
| Node identity | node の論理的同一性。content digest、line number、heading text、現在 path とは分離する |
| Locator | 現 snapshot 内で node の実体を見つける位置情報。identity ではなく変更可能な観測値 |
| Declared key | 人が明示する ASCII key。Fragment / ExplicitClaim / Constraint の安定 ID payload |
| Legacy fallback | 明示 Fragment ID を持たない Markdown artifact を whole-file fragment として観測する互換 identity |
| Alias | 旧 Node ID から現 canonical Node ID への明示的な一方向解決規則。新しい node を作らない |
| Reflection | inception proposal が product canonical に反映されたことを表す明示 relation |

## 2. ID Schema

全 World ID は `pgw:v1:` prefix を持つ。`v1` は ID schema version であり、extractor / ruleset version とは別である。

### 2.1 共通 key

`DeclaredKey`:

```text
[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*
```

- project 全体で、同じ node type / corpus role の中で一意。
- ASCII lowercase のみ。heading text や path から自動 slug 化しない。
- Fragment の推奨形は `<unit>.<concept>`（例: `world-model.ownership`）。

`PathKey`:

- existing `ProjectRelativePath` と同じ lexical contract: project-relative POSIX path、absolute path / `\` / `..` 禁止、`.` と重複 separator を除去。
- path segment を UTF-8 URI percent-encodingし、`/` separator は保持する。
- case folding と Unicode normalization は行わない。

### 2.2 Node ID

| node | ID format |
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

Artifact の `<artifact-kind>` は ADR-031 の `design-document` / `generated-artifact` / `external-declaration`。`<corpus-role>` は `product` / `inception` / `adr` / `generated` / `external` で、kind と許容 role の組を固定する。SourceFile は source kind Artifact の specialization であり、同じ physical file に Artifact node と SourceFile nodeを二重生成しない。

TestReference の `binding` は `ac | file`、`test-type` は `unit | it | scenario`。現行 matrix と同様に missing binding は `file` へ正規化する。`name-key` は test name の URI percent-encoded UTF-8、test name 不在は literal `none` とし、値ありは `value:<encoded-name>` として区別する。

WorkItem の canonical payload は traceability-model が解決した `WI-\d+`。`legacy_id` は alias であり別 WorkItem node を生成しない。Snapshot ID の hash input / canonical bytes は ADR-033 が決める。

## 3. Entities / Value Objects

### WorldNodeId

- `schemaVersion: 1`
- `nodeType`
- type ごとの identity tuple
- 上表の external string との parse / serialize は全単射
- content digest、line number、heading text、mtime、absolute root を含まない

### Artifact

- `id: ArtifactId | SourceFileId`
- `kind`
- `corpusRole`
- `locator: ArtifactLocator`
- `digest` は WM-03 で追加する観測属性であり identity ではない

不変条件:

- product と inception は path / digest / declared key が同じでも異なる role のため異なる node。
- source kind は SourceFileId を使い、generic ArtifactId を併記しない。

### Fragment

- `id: FragmentId`
- `artifactId`
- `locator: FragmentLocator`
- `identityMode: explicit | legacy-whole-file`

不変条件:

- explicit FragmentId は artifact path を含まず、同一 corpus role 内の file move と heading renameに耐える。
- legacy FragmentId は Artifact tuple から導出されるため path rename で変わる。
- 一つの explicit FragmentId が複数 locator に解決した場合は duplicate であり、winner を選ばない。

### ArtifactLocator

- `projectRelativePath`
- `corpusRole`
- absolute root は保持しない

### FragmentLocator

- `artifactId`
- `markerLine`
- `headingLine`
- `headingLevel`
- `startLine`
- `endLine`
- `headingText` / heading ancestry は diagnostic 表示用

line / heading の各値は snapshot ごとに更新でき、FragmentId の一部ではない。

### WorkItemReference

- `id: WorkItemId`
- `providerId: WI-*`
- `aliases: legacy_id[]`
- `descriptionArtifactId`

directory ID と frontmatter ID の不一致、canonical ID の重複は traceability-model の violation を World diagnostic へ写像する。

### TestReference

- `id: TestReferenceId`
- `storyId`, `acId`
- `filePath`, `testType`, optional `testName`
- `binding: ac | file`

現行 matrix の logical dedup tupleを Story / AC scope と結合して global ID にする。同一 ID が複数回出現しても ordinal を付けず duplicate diagnostic とする。

### ExplicitClaim

- `id: ExplicitClaimId`
- `claimType`
- `subjectNodeId`
- `objectNodeId | scalarPayload`
- `locator`

`claimId` は declaration で必須とする。現行 `@work-item-id` / `@attestation` は独立 claim ID を持たないため、typed reference fact として観測し、line number / occurrence ordinal 由来の ExplicitClaimId を捏造しない。

### Constraint

- `id: ConstraintId`
- endpoint と rule の詳細は ADR-034
- ID は required `constraintId: DeclaredKey` から作り、fingerprint と分離する

### Snapshot

- `id: SnapshotId`
- immutable
- 同じ canonical snapshot root は同じ ID
- hash input と volatile field 除外は ADR-033

### AliasDeclaration

- `aliasId: WorldNodeId`
- `canonicalId: WorldNodeId`
- `reason`
- `workItemId`

不変条件:

- alias は node ではなく resolution rule。
- alias key は一つの canonical targetだけを持つ。
- target は alias ではなく canonical ID。chain と cycle を禁止する。
- Fragment alias は corpus role をまたがない。product / inception の非同一性を alias で破らない。
- content digest 一致から alias を自動生成しない。

### ReflectionRelation

- `proposalFragmentId`
- `canonicalFragmentId`
- `workItemId`
- `evidenceLocator`

不変条件:

- direction は `proposal --reflected-as--> canonical`。
- proposal endpoint は `inception` role、canonical endpoint は `product` role。
- exact fragment relation は明示 `@world-reflects` があるときだけ生成する。
- 同じ DeclaredKey / heading / digest だけでは relation を生成しない。

## 4. Domain Invariants

| ID | invariant |
|---|---|
| ID-1 | WorldNodeId は type discriminator と schema version を含む |
| ID-2 | immutable Snapshot を除く corpus node の stable ID に content digest / line / heading / ordinal を含めない |
| ID-3 | explicit FragmentId は同一 corpus role 内で project-global unique |
| ID-4 | duplicate canonical ID は no-winner diagnostic |
| ID-5 | rename / move は digest から推論せず、path identity 変更または explicit ID 維持として観測する |
| ID-6 | alias は explicit、single-hop、acyclic、single-target |
| ID-7 | product と inception は alias / dedup で統合しない |
| ID-8 | legacy fallback は compatibility node で、新規 pin の target にしない |
| ID-9 | current annotations を stable ExplicitClaim に昇格しない |
| ID-10 | SnapshotId calculation は versioned canonicalization に依存する |

## 5. Legacy Fragment State

| state | 条件 | emitted fragments | 新規 constraint |
|---|---|---|---|
| whole-file | explicit marker なし | legacy whole-file 1件 | fallback target を許容するが migration debt と表示 |
| mixed | explicit marker あり、completion marker なし | explicit fragments + compatibility fallback | legacy fallback への新規参照は禁止 |
| explicit | explicit marker と `@world-fragment-migration complete` あり | explicit fragmentsのみ | explicit ID のみ許容 |

completion marker は legacy inbound reference が0であることを migration gate が検証してから追加する。explicit marker なし / inbound reference ありで completion を宣言した場合は diagnostic とする。YAML frontmatter がある文書ではその直後、ない文書では最初の heading より前へ置く。

whole-file から explicit へ一対一 alias は自動作成しない。旧 whole-file constraint は内容上どの fragment へ分割すべきか機械判断できないため、人が一つ以上の explicit FragmentId へ target を更新する。
