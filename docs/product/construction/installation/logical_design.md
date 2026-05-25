---
traceability:
  initial_creation: true
---

# Logical Design (横断): installation

> **Unit ID**: installation
> **対応 WI**: WI-145 / WI-146 / WI-147 / WI-148 / WI-169 / WI-181 / WI-182 / WI-183 / WI-207 / WI-208 / WI-209
> **作成日**: 2026-05-11
> **承認済 Phase 1 計画**: `docs/inception/installation/logical_design_plan.md`
> **対応 domain_model**: `docs/product/construction/installation/domain_model.md`

## 1. アーキテクチャ層 (Clean Architecture, 4 層)

`phasegate.config.json` の `architecture.preset: "clean"` に準拠。依存方向は厳守: `domain → application → infrastructure/presentation` (infrastructure と presentation の相互参照は禁止、composition root のみで合流)。

### 1.1 domain

- IO を持たない pure functions / value objects
- 集約 (`DeploymentManifest`, `DiagnosticReport`)、VO (`DeploymentEntry` 等)、interface (`HeuristicCheck`, `MergeStrategy<T>` 等)、静的レジストリ (`RepairTable`)
- 配置: `scripts/harness/installation/domain/`

**責務の詳細:**

| 構成要素 | 種別 | 役割 |
|---|---|---|
| `DeploymentManifest` | 集約 root | deploy された全ファイルを `created` / `merged` 区別付きで記録 |
| `DeploymentEntry` | VO (集約内部) | 1 ファイル単位の deploy 記録 (`path` / `mode` / `block?` / `hash`) |
| `DiagnosticReport` | 集約 root | doctor 1 回実行の検査結果を不変条件付きで保持 |
| `DiagnosticFinding` | VO (集約内部) | 1 件の検出結果 (`checkId` / `severity` / `target` / `message` / `repairMode` / `repairHint?` / `suggestedSkill?`) — domain_model.md §2.2 と同期 |
| `RepairMode` | VO | `"mechanical" \| "ai-assisted" \| "manual"` の 3 値 |
| `SuggestedSkill` | VO | `{ skillName, rationale, invokeCommand }` の純粋データ |
| `Hash` | VO | `sha256:<64 hex>` prefix 付き文字列。`sha256:` prefix で将来のアルゴリズム切替に対応 |
| `RepairTable` | 静的レジストリ (domain class) | `lookup(checkId): SuggestedSkill \| null` の静的マッピング |
| `HeuristicCheck` | interface | 10 種実装の strategy 抽象 (実装は application layer) |
| `MergeStrategy<T>` | interface | install の merge 戦略抽象 (WI-146 で導入、実装は infrastructure) |
| `UninstallReverseStrategy` | interface | uninstall の reverse-op 抽象 (WI-147 で導入、実装は infrastructure) |
| `ReconcileStrategy` | interface | reconcile の update 戦略抽象 (WI-148 で導入、実装は infrastructure) |

**domain 層の不変条件 (domain_model_plan.md §2 と同期):**

- `DeploymentManifest`: `entries[].path` がユニーク; `entry.mode == "merged"` ⇒ `entry.block != null`; `entry.hash` は `sha256:` prefix 形式; `version` は semver 形式
- `DiagnosticReport`: `findings[].checkId` がユニーク; `finding.repairMode == "ai-assisted"` ⇒ `finding.suggestedSkill != null`; `finding.severity == "red"` のとき `overallStatus = "red"`
- 全 VO / 集約 root は TypeScript `readonly` + `Object.freeze()` で immutability を保証

### 1.2 application

- domain + port interface を所有、infrastructure を知らない
- Use case 4 種 + Port 4 種 + HeuristicCheck 10 実装
- 配置: `scripts/harness/installation/application/`

**責務の詳細:**

- Port interface を宣言し、infrastructure adapter との境界を保つ
- `HeuristicCheck` 10 実装は `FileInspectorPort` を use case から受け取る stateless strategy として実行する (Phase 1 計画書 Q5 承認後の実装反映)
- 薄い wrapper (`skill-deployer-manifest-builder.ts`) を WI-145 スコープで保持し、WI-146 完了時に削除 (Phase 1 計画書 Q3 承認)
- use case は副作用を port 経由でのみ実行し、domain ロジックと IO を分離する

### 1.3 infrastructure

- port を実装する adapter、Node.js fs/crypto を直接呼ぶ
- 新規 npm 依存追加なし (Node.js built-in のみ、Phase 1 計画書 Q1 承認)
- 配置: `scripts/harness/installation/infrastructure/`

**責務の詳細:**

- `ManifestRepositoryPort` 実装: `.phasegate/manifest.json` の atomic write (tmp → rename)
- `FileInspectorPort` 実装: Node.js `fs/promises` による read-only 検査
- `HashCalculatorPort` 実装: Node.js `crypto.createHash("sha256")`
- `BackupPort` 実装: `.phasegate/backups/{ISO-timestamp}/<relative-path>` への `fs.copyFile`
- `MergeStrategy<T>` 各実装 (WI-146 で追加): JSON / Shell / YAML-add / package.json の 4 種
- `UninstallReverseStrategy` 各実装 (WI-147 で追加)
- `ReconcileStrategy` 各実装 (WI-148 で追加)

