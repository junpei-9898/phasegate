# WI-283 Unit Test Design: World snapshot canonicalization

<!-- @work-item-id WI-283 -->

## 1. Test policy

- domain serviceはfilesystem / clock / `node:crypto`を直接使わず、plain inputとfake `WorldHashingPort`で検証する。
- expected rootはproduction serializerと別に組み立てた固定canonical bytes / goldenで検証する。
- case名は日本語で仕様として読み、Arrange / Act / Assertを分離する。
- implementation detailだけをassertせず、canonical bytes、digest input、diagnostic contractを観測する。

## 2. CanonicalJsonSerializer

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM283-CAN-001 | nested objectのkey insertion orderが異なる | canonical bytesが一致する |
| UT-WM283-CAN-002 | ordered arrayの順序が異なる | canonical bytesが異なる |
| UT-WM283-CAN-003 | set-valued nodesをID順へprojectする | input列挙順が違ってもbytesが一致する |
| UT-WM283-CAN-004 | string / keyにescape対象文字がある | `JSON.stringify` semanticsの空白なしUTF-8になる |
| UT-WM283-CAN-005 | explicit nullとfield absence | canonical bytesが異なる |
| UT-WM283-CAN-006 | undefined / sparse array / NaN / Infinity / bigint | canonicalization errorになる |
| UT-WM283-CAN-007 | canonical bytes生成 | BOM / indentation / trailing newlineを含まない |

## 3. TextContentNormalizer

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM283-TXT-001 | 同じtextのLF / CRLF / lone CR | normalized UTF-8 bytesが一致する |
| UT-WM283-TXT-002 | NFCとNFDで見た目が同じtext | bytesとleaf digestが異なる |
| UT-WM283-TXT-003 | trailing whitespace差 | leaf digestが異なる |
| UT-WM283-TXT-004 | final newline有無 | leaf digestが異なる |
| UT-WM283-TXT-005 | UTF-8 BOM有無 | leaf digestが異なる |
| UT-WM283-TXT-006 | invalid UTF-8 | extraction diagnosticになりreplacement characterで続行しない |
| UT-WM283-TXT-007 | explicit Fragment marker metadataだけ変更 | content range digestへmarker lineを混ぜず、identity fact側の変更として観測する |

## 4. Path / symlink normalization

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM283-PATH-001 | `./` / duplicate separatorを含むrelative path | ADR-032 PathKeyへ正規化される |
| UT-WM283-PATH-002 | absolute / drive-letter / backslash / `..` | path diagnosticになる |
| UT-WM283-PATH-003 | 異なるabsolute checkout rootから同じrelative corpus | canonical bytesが一致する |
| UT-WM283-PATH-004 | filesystem列挙順が異なる | nodes / rootが一致する |
| UT-WM283-PATH-005 | symlinkがregular fileを指す | targetをfollowせずlink target factだけを使う |
| UT-WM283-PATH-006 | broken / cyclic / outside-root symlink | traversalせずdiagnosticを返す |
| UT-WM283-PATH-007 | caseだけ異なるpath | mergeせず別IDまたはcase-fold collision diagnosticになる |
| UT-WM283-PATH-008 | Unicode normalizationだけ異なるpath | opaque PathKeyとして別値を保つ |

## 5. CorpusRoot

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM283-CR-001 | 同じnodes / edges / diagnosticsを異なるorderで渡す | corpusRootが一致する |
| UT-WM283-CR-002 | leaf digestが変わる | corpusRootが変わる |
| UT-WM283-CR-003 | extractorVersionが変わる | corpusRootが変わる |
| UT-WM283-CR-004 | snapshot schemaVersionが変わる | corpusRootが変わる |
| UT-WM283-CR-005 | corpus-relevant configが変わる | corpusRootが変わる |
| UT-WM283-CR-006 | outputDir / blocking severityだけ変わる | corpusRootが変わらない |
| UT-WM283-CR-007 | generatedAt / absolute root / git SHA / mtimeだけ変わる | corpusRootが変わらない |
| UT-WM283-CR-008 | corpusRoot / Snapshot ID fieldをoutputへ付ける | self fieldを除くpreimage rootが変わらない |
| UT-WM283-CR-009 | obligation reportを手編集する | corpusRootが変わらない |

## 6. Owner-aware generated artifact projection

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM283-GEN-001 | matrixの`generatedAt`だけ異なる | leaf digest / corpusRootが一致する |
| UT-WM283-GEN-002 | matrix Story / AC / TestReference orderだけ異なる | semantic projection digestが一致する |
| UT-WM283-GEN-003 | matrix binding / testName等semantic fieldが変わる | digestが変わる |
| UT-WM283-GEN-004 | attestation `producedAt` / `gitCommit` / signatureだけ異なる | World evidence projection digestが一致する |
| UT-WM283-GEN-005 | attestation gate outcomeが変わる | projection digestが変わる |
| UT-WM283-GEN-006 | unknown fieldを含むowner DTO | generic dropせずdiagnosticになる |

## 7. ConstraintRoot / EvaluationId

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM283-KR-001 | constraint / claim / alias input orderが異なる | constraintRootが一致する |
| UT-WM283-KR-002 | pinned endpoint digestが変わる | constraintRootが変わる |
| UT-WM283-KR-003 | rulesetVersionが変わる | constraintRootとevaluationIdが変わる |
| UT-WM283-EV-001 | corpusRootだけ変わる | evaluationIdが変わる |
| UT-WM283-EV-002 | constraintRootだけ変わる | evaluationIdが変わる |
| UT-WM283-EV-003 | relevant policy input digestが変わる | evaluationIdが変わる |
| UT-WM283-EV-004 | findings / obligation order / report formattingだけ変わる | evaluationIdが変わらない |
| UT-WM283-EV-005 | 同じEvaluationInputを2回導出する | evaluationIdがbyte-identicalになる |

## 8. Hashing boundary

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM283-HASH-001 | public capabilityへknown bytesを渡す | known SHA-256 lowercase digestを返す |
| UT-WM283-HASH-002 | UTF-8 helperへnon-ASCII textを渡す | `TextEncoder` bytesと同じdigestになる |
| UT-WM283-HASH-003 | world adapterがplain digestを受ける | world-local `Sha256Digest`へ変換する |
| UT-WM283-HASH-004 | attestation adapterがplain digestを受ける | attestation-local `Digest`へ変換する |
| UT-WM283-HASH-005 | world-model import graphを検査する | attestation domain / infrastructureへのdeep importがない |
| UT-WM283-HASH-006 | World hashing実装をsource scanする | World導入で新しい`node:crypto` SHA-256 call siteが増えていない |

## 9. Determinism acceptance

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM283-DET-001 | 同一fixtureを2回snapshot化 | canonical JSONとcorpusRootがbyte-identical |
| UT-WM283-DET-002 | fixture列挙順 / object key順 / checkout root / LF-CRLFを変える | corpusRootが一致する |
| UT-WM283-DET-003 | semantic node contentを1件変更 | 対応leaf digestとcorpusRootだけが期待どおり変わる |
