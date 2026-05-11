---
traceability:
  initial_creation: true
work_item: WI-145
---

# Integration Test Design: WI-145

> **WI**: WI-145
> **Unit**: installation
> **作成日**: 2026-05-11
> **参照**: `description.md`, `logical_design.md`, `unit_test_design.md`

## 1. テスト方針

@work-item-id WI-145

WI-145 の integration test は、Node.js fs/crypto adapter と CLI handler の外部観測可能な振る舞いを検証する。実ファイルシステムは test temp directory に閉じ込め、network と package install は行わない。

対象:
- `FileSystemManifestRepositoryAdapter`
- `NodeFsFileInspectorAdapter`
- `NodeCryptoHashAdapter`
- `DoctorHandler` / `main.ts` dispatcher
- `skill-deployer-manifest-builder` wrapper
- 4 fixture に対する doctor golden output

## 2. Infrastructure Adapter Tests

@work-item-id WI-145

| Case ID | 対象 | Arrange | 期待結果 |
|---|---|---|---|
| IT-WI145-INF-001 | `FileSystemManifestRepositoryAdapter.load` | `.phasegate/manifest.json` が存在しない | `null` を返す |
| IT-WI145-INF-002 | `load` | valid manifest JSON | `DeploymentManifest` に復元される |
| IT-WI145-INF-003 | `load` | 壊れた JSON | 明確な `HarnessError` を投げる |
| IT-WI145-INF-004 | `save` | manifest を保存 | `.phasegate/manifest.json` が作成され、tmp file が残らない |
| IT-WI145-INF-005 | `save` | 既存 manifest がある | rename により新 manifest へ atomic に差し替わる |
| IT-WI145-INF-006 | `exists` | manifest あり / なし | boolean が正しく返る |
| IT-WI145-INF-007 | `archive` stub | WI-145 では未実装 path | `Not yet implemented` 相当の明確な error contract |
| IT-WI145-INF-008 | `NodeFsFileInspectorAdapter.readText` | file あり / なし | text / `null` を返す |
| IT-WI145-INF-009 | `readJson` | valid JSON / invalid JSON / file なし | object / `null` / `null` を返し例外を投げない |
| IT-WI145-INF-010 | `readSymlink` | symlink / regular file / missing | target / `null` / `null` を返す |
| IT-WI145-INF-011 | `NodeCryptoHashAdapter.compute` | 同一 content を 2 回 hash | 同じ `sha256:<64 hex>` を返す |

## 3. Doctor CLI Integration Tests

@work-item-id WI-145

| Case ID | CLI | Fixture | 期待結果 |
|---|---|---|---|
| IT-WI145-CLI-001 | `phasegate doctor` | `full-install` | exitCode 0、human output に `Status: GREEN`、findings なし |
| IT-WI145-CLI-002 | `phasegate doctor` | `inert-install` | exitCode 1、hook / husky / workflow / symlink 系 finding を表示 |
| IT-WI145-CLI-003 | `phasegate doctor` | `partial-install` | exitCode 1、欠落している check のみ finding を表示 |
| IT-WI145-CLI-004 | `phasegate doctor` | `no-phasegate` | exitCode 1、package devDep と hook 類の missing を表示 |
| IT-WI145-CLI-005 | `phasegate doctor --json` | `inert-install` | stdout が valid JSON、`schemaVersion="1.0"`、`overallStatus="red"` |
| IT-WI145-CLI-006 | `phasegate doctor --strict` | warn only fixture | exitCode 1 |
| IT-WI145-CLI-007 | `phasegate doctor --report-out .phasegate/last-doctor-report.json` | `partial-install` | stdout は human、report file は valid JSON |
| IT-WI145-CLI-008 | `phasegate doctor --json --report-out <path>` | `partial-install` | stdout と report file が同じ schema contract を満たす |
| IT-WI145-CLI-009 | `phasegate install` | 任意 | WI-146 stub として `Not yet implemented` を返す |
| IT-WI145-CLI-010 | `phasegate uninstall` | 任意 | WI-147 stub として `Not yet implemented` を返す |
| IT-WI145-CLI-011 | `phasegate reconcile` | 任意 | WI-148 stub として `Not yet implemented` を返す |

## 4. Fixture Definitions

@work-item-id WI-145

配置: `scripts/harness/__tests__/integration/installation/fixtures/`

| Fixture | 必須 file tree | 期待 |
|---|---|---|
| `full-install` | `package.json` with `devDependencies.phasegate`; `.phasegate/manifest.json`; `.claude/settings.json`; `.codex/hooks.json`; `.husky/pre-commit`; `.husky/commit-msg`; `.husky/pre-push`; `.github/workflows/phasegate-aidlc-gate.yml`; `.claude/skills/phasegate` symlink; `.codex/skills/phasegate` symlink | green |
| `inert-install` | `package.json` with `devDependencies.phasegate`; `.claude/settings.json` は存在するが phasegate hook なし; hook / workflow / symlink は未 deploy | red |
| `partial-install` | Claude hook と package devDep は存在、Codex hook / husky pre-commit / CI workflow / skill symlink の一部が欠落 | red |
| `no-phasegate` | 最小 `package.json` のみ、phasegate 関連 file なし | red |

実装時に symlink を作れない環境では fixture builder が copy mode に fallback せず、該当 test を platform guard で skip する。doctor 本体の symlink 判定は unit test で必ず網羅する。

## 5. Skill Deployer Manifest Wrapper Tests

@work-item-id WI-145

| Case ID | 対象 | Arrange | 期待結果 |
|---|---|---|---|
| IT-WI145-WRP-001 | `skill-deployer-manifest-builder` | 既存 deploy result が created files を返す | `DeploymentEntry.mode="created"` の manifest entries を作る |
| IT-WI145-WRP-002 | wrapper | merged block を含む deploy result | `mode="merged"` と `block` を保持する |
| IT-WI145-WRP-003 | wrapper | symlink deploy result | `mode="symlink"` と hash を保持する |
| IT-WI145-WRP-004 | wrapper | path が重複する deploy result | 最終 entry で差し替え、manifest invariant を壊さない |

## 6. Golden Output Policy

@work-item-id WI-145

- JSON golden は `checkId`, `severity`, `target`, `repairMode`, `suggestedSkill.invokeCommand`, `exitCode` を exact match する。
- human golden は全文 snapshot にせず、重要行の包含を検証する。
- path は temp directory 依存を避けるため project root を `<PROJECT_ROOT>` に normalize して比較する。