### 1.4 presentation

- CLI handler、application use case を呼ぶ、infrastructure adapter を DI 注入
- 配置: `scripts/harness/installation/presentation/` および `scripts/harness/main.ts` (CLI dispatcher 追記)

**責務の詳細:**

- 引数 parsing (`--dry-run` / `--apply` / `--force` / `--json` / `--strict` / `--report-out`)
- use case 起動と report 受領
- output formatting (human readable / json with `schemaVersion: "1.0"`) (Phase 1 計画書 Q4 承認)
- exit code mapping: `overallStatus == "red" → 1`, `warn && strict → 1`, `warn → 0`, `green → 0`
- presentation 単独でのロジック実装禁止 (全ロジックは application に委譲)

---

## 2. Use Case 一覧

@work-item-id WI-145
@work-item-id WI-146
@work-item-id WI-147
@work-item-id WI-148
@work-item-id WI-176

| Use Case | Input | Output | 担当 WI | 副作用 |
|---|---|---|---|---|
| `RunDoctorDiagnosticsUseCase` | `{ projectRoot: string, strict: boolean }` | `DiagnosticReport` | WI-145 | なし (read-only) |
| `InstallUseCase` | `{ projectRoot: string, mode: "dry-run" \| "apply" \| "force" }` | `InstallReport` | WI-146 | manifest write、file deploy |
| `UninstallUseCase` | `{ projectRoot: string, mode: "dry-run" \| "apply" \| "force" }` | `UninstallReport` | WI-147 | manifest archive、file removal |
| `ReconcileUseCase` | `{ projectRoot: string, mode: "dry-run" \| "apply" \| "force" }` | `ReconcileReport` | WI-148 | manifest update、file diff apply |
| `BuildAgentSetupPlan` | `{ intent, agent, withHusky, withCi, workflow }` | setup plan DTO | WI-176 | なし (read-only planning) |

各 report は独立構造 (Phase 1 計画書 Q2 承認、共通基底なし)。schemaVersion は presentation layer の formatter で揃える (Phase 1 計画書 Q4 承認)。

### 2.1 Personal Install Target Routing

@work-item-id WI-207
@work-item-id WI-208
@work-item-id WI-209

`RunInstallUseCase` accepts `personal?: boolean`. When `personal` is true, install target creation is replaced with a personal-only target set. Agent-visible files are created only as local-only real runtime artifacts recorded in the manifest.

| Target | Strategy | Behavior |
|---|---|---|
| `.phasegate-local/phasegate.config.json` | `copy` | Create local config parking file only when absent; existing content is preserved. |
| `.claude/settings.json` | `copy` | Copy Claude Code hook settings as a regular file for `--agent claude` / `both`. |
| `.claude/skills/` | `copy-dir` | Deploy bundled skills as a regular directory for Claude Code discovery. |
| `.codex/hooks.json` | `copy` | Copy Codex project-local hooks as a regular file for `--agent codex` / `both`. |
| `.codex/skills/` | `copy-dir` | Deploy bundled skills as a regular directory for Codex discovery. |
| `.git/info/exclude` | `text-managed` | Append or replace a bounded PhaseGate personal exclude block. |
| `~/.codex/config.toml` | manual plan item | Report user-level Codex hook feature enablement guidance without writing outside the project. |

The personal target set excludes `package.json`, `AGENTS.md`, `CLAUDE.md`, `.husky/*`, `.github/workflows/*`, `.gitignore`, GitHub CLI config, repo secrets, and hosted CI config from both dry-run and apply plans. `phasegate install --personal` also forces Husky and CI inclusion off at the CLI boundary.

Existing non-managed `.claude/*` / `.codex/*` paths are manual review targets and are not overwritten. `RunUninstallUseCase` treats `.git/info/exclude` as `text-managed`; uninstall removes only the managed personal exclude block and deletes manifest-recorded real runtime artifacts.

For project/team install, `RunInstallUseCase` creates `phasegate.config.json` from a standard project template when absent. Agent hook targets depend on this config at runtime, so the same install transaction that writes `.claude/settings.json` / `.codex/hooks.json` must also make the project config discoverable. Existing `phasegate.config.json` content is preserved. @work-item-id WI-209

### 2.1 Downstream Install Template Contract

@work-item-id WI-181
@work-item-id WI-182
@work-item-id WI-183

`install` が配布する package / Husky / GitHub Actions target は、published package の runtime contract に閉じる。package metadata は runtime import に必要な dependency を `dependencies` に置き、checkout 内部の `scripts/harness/main.ts` や repository-local `pnpm run harness ...` script に依存しない。downstream project では `package.json` に `phasegate` devDependency が追加されるため、managed hook/workflow は `npx phasegate ...` を runtime entrypoint とする。

| Target | Contract |
|---|---|
| `package.json` | packaged `skill:apply-cascade-update` が `tinyglobby` を解決できるよう runtime dependency を宣言する。 |
| `.husky/pre-commit` | `PHASEGATE_CMD="${PHASEGATE_CMD:-npx phasegate}"` で `lint` と `validate --layer L2 --format human` を実行する。 |
| `.github/workflows/phasegate-aidlc-gate.yml` | lockfile から pnpm/yarn/npm install を選択し、`npx phasegate lint --json` と `npx phasegate phasegate:ci-check --json` を実行する。 |

