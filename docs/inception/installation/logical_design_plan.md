---
traceability:
  initial_creation: true
---

# 論理設計計画 (横断モード): installation

@work-item-id WI-144

> 起票元: installation unit の横断論理設計の Phase 1 計画
> 関連: `docs/product/units/installation_unit.md` (承認済み), `docs/inception/_shared/installation_unit_design_plan.md` (承認済み), `docs/inception/installation/domain_model_plan.md` (本計画書と同時提出、Phase 2 で domain_model.md を生成)
> 既存固有モード計画: `docs/inception/_cross/WI-145/logical_design_plan.md` (承認済み、WI-145 範囲のみカバー、本計画書は unit 全体 WI-145〜148 をカバー)

## 1. スコープ

### 対象 Unit
`installation` unit 横断 (WI-145 / WI-146 / WI-147 / WI-148 全 sub-WI を含む)

### 設計対象の層

phasegate.config.json の `architecture.preset: "clean"` に従い 4 層 Clean Architecture:

| Layer | 本 unit での具体 |
|---|---|
| **domain** | DeploymentManifest / DiagnosticReport 等の集約・VO、RepairTable、Strategy interface |
| **application** | RunDoctorDiagnosticsUseCase / InstallUseCase / UninstallUseCase / ReconcileUseCase、ManifestRepositoryPort / FileInspectorPort / HashCalculatorPort などの port |
| **infrastructure** | FileSystemManifestRepositoryAdapter / NodeFsFileInspectorAdapter / NodeCryptoHashAdapter |
| **presentation** | `phasegate doctor` / `install` / `uninstall` / `reconcile` の CLI handler |

DB / BFF / Frontend は **本 unit では対象外** (file system のみ操作、DB なし、UI なし)。

### 設計対象 外 (本横断モード非スコープ)
- WI-145 固有の細部 (test fixture 設計など) は `docs/inception/_cross/WI-145/logical_design.md` で扱う (固有モード Phase 2)
- WI-146/147/148 固有の merge/reverse/reconcile strategy の細部は各 sub-WI 固有モードで扱う

## 2. 設計方針

### 2.1 アーキテクチャ層の責務・依存方向

依存方向 (厳守): `domain → application → infrastructure/presentation`
- `domain` は IO を持たない pure functions / value objects
- `application` は domain + port interface を所有、infrastructure を知らない
- `infrastructure` は port を実装する adapter、Node.js fs/crypto を直接呼ぶ
- `presentation` は CLI handler、application use case を呼ぶ、infrastructure adapter を DI で注入する
- `infrastructure` と `presentation` は相互参照禁止 (composition root のみで合流)

### 2.2 技術スタック前提
- TypeScript 5.x (既存 phasegate 継承)
- Vitest 3.x (テストフレームワーク、既存継承)
- Node.js fs/promises (atomic write 用 tmp → rename)
- Node.js crypto (sha256 hash)
- 既存 tsx ベース CLI 起動 (`bin/phasegate`)
- 新規 npm package 依存 **無し** (Q1 で確認)

### 2.3 設計原則

| 原則 | 適用 |
|---|---|
| Pure domain | 集約・VO は IO なし pure function のみ |
| Port driven | 全 IO (file system / hash / process) を application port で抽象化 |
| Strategy pattern | merge/uninstall/reconcile の異質形式統合を domain service strategy で表現 |
| Idempotency | manifest 書き込み・install/uninstall/reconcile は 2 回連続実行で no-op |
| Domain mock 禁止 | CLAUDE.md 規約、application は port mock OK |
| AI 委譲の domain 第一級 | RepairMode / SuggestedSkill を domain 構造に直接組み込む |

### 2.4 単一責任の境界
- doctor (検査) と install/uninstall/reconcile (変更) は **別 use case** に分離。doctor は side-effect free
- merge strategy と uninstall reverse-op は **別 strategy interface** (依存逆方向、互いに知らない)
- presentation 層は CLI parsing と output formatting のみ、ロジックは application に委ねる

## 3. 設計内容サマリー (各層の設計概要)

### 3.1 Domain 層

#### 集約 (domain_model_plan.md §2 と同期)
- `DeploymentManifest` (root) + `DeploymentEntry` (VO)
- `DiagnosticReport` (root) + `DiagnosticFinding` (VO)

