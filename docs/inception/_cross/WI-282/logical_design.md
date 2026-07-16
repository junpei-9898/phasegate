# WI-282 Logical Design: World node identity と fragment locator

<!-- @work-item-id WI-282 -->

## 1. 現行実装から維持する契約

| surface | 実装根拠 | 実装上の事実 | ADR-032 への反映 |
|---|---|---|---|
| WorkItem | `work-item-frontmatter-parser.ts`, `file-system-work-item-identity-gateway.ts`, `work-item-identity-validation-service.ts` | `WI-\d+` directoryを全 inception から収集し、directory ID / frontmatter `id` 一致と重複を検証 | canonical WorkItemId は provider の WI ID。`legacy_id` は alias |
| Story | `story-id.ts` | `StoryId` は `HXX-XX` と `HF\d+-XX` を許容 | Story identity は traceability-model 所有の provider ID を参照 |
| path | `project-relative-path.ts` | POSIX relative、absolute / backslash / `..` を拒否 | Artifact / SourceFile locator と PathKey の lexical contract に再利用 |
| product reflection | `file-system-story-reflection-adapter.ts`, `file-system-work-item-reflection-adapter.ts` | `@work-item-id` はカンマ / 空白区切り複数 ID を抽出 | WI provenance edge。fragment-to-fragment identity にはしない |
| TestReference | `type-script-test-reference-source-adapter.ts`, `generate-requirement-test-matrix-usecase.ts`, matrix schema 1.1 | matrix は `filePath`, `testType`, optional `testName`, `binding` を持ち、missing binding を `file` として dedup | global TestReferenceId は Story / AC と同 tuple から作る |
| attestation reference | `file-system-coverage-attestation-verification-adapter.ts` | `<!-- @attestation <story-id> -->` を line locator 付きで抽出 | typed reference fact。stable ExplicitClaimId ではない |
| integrity | `integrity-target.ts`, `integrity-manifest.ts`, `integrity-manifest-json-repository-adapter.ts` | manifest は project-relative path → SHA-256、target は include / exclude glob | declaration Artifact と path-located target fact。digest は identity ではない |

既存 parser の行番号や annotation occurrence を stable identity に流用しない。

## 2. ID serialization

`WorldNodeIdCodec` は domain の identity tuple と `pgw:v1:*` 文字列を相互変換する。ID schema version は必須 discriminator とする。

PathKey は次の順に作る。

1. `ProjectRelativePath` と同じ lexical validation / segment normalization。
2. 各 segment を UTF-8 URI percent-encoding。
3. `/` で再結合。

absolute project root、filesystem separator、mtime、digest は入れない。case folding / symlink resolution / Unicode normalization もしない。snapshot canonicalization は ADR-033 が、この既に確定した ID string を opaque scalar として扱う。

## 3. Markdown fragment marker

### 3.1 構文

```markdown
<!-- @world-fragment-id world-model.ownership -->
## Ownership
```

- marker は単独 HTML comment 行。
- key は `DeclaredKey`。
- marker は対象 ATX heading (`#`〜`######`) 直前の contiguous metadata prelude に置く。prelude は `@world-fragment-id` / `@world-reflects` / `@work-item-id` の単独 HTML comment 行だけで構成し、空行や prose を挟まない。
- heading は metadata prelude の直後に置く。
- fenced code / inline code / HTML comment 内の例示は extractor 対象外。
- Setext heading は対象外。
- 一つの heading metadata prelude に `@world-fragment-id` は1件だけ。

### 3.2 範囲

- `headingLine` を fragment content の開始とする。
- 次の `@world-fragment-id` に binding された heading の直前、または EOF を終了とする。
- marker 自身と同じ metadata prelude の relation annotation は locator metadata であり、content rangeには含めない。digestへの包含は ADR-033で決める。
- markerより前の unmarked contentも Artifact 全体の観測には含まれる。Fragmentがないことを silent omission としない。

heading text、heading level、heading ancestry、文書内順序、line number は locator / diagnostic であり FragmentId に含めない。heading rename・level変更・並べ替え後も、marker key と corpus role が同じなら同一 Fragment とする。

### 3.3 Duplicate

- 同じ corpus role で同じ declared key が複数 marker に現れたら duplicate identity diagnostic。
- extractor は最初 / 最後の marker を winner にしない。
- duplicate を含む snapshot は identity-complete とみなさない。blocking policy は validator-system が後続 ADR に従って決める。

## 4. Legacy whole-file fallback

明示 marker のない Markdown Artifact は次の ID で whole-file Fragment を1件生成する。

```text
pgw:v1:fragment:legacy:<artifact-kind>:<corpus-role>:<path-key>
```

### Migration

1. **Inventory**: WM-09 が marker 有無と legacy inbound reference を列挙する。
2. **Introduce**: 人が意味境界ごとに marker を追加する。heading text から key を自動生成しない。
3. **Mixed**: completion marker がない間は compatibility fallback を explicit fragments と併存させる。
4. **Retarget**: 人が各旧 constraint / pin を一つ以上の explicit FragmentIdへ更新する。whole-file → one fragment の自動 alias は作らない。
5. **Complete**: legacy inbound reference が0であることを migration gate で確認し、YAML frontmatter があればその直後、なければ最初の heading より前の file-level metadata として `<!-- @world-fragment-migration complete -->` を追加する。
6. **Retire**: completion marker を持つ Artifact の次 snapshot から fallback を除外する。

explicit marker 導入後の新規 declaration は fallback を target にできない。既存 fallback 参照は可視 debt とし、silent rewriteしない。