### 2.1.1 Health Surface Guidance

@work-item-id WI-186

Installed hooks and CI templates use gate commands for blocking decisions: `phasegate:complete-check`, `validate --layer <Lx>`, or generated CI check commands. `phasegate:status` is an informational diagnostics surface; its JSON `status` can be `fail` while the command exits 0 so agent and setup flows can inspect health without conflating diagnostics with gate execution.

### 2.2 Agent-Specific Readiness View

@work-item-id WI-176

`setup:agent --json` exposes `plan.agentReadiness` in addition to the area-based `plan.completeness`.

| Row | Meaning |
|---|---|
| `claude` | Claude Code local runtime context: `.claude/settings.json`, `CLAUDE.md`, and shared skills |
| `codex` | Codex local runtime context: `.codex/hooks.json`, `AGENTS.md`, and shared skills |
| `shared` | package/config/skills plus selected Husky and CI managed targets |

The readiness view is intentionally local. It must not claim that Claude Code has opened the repository, that Codex user-level features are enabled, or that hosted CI has executed successfully.

**各 use case の処理概要:**

| Use Case | 処理フロー概要 |
|---|---|
| `RunDoctorDiagnosticsUseCase` | manifest parse を事前確認 → `HeuristicCheck[]` を順次実行 → `DiagnosticFinding[]` を収集 → `DiagnosticReport` を構築して返す |
| `InstallUseCase` | deploy 先ごとに `RepairMode` 判定 → `mechanical` なら merge 実行、`ai-assisted` なら refuse + hint → `ManifestRepositoryPort.save` |
| `UninstallUseCase` | manifest 読込 → 各 entry の reverse-op 判定 → `created` 削除 / `merged` block 除去 → manifest archive |
| `ReconcileUseCase` | manifest 読込 → template hash 比較 → 差分 update / skip / refuse → manifest update |

---

## 3. Ports (interface)

### 3.1 ManifestRepositoryPort

@work-item-id WI-145

```typescript
interface ManifestRepositoryPort {
  load(projectRoot: string): Promise<DeploymentManifest | null>;
  save(projectRoot: string, manifest: DeploymentManifest): Promise<void>;
  exists(projectRoot: string): Promise<boolean>;
  archive(projectRoot: string): Promise<void>;  // uninstall 用、`.phasegate/manifest.archived-{ISO}.json` へ rename
}
```

- 永続先: `.phasegate/manifest.json`
- 書込: atomic (tmp → rename)
- `load` は存在しない manifest に `null` を返し、壊れた JSON には `HarnessError` を throw

### 3.2 FileInspectorPort

@work-item-id WI-145

```typescript
interface FileInspectorPort {
  exists(absolutePath: string): Promise<boolean>;
  readText(absolutePath: string): Promise<string | null>;        // 存在しない / 読込失敗 → null
  readJson<T = unknown>(absolutePath: string): Promise<T | null>; // 存在しない / parse 失敗 → null (例外を投げない)
  readSymlink(absolutePath: string): Promise<string | null>;     // not a symlink → null
}
```

- 副作用なし (read-only)
- `readSymlink` は symlink でないパスに対して `null` を返す
- `readJson` は parse 失敗時に例外を投げず `null` を返す: HeuristicCheck が parse 失敗を `manual` finding に変換できるようにするため (固有 logical_design.md §2.2.2)

### 3.3 HashCalculatorPort

@work-item-id WI-145

```typescript
interface HashCalculatorPort {
  compute(content: string | Buffer): Hash;  // returns "sha256:<64 hex>"
}
```

- 同期処理 (Node.js `crypto.createHash` は同期 API)
- `Hash` 型は domain VO として `sha256:` prefix + 64 文字 hex の形式制約を持つ

### 3.4 BackupPort

@work-item-id WI-146
@work-item-id WI-147

```typescript
interface BackupPort {
  snapshot(absolutePaths: string[], projectRoot: string): Promise<BackupHandle>;
  // BackupHandle = { backupDir: string, timestamp: string }
}
```

- 配置: `.phasegate/backups/{ISO-timestamp}/<relative-path>` への cp
- `BackupHandle` は backup 完了後の参照用メタデータ (report に含める)

---

## 4. HeuristicCheck 実装 (application layer, 10 種)

@work-item-id WI-145
@work-item-id WI-169

各実装は `HeuristicCheck` interface (domain layer) を実装し、`FileInspectorPort` を constructor 注入で受け取る (Phase 1 計画書 Q5 承認: interface は domain, 実装は application)。