#### VO
- `RepairMode = "mechanical" | "ai-assisted" | "manual"`
- `SuggestedSkill = { skillName, rationale, invokeCommand }`
- `Hash` (sha256 hex with `sha256:` prefix)

#### Domain Service / 静的レジストリ
- `RepairTable.lookup(checkId): SuggestedSkill | null` (静的 class、domain pure)
- `HeuristicCheck` interface (各 check の strategy interface、domain layer 配置)
- `MergeStrategy<T>` interface (WI-146 で詳細、domain layer 配置、infrastructure 側で具体 adapter)
- `UninstallReverseStrategy` interface (WI-147 同様)
- `ReconcileStrategy` interface (WI-148 同様)

### 3.2 Application 層

#### Ports (interface)
- `ManifestRepositoryPort`: `load(projectRoot) / save(projectRoot, manifest)`
- `FileInspectorPort`: `readJson / readText / readSymlink / exists`
- `HashCalculatorPort`: `compute(content: string | Buffer): Hash` (sha256 で実装)
- `BackupPort` (WI-146/147): `snapshot(paths[], destDir)` で `.phasegate/backups/` への copy

#### Use Cases
| Use Case | Input | Output | 担当 WI |
|---|---|---|---|
| `RunDoctorDiagnosticsUseCase` | `{ projectRoot, strict }` | `DiagnosticReport` | WI-145 |
| `InstallUseCase` | `{ projectRoot, mode: "dry-run" \| "apply" \| "force" }` | `InstallReport` | WI-146 |
| `UninstallUseCase` | `{ projectRoot, mode: "dry-run" \| "apply" \| "force" }` | `UninstallReport` | WI-147 |
| `ReconcileUseCase` | `{ projectRoot, mode: "dry-run" \| "apply" \| "force" }` | `ReconcileReport` | WI-148 |

各 use case は内部で `RepairMode` 判定を含む。`InstallReport` / `UninstallReport` / `ReconcileReport` は `DiagnosticReport` 同様の集約構造 (Q3 で確認)。

#### Heuristic Check 配置
9 種の `HeuristicCheck` 実装 (domain interface の implementation) は **application layer** に置く。理由: file system port に依存するため。

### 3.3 Infrastructure 層

#### Adapters
- `FileSystemManifestRepositoryAdapter`: `.phasegate/manifest.json` を atomic 書込 (tmp → rename)
- `NodeFsFileInspectorAdapter`: Node.js fs/promises
- `NodeCryptoHashAdapter`: Node.js crypto sha256
- `FileSystemBackupAdapter`: `.phasegate/backups/{ISO-timestamp}/<path>` への cp

#### 既存 `scripts/harness/setup/skill-deployer.ts` の改修
- 既存 deploy 関数群 (`deploySkills` / `deployHookScripts` / `deployHuskyHook` 等) の末尾で deploy 結果 (path + mode) を caller に return
- `main.ts:init` / `update-skills` で結果を集約 → `DeploymentManifest` 構築 → `ManifestRepositoryPort.save`
- 既存 skip された file は entry を作らない (back-compat 維持)

### 3.4 Presentation 層 (CLI Handler)

`main.ts` に以下 case を追加:
- `case "doctor"`: `RunDoctorDiagnosticsUseCase` を起動、`DiagnosticReport` を human / json で出力
- `case "install"`: `InstallUseCase` を起動 (WI-146)
- `case "uninstall"`: `UninstallUseCase` を起動 (WI-147)
- `case "reconcile"`: `ReconcileUseCase` を起動 (WI-148)
- 既存 `case "init"`: WI-148 で deprecation warning 追加、内部実装は `install` 委譲
- 既存 `case "update-skills"`: WI-148 で `reconcile` への alias 化

各 CLI handler は以下の責務に限定:
- 引数 parsing (`--dry-run` / `--apply` / `--force` / `--json` / `--strict`)
- use case 起動と report 受領
- output formatting (human / json)
- exit code mapping (`hasRedFlag → 1, hasWarn → 0 or 1(strict)`)

### 3.5 Test 設計サマリー

