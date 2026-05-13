---
traceability:
  initial_creation: true
---

# Integration Test Design: installation

> **Unit ID**: installation
> **対応 WI**: WI-145 / WI-146 / WI-147 / WI-148
> **作成日**: 2026-05-11
> **参照**: `logical_design.md`, `unit_test_design.md`, `docs/principles/testing-rules.md`

## 1. WI-145: Deployment manifest + silent-failure doctor

@work-item-id WI-145

### 1.1 Scope

WI-145 の integration test は、実ファイルシステム上の manifest I/O、file inspector、crypto hash、doctor CLI handler、fixture golden output を検証する。テストは temp project root 内で完結し、network access と package install は行わない。

### 1.2 Infrastructure Adapter Tests

| Case ID | 対象 | 前提 | 期待結果 |
|---|---|---|---|
| IT-INS-145-INF-001 | `ManifestRepositoryPort.load` | manifest file なし | `null` |
| IT-INS-145-INF-002 | `load` | valid `.phasegate/manifest.json` | `DeploymentManifest` に復元 |
| IT-INS-145-INF-003 | `load` | 壊れた JSON | 明確な `HarnessError` |
| IT-INS-145-INF-004 | `save` | manifest 保存 | `.phasegate/manifest.json` が atomic に作成され tmp が残らない |
| IT-INS-145-INF-005 | `exists` | manifest あり / なし | boolean が正しく返る |
| IT-INS-145-INF-006 | `NodeFsFileInspectorAdapter` | text / JSON / symlink / missing file | text, object, target, `null` を contract 通り返す |
| IT-INS-145-INF-007 | `NodeCryptoHashAdapter` | 任意 content | `sha256:<64 hex>` を返す |

### 1.3 CLI / Fixture Tests

| Case ID | CLI | Fixture | 期待結果 |
|---|---|---|---|
| IT-INS-145-CLI-001 | `phasegate doctor` | `full-install` | exitCode 0、green |
| IT-INS-145-CLI-002 | `phasegate doctor` | `inert-install` | exitCode 1、silent failure を red findings として表示 |
| IT-INS-145-CLI-003 | `phasegate doctor` | `partial-install` | exitCode 1、欠落 check のみ表示 |
| IT-INS-145-CLI-004 | `phasegate doctor` | `no-phasegate` | exitCode 1、未導入状態を red findings として表示 |
| IT-INS-145-CLI-005 | `phasegate doctor --json` | `inert-install` | valid JSON、`schemaVersion="1.0"` |
| IT-INS-145-CLI-006 | `phasegate doctor --strict` | warn only project | exitCode 1 |
| IT-INS-145-CLI-007 | `phasegate doctor --report-out <path>` | `partial-install` | report file に JSON 診断結果を保存 |
| IT-INS-145-CLI-008 | `phasegate install/uninstall/reconcile --dry-run` | 任意 | 構造化 lifecycle report を返し、dry-run では file を変更しない |

### 1.4 Fixture Contract

| Fixture | 目的 | 最小構成 |
|---|---|---|
| `full-install` | 正常導入の false positive 防止 | package devDep、manifest、Claude/Codex hooks、husky 3 files、CI workflow、skills symlink |
| `inert-install` | skip-on-exist の silent failure 再現 | package devDep と既存 settings のみ、phasegate 配線なし |
| `partial-install` | 一部導入の検出 | Claude hook あり、Codex / husky / CI / skills の一部欠落 |
| `no-phasegate` | 未導入 PJ の診断 | 最小 package.json のみ |

### 1.5 Golden Policy

JSON は schema と主要 field を exact match し、human output は全文 snapshot ではなく重要行の包含を検証する。project root は `<PROJECT_ROOT>` に normalize する。