| Class | CheckId | 検査内容 | 重大度 |
|---|---|---|---|
| `ClaudeHookMissingCheck` | `claude-hook-missing` | `.claude/settings.json` に `"npx phasegate hook"` 文字列が無い (JSON 構造 parse で確認) | red |
| `CodexHookMissingCheck` | `codex-hook-missing` | `.codex/hooks.json` に `"npx phasegate hook"` 文字列が無い (JSON 構造 parse で確認) | red |
| `HuskyPreCommitMissingCheck` | `husky-pre-commit-missing` | `.husky/pre-commit` に `phasegate lint` または `phasegate check-phase-gate` が無い | red |
| `HuskyCommitMsgMissingCheck` | `husky-commit-msg-missing` | `.husky/commit-msg` に `phasegate commit-msg` が無い | red |
| `HuskyPrePushMissingCheck` | `husky-pre-push-missing` | `.husky/pre-push` に `phasegate bypass:audit` が無い | warn |
| `CiWorkflowMissingCheck` | `ci-workflow-missing` | `.github/workflows/` に phasegate L3 検査 workflow が存在するか (ファイル名 or 内容で識別) | warn |
| `PackageJsonDevdepMissingCheck` | `package-json-devdep-missing` | `package.json` の `devDependencies` に `phasegate` 記載があるか (JSON parse で確認) | red |
| `ClaudeSkillsSymlinkCheck` | `claude-skills-symlink` | `.claude/skills` が `../skills` または project `skills` を指す symlink か (`readSymlink` で確認) | red |
| `CodexSkillsSymlinkCheck` | `codex-skills-symlink` | `.codex/skills` symlink 検査 (ClaudeSkillsSymlinkCheck と同様の手順) | red |
| `WiWorkflowDriftCheck` | `wi-workflow-drift` | inception WI frontmatter と成果物状態の drift を確認し、ad-hoc plan drift を manual repair として通知 | red |

各 finding は `RepairTable.lookup(checkId)` で `SuggestedSkill` を取得し、`repairMode = "ai-assisted"` の場合に `suggestedSkill` フィールドに同梱する。`repairMode = "mechanical"` の場合は `repairHint` を優先し、skill hint は出さない。

**`HeuristicCheck` interface (domain layer, domain_model.md §3.2 と同期):**

```typescript
interface HeuristicCheck {
  readonly checkId: CheckId;  // literal union, domain_model.md §2.7 で定義
  run(projectRoot: string, inspector: FileInspectorPort): Promise<DiagnosticFinding | null>;  // null = 問題なし (pass)
}
```

- インスタンス生成時に `FileInspectorPort` を constructor 注入する設計でも良いが、横断設計では `run` の引数として明示的に渡す方針を採る (テスト時の mock 注入容易化と、`HeuristicCheck` 実装の statelessness を担保するため)
- 判定ロジックの詳細 (各 check の `repairMode` 分岐ロジック等) は WI-145 固有モード `docs/inception/_cross/WI-145/logical_design.md` §2.2.2 で詳細化済み

---

## 5. Infrastructure Adapters

@work-item-id WI-145

| Adapter | 実装 Port | 実装詳細 |
|---|---|---|
| `FileSystemManifestRepositoryAdapter` | `ManifestRepositoryPort` | Node.js `fs/promises`, atomic write (`fs.writeFile` tmp → `fs.rename`), `JSON.parse` / `JSON.stringify` |
| `NodeFsFileInspectorAdapter` | `FileInspectorPort` | Node.js `fs/promises`, `fs.lstat` で symlink 判定 (`isSymbolicLink()`) |
| `NodeCryptoHashAdapter` | `HashCalculatorPort` | Node.js `crypto.createHash("sha256")`, 出力 `sha256:<hex>` (prefix 付き) |
| `FileSystemBackupAdapter` | `BackupPort` | `.phasegate/backups/{toISOString()}/<relative-path>`, `fs.copyFile` recursive |

新規 npm 依存追加なし (Phase 1 計画書 Q1 承認)。全実装は Node.js built-in (`fs/promises`, `crypto`, `path`) のみを使用。

**WI-146/147/148 で追加される adapter (将来):**

| Adapter | 実装 Port | 担当 WI |
|---|---|---|
| `JsonMergeStrategyAdapter` | `MergeStrategy<JsonValue>` | WI-146 |
| `ShellScriptMergeStrategyAdapter` | `MergeStrategy<string>` | WI-146 |
| `YamlAddStrategyAdapter` | `MergeStrategy<string>` | WI-146 |
| `PackageJsonMergeStrategyAdapter` | `MergeStrategy<PackageJson>` | WI-146 |
| `JsonReverseStrategyAdapter` | `UninstallReverseStrategy` | WI-147 |
| `ShellScriptReverseStrategyAdapter` | `UninstallReverseStrategy` | WI-147 |
| `PackageJsonReverseStrategyAdapter` | `UninstallReverseStrategy` | WI-147 |

---

## 6. Presentation (CLI Handler)

### 6.1 main.ts (CLI dispatcher) への追記

@work-item-id WI-145
@work-item-id WI-146
@work-item-id WI-147
@work-item-id WI-148

`scripts/harness/main.ts` に以下 case を追加 / 変更:

| case | 担当 WI | 処理 |
|---|---|---|
| `"doctor"` | WI-145 | `RunDoctorDiagnosticsUseCase` 起動 → `DiagnosticReport` を human/json 出力 |
| `"install"` | WI-146 | `InstallUseCase` 起動 → `InstallReport` 出力 |
| `"uninstall"` | WI-147 | `UninstallUseCase` 起動 → `UninstallReport` 出力 |
| `"reconcile"` | WI-148 | `ReconcileUseCase` 起動 → `ReconcileReport` 出力 |
| `"init"` (既存) | WI-148 | legacy-compatible bootstrap として維持し、manifest 書き出しは wrapper 経由で行う |
| `"update-skills"` (既存) | WI-148 | `reconcile` へ alias 委譲 |