#### Unit tests (`scripts/harness/__tests__/unit/installation/`)
- 各集約・VO の constructor / 不変条件検証
- `RepairTable.lookup` の 9 entry full coverage
- 各 `HeuristicCheck` 実装 (FileInspectorPort mock で 9 種)
- 各 Strategy 実装 (WI-146/147/148 で追加)

#### Integration tests (`scripts/harness/__tests__/integration/installation/`)
- `FileSystemManifestRepositoryAdapter` の atomic write (tmpdir fixture)
- 4 種 fixture (`inert-install` / `partial-install` / `full-install` / `no-phasegate`) に対する end-to-end doctor 出力 (golden test)
- WI-146/147/148 で追加 fixture (install merge 後 / uninstall 後 / reconcile 後)

#### Negative tests
- 壊れた manifest JSON
- 権限欠如 (chmod 0)
- symlink 循環

### 3.6 品質評価 (engineering-perspective、Phase 2 で実施)
- SOLID/Clean Architecture: 依存内向き、SRP、DIP の遵守
- コードスメル: Feature Envy / Shotgun Surgery / God Object なし
- ドメイン表現: 論理設計が domain_model.md の概念を正しく反映

## 4. QA（不明点・確認事項）

### [Question] Q1: 新規 npm package 依存の許容範囲

WI-145〜148 実装で新規 npm package を追加するか:

**選択肢 a**: 新規依存ゼロ (Node.js built-in と既存 phasegate 依存のみ)
**選択肢 b**: 必要に応じ追加可 (e.g. YAML parser, JSON5 parser, deep-merge utility)
**選択肢 c**: 既存依存に含まれるものは利用可、新規追加は別途相談

**推奨案**: **a (新規依存ゼロ)**
- 理由 1: phasegate は CLI dogfood ツールで、ユーザー側に npm install 負担を増やしたくない
- 理由 2: 必要な機能 (JSON parse / shell script regex / yaml-add by separate file / hash) は全て Node.js built-in で実装可能
- 理由 3: YAML parser が必要になっても、`.github/workflows/*.yml` は別 file 名追加方式なので parse 不要
- 緩和: もし複雑な merge logic で deep-merge が必要になったら、独自実装 or 既存依存内検索

[Answer]
推奨案 a (新規依存ゼロ) で承認 (2026-05-11)

### [Question] Q2: `InstallReport` / `UninstallReport` / `ReconcileReport` の集約共通基底

WI-146/147/148 で各 use case が返す report を `DiagnosticReport` と共通基底にするか:

**選択肢 a**: 各 report 独立 (DiagnosticReport / InstallReport / UninstallReport / ReconcileReport が並列)
**選択肢 b**: 共通基底 `OperationReport<TEntry>` を持ち、4 種は specialization
**選択肢 c**: DiagnosticReport を全 report の入れ物にする (install/uninstall/reconcile も DiagnosticReport で表現)

**推奨案**: **a (各 report 独立)**
- 理由 1: report の内部構造は use case ごとに異なる (doctor の findings vs install の deployed entries)
- 理由 2: 共通基底 (b) は実装時の boilerplate を減らすが TypeScript の generic 型推論を複雑化する。本 WI スコープでは overkill
- 理由 3: 共通の serialization 形式 (json output schema) は presentation layer で揃える (formatter で共通化)
- 緩和: 共通の base interface `{ overallStatus, exitCode, findings? }` を必要に応じて後付け

[Answer]
推奨案 a (各 report 独立) で承認 (2026-05-11)

### [Question] Q3: 既存 `scripts/harness/setup/skill-deployer.ts` の改修粒度

WI-145 で `init` / `update-skills` に manifest 書き出しを追加する際:

**選択肢 a**: `skill-deployer.ts` の各 deploy 関数を「結果オブジェクト返却」型に変更 (内部 API 変更あり、test 改修要)
**選択肢 b**: `skill-deployer.ts` は変更せず、`main.ts` 側で deploy 結果を別途取得 (重複読み込み)
**選択肢 c**: `skill-deployer.ts` に薄い wrapper を追加して manifest 構築 (関数本体は変更なし)