completion marker が explicit fragment なしで宣言された場合、または legacy inbound reference が残る場合は migration diagnostic とする。fallback の emission は corpus 上の marker だけで決まり、constraint declaration の有無に依存させない。

## 5. Existing annotation mapping

### 5.1 `@work-item-id`

- inception description の frontmatter / parent directory が WorkItem node の canonical identity。
- inception artifact は directory contextから `proposed-by -> WorkItem` provenance を持つ。
- product / source / test の `@work-item-id` は `WorkItem -> reflected-in / implemented-in / tested-by` のtyped reference factへ写像する。
- 複数 ID annotation は一 ID 一 fact に展開する。
- annotation line、コメント形式、並び順を identity にしない。
- `@work-item-id` だけでは proposal fragment と canonical fragment の一対一対応を主張しない。

### 5.2 `@attestation`

- 現行 `<!-- @attestation H06-01 -->` は Story scope への evidence reference。
- source path / line number は locator。
- 同じ Story ID の annotation が複数行にあっても、ordinal由来の stable claim IDを作らない。
- future ExplicitClaim は declaration に required `claimId` を持ち、既存 annotation referenceとは別 node typeにする。

### 5.3 Matrix TestReference

global ID tuple:

```text
(storyId, acId, binding ?? "file", testType, filePath, testName)
```

`generatedAt`、array index、line numberは含めない。test file move、test name変更、binding変更は新TestReference IDとして観測する。continuityが必要なら明示 alias declarationを使い、digestや類似名から推論しない。

### 5.4 Integrity target

- `phasegate.integrity.json` は `external-declaration` Artifact。
- manifest の各 path は対象 Artifact / SourceFile への explicit reference fact。
- include / exclude glob は target declaration fact。
- path と digest は claim payloadであり、IntegrityManifest自体や対象 node の identityにはしない。

## 6. Reflection relation

### 6.1 Artifact-level provenance

現行 annotation から次の hub relationを作る。

```text
inception proposal Artifact ──proposed-by──> WorkItem
WorkItem ──reflected-in──> product canonical Artifact / Fragment
```

これは同じ WI に属することを示すが、proposal fragmentとcanonical fragmentの exact mappingは示さない。

### 6.2 Fragment-level exact relation

canonical product heading の metadata prelude で、repeatable markerを使う。

```markdown
<!-- @world-fragment-id world-model.ownership -->
<!-- @world-reflects inception:world-model.ownership -->
<!-- @work-item-id WI-282 -->
## Ownership
```

- target syntax は `<corpus-role>:<declared-key>`。v1 の reflection source role は `inception` のみ。
- annotation は canonical Fragment から proposal Fragment を参照し、World edge は `proposal --reflected-as--> canonical` 方向で生成する。
- target 不在 / role 不正 / duplicate target は extraction diagnostic。
- 同じ declared key、heading text、section order、content digestから relationを推論しない。
- 一つの canonical Fragment が複数 proposal Fragmentを反映する場合は `@world-reflects` を複数行記述する。

## 7. Rename / move / delete

| event | identity semantics |
|---|---|
| Artifact / SourceFile rename or move | path-based ID は old missing + new added。digest一致でも rename 推定しない |
| explicit Fragment の同一 role 内 file move | marker key不変なら FragmentId維持、locatorのみ更新 |
| Fragment の product↔inception移動 | corpus roleが変わるため別ID。reflection relationで接続 |
| heading rename / level / order変更 | FragmentId維持、locator / content観測のみ更新 |
| test file / test name変更 | TestReferenceId変更 |
| WorkItem directory移動 | canonical WI IDが同一なら WorkItem node維持。description Artifactはpath-based IDのold missing + new added |
| delete | nodeはcurrent snapshotから消え、参照 endpointはmissing。自動 successor推定なし |

## 8. Alias resolution

Alias declaration は external declaration corpus に置き、正式 filename / schema は ADR-037 / implementation WIで決める。semantic contract:

- `aliasId`, `canonicalId`, `reason`, `workItemId` 必須。
- aliasはsingle-hop。targetがaliasである declaration、cycle、同一aliasの複数targetを拒否。
- aliasは旧nodeを再生成せず、reference resolution時にcanonical nodeへ導く。
- resolution結果に `resolved-via-alias` factを残し、renameを隠さない。
- Fragment aliasは同じcorpus role内だけ。productとinceptionをaliasで同一化しない。
- traceability-modelの`legacy_id`はprovider-owned aliasとして同じ規則へ投影する。

## 9. Extraction diagnostics

| code candidate | condition |
|---|---|
| `duplicate-node-id` | 同一 canonical ID が複数 locatorに解決 |
| `invalid-node-id` | declared key / serialized IDがformat違反 |
| `orphan-fragment-marker` | marker直後がATX headingでない |
| `missing-reflection-target` | `@world-reflects` targetが不在 |
| `invalid-alias` | cycle / chain / multiple target / role crossing |
| `legacy-fragment-target` | explicit modeで新規 declarationがfallbackを参照 |
| `invalid-fragment-migration` | completion markerの前提（explicit fragment / inbound reference 0）を満たさない |

rule ID とblocking policyはADR-034以降で確定するため、ここではdiagnostic categoryだけを固定する。

## 10. 後続への契約

- ADR-033 は `WorldNodeId`文字列をopaque scalarとしてcanonical serializationし、Snapshot IDのSHA-256入力を決める。
- ADR-034 はrequired `constraintId` / `claimId` とendpoint semanticsを具体化する。
- WM-07 はID/locator VOとduplicate detectionを実装する。
- WM-08はtraceability plain DTOにcanonical ID / alias resolution情報を公開する。
- WM-09 / WM-10はmarker、annotation、matrix、integrity adapterを実装する。