### 6.2 各 CLI handler の責務 (presentation 単独)

各 handler (`doctor-handler.ts` / `install-handler.ts` / `uninstall-handler.ts` / `reconcile-handler.ts`) は以下に限定:

1. 引数 parsing
   - `--dry-run` / `--apply` / `--force` (install / uninstall / reconcile の mode)
   - `--json` (json 出力)
   - `--strict` (warn も exit code 1 に昇格、doctor 専用)

`doctor` also accepts `--agent <claude|codex|both>`. `both` is the default and keeps the historical full-install behavior. `claude` and `codex` scopes keep shared setup checks active but scope out findings that belong only to the unselected agent, allowing a Claude-only setup to validate without treating missing Codex files as a selected-agent readiness failure. @work-item-id WI-178
   - `--report-out <path>` (json をファイル出力)
2. use case 起動と report 受領
3. output formatting
   - human readable: 色付き summary + findings 一覧 + repair hint
   - json: `{ schemaVersion: "1.0", ...reportFields }` (Phase 1 計画書 Q4 承認)
4. exit code mapping
   - `overallStatus == "red"` → `1`
   - `warn && --strict` → `1`
   - `warn` (strict なし) → `0`
   - `green` → `0`

### 6.3 既存 `scripts/harness/setup/skill-deployer.ts` への薄い wrapper 追加 (Phase 1 計画書 Q3 承認)

@work-item-id WI-145

- `skill-deployer.ts` の関数本体は変更しない (既存 test を破壊しない、back-compat 維持)
- `installation/application/wrappers/skill-deployer-manifest-builder.ts` (新規) に薄い wrapper:
  - 既存 `deploySkills` / `deployHookScripts` 等を呼んだ後、deploy された file の存在確認と hash 計算で `DeploymentEntry` を構築
  - 結果を `DeploymentManifest` に集約し `ManifestRepositoryPort.save` で書き出す
  - `HashCalculatorPort` を constructor 注入で受け取り、hash 計算を実施
- WI-146 で `install` use case を完全新規実装した時点で wrapper を削除し、`InstallUseCase` 内で直接 manifest を構築する経路に切り替える (WI-146 で legacy `setup/` 配下の関数群も整理)

**wrapper の配置:**

```text
scripts/harness/installation/
└── application/
    └── wrappers/
        └── skill-deployer-manifest-builder.ts   // @unit installation / @layer application
```

---

## 7. Composition Root (DI)

@work-item-id WI-145

`scripts/harness/main.ts` を composition root として、起動時に以下を組み立てる。

**WI-145 完了時点の DI 構成:**

```typescript
// infrastructure adapters
const inspector = new NodeFsFileInspectorAdapter();
const hashCalc = new NodeCryptoHashAdapter();
const manifestRepo = new FileSystemManifestRepositoryAdapter();

// domain
const repairTable = new RepairTable();

// application: HeuristicCheck 10 種
const checks: HeuristicCheck[] = [
  new ClaudeHookMissingCheck(inspector),
  new CodexHookMissingCheck(inspector),
  new HuskyPreCommitMissingCheck(inspector),
  new HuskyCommitMsgMissingCheck(inspector),
  new HuskyPrePushMissingCheck(inspector),
  new CiWorkflowMissingCheck(inspector),
  new PackageJsonDevdepMissingCheck(inspector),
  new ClaudeSkillsSymlinkCheck(inspector),
  new CodexSkillsSymlinkCheck(inspector),
  new WiWorkflowDriftCheck(inspector),
];

// application: use cases
const runDoctor = new RunDoctorDiagnosticsUseCase(checks, manifestRepo, repairTable);

// presentation: handlers
const doctorHandler = new DoctorCliHandler(runDoctor);
```

**WI-146/147/148 完了後の追加構成:**

```typescript
const installUseCase = new RunInstallUseCase(manifestRepo, hashCalc);
const uninstallUseCase = new RunUninstallUseCase(manifestRepo, hashCalc);
const reconcileUseCase = new RunReconcileUseCase(manifestRepo, hashCalc);
```

Install / reconcile / uninstall use cases currently keep merge/reverse strategy behavior inside the use case implementation. `futureInstallationStrategyPorts` remains an explicit extension point; it is not an unimplemented runtime dependency. @work-item-id WI-169

**依存方向:**

```text
presentation (main.ts) → application use case → application port (interface)
                                                        ↑ 実装
                                               infrastructure adapter
```

循環なし。composition root (main.ts) のみで infrastructure と presentation が合流する。

---

## 8. テスト設計サマリー

@work-item-id WI-145
@work-item-id WI-146
@work-item-id WI-147
@work-item-id WI-148

### 8.1 Unit tests (`scripts/harness/__tests__/unit/installation/`)

