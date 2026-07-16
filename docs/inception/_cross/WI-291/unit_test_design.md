# WI-291 Unit Test Design: Assembly / inspection / handler

<!-- @work-item-id WI-291 -->

@story-id H17-06

## 1. Policy

- test名は日本語、semantic AAA、Actは原則1つとする。
- World Entity / VO / serializer / root deriverは実体を使う。
- application portはdeterministic fakeを許可し、domain objectはmockしない。
- expected stable ID / root / envelopeをexact valueで検証する。

## 2. BuildSnapshot cases

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM291-BLD-001 | 複数sourceのunique fact | 全node / edge / diagnosticを一Snapshotへ含める |
| UT-WM291-BLD-002 | source間duplicate node ID | candidate全除外 + `duplicate-node-id` |
| UT-WM291-BLD-003 | duplicate edge tuple | edgeを1件へcanonical dedup |
| UT-WM291-BLD-004 | missing endpoint edge | edge除外 + `missing-edge-endpoint` |
| UT-WM291-BLD-005 | source列挙順だけ変更 |同じcanonical bytes / corpusRoot |
| UT-WM291-BLD-006 | semantic corpus config変更 |別corpusConfigDigest / corpusRoot |

## 3. InspectWorld cases

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM291-INSP-001 | clean Snapshot | plain DTO、stable counts / order |
| UT-WM291-INSP-002 | `not-present`のみ | hardDiagnosticCount 0 |
| UT-WM291-INSP-003 | duplicate等のdiagnostic | hardDiagnosticCountへ算入 |
| UT-WM291-INSP-004 | domain projection | Entity / VO instanceを公開しない |

## 4. CLI handler cases

| ID | 条件 | 期待 |
|---|---|---|
| UT-WM291-CLI-001 | flagなし | human、exit 0、stdout result |
| UT-WM291-CLI-002 | `--json` / `--format json` |同じ単一JSON envelope |
| UT-WM291-CLI-003 | hard diagnostic | exit 1、dataを保持 |
| UT-WM291-CLI-004 | conflicting / unknown flag | exit 2、use case未実行 |
| UT-WM291-CLI-005 | config / execution failure | humanはstderr、JSONはstdout error envelope |
| UT-WM291-CLI-006 |同じDTOを2回format | byte-identical output、generatedAtなし |