**推奨案**: **c (薄い wrapper)**
- 理由 1: 既存 deploy 関数の test 群を破壊しない (back-compat 重視、unit_design_plan.md Q2=b と一貫)
- 理由 2: wrapper 内で deploy 関数を呼んだ後、deploy された file の存在確認と hash 計算で manifest entry を構築
- 理由 3: WI-146 で `install` を完全に新規実装した時点で wrapper を削除し、`install` 内で直接 manifest 構築する経路に切り替える

[Answer]
推奨案 c (薄い wrapper) で承認 (2026-05-11)

### [Question] Q4: `--json` 出力 schema の version 管理

CLI の `--json` 出力 schema を将来変更可能にするか:

**選択肢 a**: schema version を json 出力の root に含める (`{"schemaVersion": "1.0", ...}`)
**選択肢 b**: schema 固定、変更時は破壊的
**選択肢 c**: phasegate の version 番号で代替 (`{"phasegateVersion": "0.145.0", ...}`)

**推奨案**: **a (schemaVersion を含める)**
- 理由 1: phasegate version と schema version は独立して進化する (phasegate 0.146 で schema 1.0 を維持する場合がある)
- 理由 2: CI 連携時に consumer 側で schema 互換性を判定可能
- 理由 3: 当面 1.0 固定で、破壊的変更時に 2.0 にする

[Answer]
推奨案 a (`schemaVersion` を含める、当面 1.0 固定) で承認 (2026-05-11)

### [Question] Q5: domain layer での `HeuristicCheck` interface 配置

`HeuristicCheck` interface (9 種実装の domain abstraction) を:

**選択肢 a**: domain layer (interface のみ、実装は application)
**選択肢 b**: application layer (interface + 実装の両方)

**推奨案**: **a (domain layer に interface)**
- 理由 1: `RepairTable` も domain layer にあり、checkId → 結果の判定ロジックは domain pure として扱える
- 理由 2: application layer 実装は port (`FileInspectorPort`) に依存するため application 配置で正しい
- 理由 3: Clean Architecture の DIP に準拠 (domain は具体 IO を知らない)

[Answer]
推奨案 a (domain layer に interface、実装は application layer) で承認 (2026-05-11)

## 5. 前提条件・リスク

### 前提条件
- `installation_unit.md` (Phase 2 成果物) 承認済み
- `domain_model_plan.md` (本計画書と同時提出) の QA 回答が並行で進む
- WI-145 logical_design_plan.md (固有モード Phase 1) の Q1〜Q6 推奨案承認済み

### リスク

| リスク | 影響 | 緩和策 |
|---|---|---|
| 既存 `skill-deployer.ts` 改修で既存 test が壊れる | regression | Q3 で c (薄い wrapper) 採用 |
| WI-146/147/148 で domain 構造が拡張される際に再設計 | 後戻り | Strategy interface 設計を最初から用意、本 WI で骨格を確立 |
| `--json` schema が運用で陳腐化 | CI 連携が壊れる | Q4 で schemaVersion 採用、変更履歴を docs に記載 |
| `RepairTable` の 9 entry マッピングが実運用で不適切 | hint が無効 | WI-148 で config 化検討、本 WI では fixture test でマッピング妥当性を担保 |
| infrastructure / presentation の合流点 (composition root) で循環依存 | build 不可 | main.ts (CLI entry) を composition root として確定、ここで全 DI |

### 既知の依存
- domain-designer Phase 2 (`domain_model.md`) と本横断モード Phase 2 (`logical_design.md`) は並列実行可能だが、domain layer の具体構造確定が先 (Sonnet 委任順序を考慮)

---

## Phase 1 完了宣言

本計画書を出力した時点で Phase 1 は完了。人間にレビューと Q1〜Q5 回答を依頼する。

Phase 2 では:
1. `docs/product/construction/installation/logical_design.md` (横断) を生成
2. その後 `docs/inception/_cross/WI-145/logical_design.md` (WI-145 固有モード Phase 2) を生成 (固有 Phase 1 計画書 Q1〜Q6 は推奨案承認済みなので、横断 logical_design.md ができれば固有も実行可能)

Phase 2 / 3 は `domain_model_plan.md` の Phase 2/3 と組み合わせて連続実行 (本計画書同セットで決定された運用方針)。