| テスト対象 | テスト内容 | 対応 WI |
|---|---|---|
| `DeploymentManifest` | constructor / 不変条件検証 (entries uniqueness, mode-block constraint) | WI-145 |
| `DeploymentEntry` | VO 生成・equality (path 一致で等価、domain_model_plan.md Q4 承認) | WI-145 |
| `DiagnosticReport` | overallStatus の derive ロジック、findigs uniqueness | WI-145 |
| `DiagnosticFinding` | repairMode-suggestedSkill 制約、severity 独立 (domain_model_plan.md Q5 承認) | WI-145 |
| `RepairTable` | `lookup` の 10 entry full coverage (全 checkId → SuggestedSkill マッピング) | WI-145 / WI-169 |
| `ClaudeHookMissingCheck` | FileInspectorPort mock 注入、pass / fail / ai-assisted 各パターン | WI-145 |
| `CodexHookMissingCheck` | 同上 | WI-145 |
| `HuskyPreCommitMissingCheck` | 同上 | WI-145 |
| `HuskyCommitMsgMissingCheck` | 同上 | WI-145 |
| `HuskyPrePushMissingCheck` | 同上 (warn 判定) | WI-145 |
| `CiWorkflowMissingCheck` | 同上 (warn 判定) | WI-145 |
| `PackageJsonDevdepMissingCheck` | 同上 | WI-145 |
| `ClaudeSkillsSymlinkCheck` | 同上 (symlink 検証) | WI-145 |
| `CodexSkillsSymlinkCheck` | 同上 (symlink 検証) | WI-145 |
| `WiWorkflowDriftCheck` | WI frontmatter drift の red/manual finding | WI-169 / WI-187 |

<!-- @work-item-id WI-187 -->
`WiWorkflowDriftCheck` must not label ad-hoc plan drift as mechanical repair. When it finds zero WI directories and one or more ad-hoc plans, it emits a red diagnostic with `repairMode: "manual"` and `repairHint: null`. The check may mention `quickMode.relaxedGates` in the message, but it must not suggest `phasegate migrate work-items --apply`, because that command does not consume `_shared/**/*_plan.md` files and would leave the same doctor finding in place.

- domain 層のモックは禁止 (CLAUDE.md 規約)
- application layer の `HeuristicCheck` 実装テストでは `FileInspectorPort` を mock 注入する (port のみ mock 許可)

### 8.2 Integration tests (`scripts/harness/__tests__/integration/installation/`)

| テスト | テスト内容 | 対応 WI |
|---|---|---|
| `FileSystemManifestRepositoryAdapter` atomic write | tmpdir fixture、書込→read 一致、tmp file が残らない | WI-145 |
| doctor: `inert-install` fixture | settings.json 既存だが phasegate hook 無し → 非ゼロ exit、red 一覧出力 (golden test) | WI-145 |
| doctor: `partial-install` fixture | claude のみ動作、codex 未配線 → 部分的 red (golden test) | WI-145 |
| doctor: `full-install` fixture | 全部正しく入っている → ゼロ exit、green 出力 (golden test) | WI-145 |
| doctor: `no-phasegate` fixture | phasegate 未導入 → 全 check red (golden test) | WI-145 |
| install idempotency | `--apply` 2 回連続で manifest hash 不変 | WI-146 |
| uninstall reverse | install → uninstall → doctor が「未導入」と判定 | WI-147 |
| reconcile idempotency | `--apply` 2 回連続で no-op | WI-148 |
| manifest parse error | 壊れた `.phasegate/manifest.json` を明示エラーとして扱い、silent green にしない | WI-169 |

### 8.3 Negative tests

| テスト | テスト内容 |
|---|---|
| 壊れた manifest JSON | parse 失敗 → `HarnessError` で明示エラー |
| 権限欠如 (chmod 0) | アクセス不可ファイルへの read 試行 → graceful error |
| symlink 循環 | `readSymlink` での循環検出 → `HarnessError` |
| manifest entry の path 消失 | uninstall 実行時に既に存在しない entry → skip + info 出力 |
| managed block が見つからない `merged` entry | user が手動削除済みと推定 → skip + info 出力 |

---

## 9. 設計判断の根拠 (Phase 1 計画書 Q&A 反映)

| Q | 採用 | 根拠 |
|---|---|---|
| Q1 | a (新規 npm 依存ゼロ) | Node.js built-in (`fs/promises`, `crypto`, `path`) で実装可能。ユーザー側 install 負担を増やさない。YAML merge 不要 (別ファイル名追加方式で coexist) |
| Q2 | a (各 report 独立) | use case ごとに内部構造が異なる (doctor の findings vs install の deployed entries)。共通化は TypeScript generic 型推論の複雑化を招き overkill |
| Q3 | c (薄い wrapper) | 既存 `skill-deployer.ts` の deploy 関数 / test を破壊しない。WI-146 で `InstallUseCase` 本体置換時に wrapper を削除し、段階的移行を実現 |
| Q4 | a (schemaVersion を含める) | phasegate version と schema version は独立して進化。CI 連携 consumer が schema 互換性を判定可能。当面 `1.0` 固定 |
| Q5 | a (HeuristicCheck interface を domain layer) | Clean Architecture DIP に準拠。`RepairTable` と同 layer で判定モデルを統一。application 実装は `FileInspectorPort` に依存するため application 配置が正しい |

