# WI-290 Unit Test Design: Runtime / evidence extraction

<!-- @work-item-id WI-290 -->

@story-id H17-05

## 1. Policy

- test名は日本語、AAAを明示する。
- World entity / VO / serializerは実体を使う。
- filesystem / public verification boundaryはdeterministic fakeを許可し、provider domainをmockしない。
- expected projection / pgw IDはliteralで検証する。

## 2. Source cases

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM290-SRC-001 | implementation metadata完備 | implementation SourceFile fact |
| UT-WM290-SRC-002 | `__tests__` metadata完備 | test SourceFile fact、implementation側に重複なし |
| UT-WM290-SRC-003 |複数WI annotation | canonical ID順のworkItemIds |
| UT-WM290-SRC-004 | missing / duplicate Unit・layer | SourceFile保持 + diagnostic |
| UT-WM290-SRC-005 | invalid UTF-8 / symlink | nodeなし + diagnostic、followなし |

## 3. Matrix cases

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM290-MTX-001 | valid 1.1 | generated Artifact + TestReference nodes |
| UT-WM290-MTX-002 | generatedAtだけ変更 |同じsemantic digest |
| UT-WM290-MTX-003 | Story / AC / refs順変更 |同じcanonical projection |
| UT-WM290-MTX-004 | binding省略 | `file`へ正規化 |
| UT-WM290-MTX-005 | duplicate tuple | winnerなし + duplicate diagnostic |
| UT-WM290-MTX-006 | unknown version / field / malformed | artifactなし + diagnostic |
| UT-WM290-MTX-007 | file不在 | `not-present` |

## 4. Attestation / integrity cases

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM290-ATT-001 | valid public DTO + passed verification | semantic Artifactにstatusを含める |
| UT-WM290-ATT-002 | producedAt / producer / gitCommit / signatureだけ変更 |同digest |
| UT-WM290-ATT-003 | verification status変更 |別digest |
| UT-WM290-ATT-004 | unknown schema / field / handler failure | artifactなし + diagnostic |
| UT-WM290-INT-001 | valid v1 manifest | path順のraw digest declaration |
| UT-WM290-INT-002 | invalid path / digest / schema | artifactなし + diagnostic |
| UT-WM290-OPT-001 | optional files不在 | provider別`not-present` |
