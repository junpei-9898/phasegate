---
id: WI-289
type: story
severity: high
status: tested
affects: [world-model]
source: internal
---

# WI-289: Design corpus extractor

<!-- @work-item-id WI-289 -->

@story-id H17-04
## 背景

ADR-031はproductをcanonical、inceptionをproposal / deltaとして別artifactに保ち、ADR / Unit定義をdesign documentとして観測すると決定した。ADR-032はpath-based Artifact、DeclaredKey-based Fragment、legacy whole-file fallback、migration completion、明示reflection、duplicate no-winnerを定義した。WM-07はこれらを表すWorld domain primitive、WM-08はtraceability-modelのplain read facadeを提供した。

WM-09ではproduct / inception / ADR / canonical Unit definitionのMarkdown corpusをfilesystemから読み、World node / edge / extraction diagnosticへ変換するconsumer-owned infrastructure adapter群を実装する。

## スコープ

- product、inception proposal、ADR、Unit definitionの専用fact extractor
- strict UTF-8、LF正規化、project-relative PathKey、SHA-256 content digest
- `@world-fragment-id`のmetadata prelude bindingとfragment locator
- whole-file → mixed → explicit migration stateとlegacy fallback
- `@world-fragment-migration complete`、`@world-reflects`、`@work-item-id`のparse / resolution
- same corpus roleのduplicate Fragment ID、case-fold path collision、symlink / unsupported inputのdiagnostic
- traceability public facadeからのWorkItem node、Unit owner、Story catalog factとprovider diagnostic変換
- fixture-based unit / integration test

## スコープ外

- source / test / matrix / attestation / integrity extractor（WM-10）
- Snapshot assembly / corpusRoot use case / `world:inspect`（WM-11）
- Constraint / alias declaration repository、legacy inbound reference gate（WM-12/13）
- `composition-root.ts`、`index.ts`、CLI、validator registry
- corpus source fileの自動修正、marker insertion、migration completionのapply

## 受け入れ基準

- 同一bytesのproductとinceptionはroleが異なるArtifact / Fragmentとして残り、digest一致でdeduplicateしない。
- ADRとcanonical `<kebab-case-unit-id>_unit.md`を`design-document`として抽出する。
- valid metadata preludeだけをheadingへbindし、heading text / order / lineをFragment identityに含めない。
- markerなしはlegacy fallback、markerありcompletionなしはexplicit + fallback、valid completionありはexplicitだけを返す。
- malformed / orphan / duplicate marker、missing / invalid reflection、unknown WorkItem、provider diagnostic、unsupported file typeをsilent omissionしない。
- duplicate node IDは全candidateを除外し、filesystem orderでwinnerを選ばない。
- world-model sourceはtraceability-modelのpublic `index.ts`以外をimportしない。
- composition-root / index.tsを変更しない。

## 成果物

- `docs/inception/_cross/WI-289/{description,domain_model,logical_design,unit_test_design,it_test_design}.md`
- world-model construction 4文書への累積反映
- `scripts/harness/world-model/infrastructure/adapters/*design*fact*.ts`
- `scripts/harness/__tests__/{unit,integration}/world-model/infrastructure/**`
- `scripts/harness/__tests__/fixtures/world-model/design-corpus/**`
- CHANGELOG / package version 0.244.0

## 依存と後続

- ADR-031〜033、H17-04、WM-07 / WM-08のdomain / public contractを前提とする。
- WM-10がruntime / generated owner projectionを追加する。
- WM-11が本extractor群をcomposition-rootへ配線し、Snapshot / inspectへ統合する。