---

## 10. 開発者向け備考

- 全 ts ファイル先頭に `// @unit installation` + `// @layer <layer>` を必ず記載
- `@layer` の有効値: `domain` / `application` / `infrastructure` / `presentation`
- 依存方向の violation は `npx phasegate validate --layer L1` で検出される
- composition root (main.ts) のみで infrastructure と presentation が合流する
- `HarnessError` は harness-error unit 所有のものを再利用 (新規 Shared Kernel は導入しない)
- `InstallReport` / `UninstallReport` / `ReconcileReport` の詳細スキーマは各 WI 固有モードで定義する (本横断設計のスコープ外)
- WI-146 完了時に `skill-deployer-manifest-builder.ts` (application/wrappers/) を削除し、cleanup PR を発行すること
- `update-skills` (WI-148 で `reconcile` alias 化) の互換移行は presentation 層の dispatcher のみで完結し、domain/application は変更しない

<!-- @work-item-id WI-174 -->
## 11. Agent Context Managed Targets

`install`, `init`, `reconcile`, and `uninstall` treat `CLAUDE.md` and `AGENTS.md` as markdown managed targets alongside hook JSON, Husky scripts, CI workflow, package metadata, and skill links.

| Target | Owner | Merge rule |
|---|---|---|
| `CLAUDE.md` | Claude-facing setup instructions | Replace only `<!-- phasegate:managed-section:start -->` through `<!-- phasegate:managed-section:end -->`; preserve content outside markers. |
| `AGENTS.md` | Codex-facing setup instructions | Replace only the PhaseGate managed section; lesson pointers have a separate `phasegate:lesson-pointers` section owned by ci-governance. |
| `AGENT.md` | User-owned | Not a PhaseGate managed target. CLI/docs should treat it as unsupported singular spelling and avoid writing it. |

`RunInstallUseCase` renders agent context text from setup options (`--agent`, `--skills`, `--workflow`, Husky, CI) and records the markdown file in `.phasegate/manifest.json`. `RunReconcileUseCase` refreshes only the managed section from bundled templates. `RunUninstallUseCase` removes only the managed section when the manifest entry is merged, or deletes the file only when PhaseGate created the whole file.

<!-- @work-item-id WI-172 -->
## 12. Agent-Driven Setup Planner

`setup:agent` is a presentation-level orchestration command for first-run and retrofit setup. It reads repository state, classifies setup intent (`minimal`, `recommended`, `strict`, `ci-only`, `agent-hooks`, `retrofit`), and returns an agent-readable plan containing detected files, questions, changes, risk, rollback, and validation commands.

The command may call `RunInstallUseCase` in `--apply` mode, but its dry-run JSON plan is the primary contract. It must not silently decide user-owned policy such as Codex user-level feature flags or existing custom workflow semantics.

<!-- @work-item-id WI-173 -->
## 13. Configuration Change Planner

`config:plan` maps safe natural-language configuration intents to target files, commands, risks, rollback, and post-change validation. It does not directly edit `phasegate.config.json`; it provides a stable agent-readable plan so a config doctor workflow can ask for approval, apply an explicit diff, and then run the listed checks.

<!-- @work-item-id WI-175 -->
## 14. Target-Aware Apply Confidence

Install and setup apply paths should preserve a machine-readable result even when an anticipated filesystem permission error occurs. For `EPERM`, `EACCES`, readonly filesystem, or symlink denial failures, the CLI result includes the target path, failed operation, error code, likely cause, recovery guidance, and already changed targets.

Equivalent install options and setup intent options must render the same managed agent context. Strict setup with both agents, Husky, CI, all skills, and strict workflow must not introduce direct-install drift for `AGENTS.md` or `CLAUDE.md`.

<!-- @work-item-id WI-177 -->
## 15. Claude Code Recovery Guidance

Target-aware apply errors are part of the agent contract. `RunInstallUseCase` classifies permission denial (`EPERM`, `EACCES`, `EROFS`) separately from incompatible parent paths (`EEXIST`, `ENOTDIR`) so Claude Code can explain whether the user should grant filesystem access, move a conflicting `.claude` / `.codex` path, or use ai-assisted managed-target recovery.

Structured errors must preserve `target`, `operation`, `code`, `likelyCause`, `recovery`, and `partialChanges` in JSON output. Human and skill guidance can then describe partial setup state before retrying the same apply command.

<!-- @work-item-id WI-179 -->
## 16. Scoped-Out Doctor Repair Guidance

Scoped doctor reports must keep unselected-agent findings visible for explanation while suppressing selected-agent repair guidance. `scopedOutFindings[]` items are serialized with `applicability: "not-applicable"`, `repairHint: null`, `suggestedSkill: null`, and `repairHintApplicability: "only-if-agent-selected"`.

Applicable `findings[]` retain their existing repair hints and suggested skills, with `repairHintApplicability: "applicable"` added for explicit machine interpretation. Human output describes scoped-out findings as informational and not repair targets for the selected `--agent`.

<!-- @work-item-id WI-180 -->
## 17. Scoped-Out Doctor Effective Repair Contract

