# WI-287 Unit Test Design: World identity と canonical Snapshot

<!-- @work-item-id WI-287 -->

@story-id H17-02

## 1. Policy

- test名は日本語で仕様を表し、Arrange / Act / Assertを分離する。
- domain Entity / VO / serviceは実体を使い、mockしない。
- hashing portは固定入力から決定的なvalid digestを返すtest-local implementationとし、受領canonical bytesを観測する。
- expected canonical bytesはproduction serializerから組み立てず、literal goldenで検証する。
- I/Oを持たないためintegration testは作らない。

## 2. Identity / value object cases

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM287-ID-001 | ADR-032の全node type tuple | canonical `pgw:v1` IDへ生成・round-tripする |
| UT-WM287-ID-002 | explicit Fragmentでpath / headingを変える |同じrole / DeclaredKeyならIDが変わらない |
| UT-WM287-ID-003 | product / inceptionまたはartifact kindが違う |別Artifact / Fragment IDになる |
| UT-WM287-ID-004 | invalid prefix / discriminator / tuple / percent encoding | typed errorで拒否する |
| UT-WM287-PATH-001 | `./` / duplicate separator | canonical PathKeyへ正規化する |
| UT-WM287-PATH-002 | absolute / drive / backslash / `..` |拒否する |
| UT-WM287-VO-001 | invalid DeclaredKey / SHA digest / role / kind |拒否する |

## 3. Canonicalization carry-over

| Existing ID | WM-07 implementation |
|---|---|
| UT-WM283-CAN-001〜007 | recursive key sort、ordered array、escape / null、unsupported value、UTF-8 decoration |
| UT-WM283-TXT-001〜006 | LF family、Unicode非正規化、whitespace / final newline / BOM保持、invalid UTF-8 diagnostic |
| UT-WM283-PATH-001〜004, 007〜008 | lexical normalization、absolute root非入力、set order、case / Unicode保持 |
| UT-WM283-CR-001〜005, 008 | set order、semantic / version / config change、self exclusion |
| UT-WM283-KR-001〜003 | declaration set sort、pin / ruleset change |
| UT-WM283-EV-001〜005 | six-field preimageだけからのdeterministic evaluation ID |
| UT-WM283-HASH-003 | plain valid digestをWorld-local `Sha256Digest`へ変換 |
| UT-WM283-DET-001〜003 | repeat、key / set / line ending差、semantic content change |

symlink traversal、owner-aware projection、fragment marker rangeはI/O / extractor responsibilityのためWM-09/10へ残す。

## 4. Entity cases

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM287-NODE-001 | Artifact / SourceFile / explicit / legacy Fragmentを作る | type固有projectionとdigestを保持する |
| UT-WM287-EDGE-001 | directed edgeを作る | from / toを入れ替えずcanonical projectionする |
| UT-WM287-DIAG-001 | diagnosticを作る | policy / severityなしでstable projectionする |
| UT-WM287-SNAP-001 | corpus preimageをbuildする | sorted facts、root、Snapshot IDを保持する |
| UT-WM287-SNAP-002 | constraint / evaluation rootを関連づける | corpusRoot / Snapshot IDを変えない |