Scoped doctor reports must expose an effective repair contract that can be read from a single finding item. Applicable `findings[]` include `currentScopeRepairTarget: true` and `repairModeApplicability: "applicable"` in addition to the existing repair hint applicability marker.

`scopedOutFindings[]` preserve the original `repairMode` but mark `currentScopeRepairTarget: false` and `repairModeApplicability: "only-if-agent-selected"`. Human output lists the scoped-out `checkId` values and states that they are not repair targets for the selected scope.
## Managed Context And Drift Diagnostics

<!-- @work-item-id WI-190, WI-193, WI-194, WI-198 -->

- Reconcile remains the repair path for installed managed markdown sections, but its rendered CLAUDE.md contract must match the auto-refresh renderer so refresh/reconcile loops do not create phantom drift.
- Markdown managed entries created by install are reconciled by replacing only the managed section, not by restoring the whole bundled file. This preserves AGENTS.md lesson pointers and user-owned content after `ci:auto-refresh-agent-context --apply`.
- `wi-workflow-drift` counts `_shared/**/*.md` recursively as ad-hoc inception drift when no WI directories exist. It preserves the manual repair contract: `repairMode` is `manual` and `repairHint` is `null`.
- Installed CI workflow templates must use package-manager-neutral install logic and packaged `npx phasegate` commands.

<!-- @work-item-id WI-191 -->

Installation setup guidance treats retrofit bootstrap as a config-plan workflow rather than an unmanaged protected-file edit. Agents must present the `retrofit-bootstrap` plan for review before applying a `phasegate.config.json` relaxation.

<!-- @work-item-id WI-201 -->

Retrofit bootstrap remains incomplete until the reviewed `config:plan` operations have a managed apply command. Agent setup guidance should recommend `config:plan --intent retrofit-bootstrap --dry-run --json` for review and `config:plan --intent retrofit-bootstrap --apply --json` for the approved mutation path, instead of asking the agent to edit `phasegate.config.json` directly.

## Protected Uninstall Planning

<!-- @work-item-id WI-199 -->

Uninstall planning marks protected package metadata paths with `protected:true` in each machine-readable plan item. A changed protected item is refused during apply unless the caller explicitly uses `--force`, so automation can detect `package.json` / lockfile mutation without maintaining its own path allowlist. Human output also labels protected entries in the plan.

## WI-203 Complete Check Wrapper Non-Target

<!-- @work-item-id WI-203 -->

Install and reconcile do not manage `scripts/harness/cli/complete-check.ts` as a downstream target. The built-in Stop hook calls the packaged canonical CLI command instead. Therefore a missing downstream wrapper is not a doctor/install/reconcile repair item, and setup plans should not ask users to create that file for the standard `phasegate:complete-check` flow.

## WI-202 Strict Quick Mode Install Defaults

`phasegate init --workflow strict` installs a strict workflow without contradicting the bundled quick-implementor scope. The generated `phasegate.config.json` keeps `quickMode.relaxedGates: []` for stricter gates and emits `quickMode.allowedCategories: ["bugfix", "docs", "test", "config"]` so the installed project has an official Quick Mode path for small bugfix, docs, test, and config changes. @work-item-id WI-202

## WI-210 Project Shared Skills Install

<!-- @work-item-id WI-210 -->

`RunInstallUseCase` deploys selected bundled skills into root `skills/` for non-personal installs before creating `.claude/skills` or `.codex/skills` links. The `--skills core|all` option controls which bundled directories are copied and is reflected in deterministic manifest hash inputs for the managed skill entries.

`RunReconcileUseCase` repairs older project installs that contain managed agent skill links but no root skill bodies. The repair deploys the current bundled shared skills and adds granular manifest entries for `skills/.harness-version` and each bundled skill directory. `update-skills` remains an alias of this reconcile path.

Doctor skill checks validate both the agent-facing path and the linked target content. A symlink to `../skills` with an empty target is a red mechanical finding. `RunUninstallUseCase` removes only manifest-managed skill entries and links, so user-owned directories under `skills/` are preserved.

## WI-213 Personal Core Defense Deployment

<!-- @work-item-id WI-213 -->

`RunInstallUseCase` deploys local-only equivalents for personal install: `.claude/CLAUDE.md` for Claude, root `AGENTS.md` for Codex when no team file already owns that path, `.git/hooks/pre-commit`, `.git/hooks/commit-msg`, and `.phasegate-local/docs/folder_management_rules.md` plus `.phasegate-local/docs/principles/*.md`. If Codex personal install finds an existing non-managed `AGENTS.md`, it does not write `AGENTS.override.md` or merge into the team file; the plan/doctor surface a manual readiness gap. The hook templates avoid Husky bootstrap and call the packaged `phasegate` CLI directly. The personal config template points `paths.designDocs` and `paths.inceptionDocs` into `.phasegate-local/`, preserving the no-team-file contract while making validator inputs resolvable. @work-item-id WI-215
## Personal Reference Docs Path Alignment

<!-- @work-item-id WI-214 -->
Personal install config declares local-only reference documentation paths: `.phasegate-local/docs/principles` and `.phasegate-local/docs/folder_management_rules.md`. The personal install target list creates those same files so the manifest, config fallback, hook protection, and validator guidance refer to one path mapping.
