# 統合契約（Integration Contract）

@story-id H08-01
@work-item-id WI-285
設計要素: L0 legacy validator 撤去後の validator-system / agent-integration 境界。

> **作成日**: 2026-03-12
> **Unit定義数**: **17** concrete canonical Unit definitions（world-modelを含む）。filenameは`<kebab-case Unit ID>_unit.md`の単一正本。@work-item-id WI-167, WI-285
> **ストーリー数**: 82（v1） + 5（Future）= 87

---

## 1. 技術スタック概要

| 層 | 技術 | 備考 |
|----|------|------|
| 言語 | TypeScript | v0継承 |
| リンター/フォーマッター | Biome | v0 ESLintから移行（K3） |
| テストフレームワーク | Vitest 3.0.0 | v0継承 |
| パッケージマネージャ | pnpm | v0継承 |
| CI/CD | GitHub Actions | v0継承（aidlc-gate.yml） |
| 設定ファイル | phasegate.config.json (JSON) | Single Source of Truth（K13） |
| Git Hooks | Claude Code Hooks / Husky | v0継承 + v1拡張 |

---

## 2. 共有データフォーマット

### 2.1 Shared Kernel

#### HarnessError型

全バリデータが統一フォーマットでエラーを報告する。定義元: **harness-error**、利用: **全Unit**。

```typescript
interface HarnessError {
  code: string;          // e.g., "L1-001", "L2-001"
  severity: "error" | "warning";
  message: string;       // 人間可読な説明
  suggestion: string;    // 修正方法の提案
  adr_ref?: string;      // 関連ADRへの参照 e.g., "ADR-003"
  fix_example?: string;  // 修正コード例（AIエージェントの自己修正用）
  suggested_skill?: string;    // 次に起動すべき skill 名
  scaffold_command?: string;   // 雛形生成や修復に使う CLI 例
  template_path?: string;      // 参照テンプレート path
}
```

<!-- @work-item-id WI-149 -->
`suggested_skill`, `scaffold_command`, and `template_path` are additive recovery metadata. Consumers must continue to accept HarnessError payloads where these fields are absent.

#### HarnessConfigV2型

品質設定のSingle Source of Truth。定義元: **config-foundation**、利用: **全Unit**。

```typescript
interface HarnessConfigV2 {
  project: { name: string; preset: "minimal" | "standard" | "strict" };
  layers: {
    L1: { enabled: boolean; rules: Record<string, "error" | "warning" | "off"> };
    L2: { enabled: boolean; validators: string[] };
    L3: { enabled: boolean; validators: string[]; coverageThreshold: number };
    L4: { enabled: boolean; validators: string[]; schedule: string };
  };
  quickMode: {
    allowedCategories: string[];
    maintainedLayers: string[];
    relaxedGates: string[];
  };
  phaseDependencies: {
    preset: "default" | "custom";
    override: boolean;
    customRules: { phase: string; requires: string[] }[];
  };
  planningMode: {
    default: "interactive" | "embedded-qa";
    perPhase: Record<string, "interactive" | "embedded-qa">;
  };
  harnesses: {
    agentLessonCollection: boolean;
    cascadeUpdate: boolean;
    bundleSizeLimit: number;
    deadCodeGC: boolean;
  };
  paths: { designDocs: string; inceptionDocs: string };
  reporting: { format: string; outputDir: string };
}
```

#### @unit/@layerメタデータ仕様

定義元: **traceability-model**、利用: **biome-ast-engine, validator-system**。

| メタデータ | 記載箇所 | 検証バリデータ |
|-----------|---------|--------------|
| `// @unit {unit_name}` | 実装ファイル（必須） | L1 require-unit-comment, L2 metadata |
| `// @layer {layer_name}` | 実装ファイル（必須） | L1 require-layer-comment, L2 metadata |
| `@story-id HXX-XX` | 設計文書の累積更新時（例: `@story-id H03-02`） | L2 metadata |
| `// @story HXX-XX` | テストファイル（例: `// @story H03-03`） | L3 nyquist |

> **ストーリーID体系**: v1では`HXX-XX`形式を正規IDとする。v0の`US-XXX`形式は`旧US`として参照のみ保持。traceability-modelがStoryId値オブジェクトとして正規定義を所有する。

#### Layer依存方向

定義元: **architecture-philosophy.md**、検証: **biome-ast-engine（L1 no-layer-violation）**。

```
domain ← application ← infrastructure
domain ← application ← presentation
```

domain層は外部に依存しない。application層はdomain層のみに依存する。infrastructure/presentation層はapplication層とdomain層に依存可能。

#### Folder structure

定義元: **folder_management_rules.md**、検証: **biome-ast-engine（L1 enforce-folder-structure）**。

#### Phase Dependency 3層構造

定義元: **phase-dependency-model**、検証: **validator-system（L2 phase-gate）**。

| Level | スコープ | plan配置先 | 前提条件 |
|-------|---------|-----------|---------|
| Level 1 | Product全体設計（横断的・初回） | `inception/_shared/` | （起点） |
| Level 2 | Unit横断設計（Unit単位） | `inception/{unit}/` | Level 1のunit-designerが該当Unitを定義済み |
| Level 3 | ストーリー実装（ストーリー単位） | `inception/{unit}/{HXX-XX}/` | Level 2の該当Unit設計完了済み |

### 2.2 Cross-Unit Contracts

| 契約 | 所有Unit | 消費Unit | 内容 |
|------|---------|---------|------|
| **Harness API Response DTO** | harness-api | agent-integration, ci-governance, regression-suite | CLI出力のJSON構造 `{ status, errors[], summary, data }` |
| **Validator ID Registry** | validator-system | harness-api, quick-mode, config-foundation, skill-quality, ci-governance, regression-suite, phase2-extensions | 現行正本: L2 `L2-001`, `L2-002`, `L2-003`, `L2-013`, `L2-014`, `L2-015`; L3 `L3-001`..`L3-004`; L4 `L4-001`..`L4-005`。L4-004/L4-005 は phase2-extensions 由来だが validator-system registry に登録済み。実行インターフェース含む。@work-item-id WI-168 |
| **Preset ID Registry** | config-foundation | harness-api, quick-mode, validator-system, ci-governance, regression-suite | プリセットID（minimal/standard/strict）と有効レイヤー定義 |
| **RequirementTestMatrix Schema** | nyquist-validation | skill-quality (test-coverage-checker), harness-api, regression-suite | requirement-test-matrix.jsonのJSONスキーマ |
| **AGENTS.md Schema** | ci-governance | regression-suite | AGENTS.mdの最終文書構造定義（ポインタ型） |
| **LessonArtifact Schema** | ci-governance | skill-quality (Agent-Lesson出力フォーマット) | lesson artifactのJSON構造定義。skill-qualityがこのスキーマに準拠してartifactを出力し、ci-governanceが消費してAGENTS.mdに集約反映 |
| **ADR Frontmatter Schema** | adr-foundation | harness-error (adr_ref), ci-governance (ADRリンク), validator-system (adr_ref検証) | ADRフロントマターのYAML構造 |
| **CLI Command Registry** | harness-api | agent-integration, ci-governance (ポインタ実在検証), Future: phase2-extensions | 全CLIコマンド名・入出力仕様・終了コード定義（`phasegate:lint`、`phasegate:complete-check`含む）。Future Unitはコマンド拡張ポイントとして消費 |
| **Phase Dependency 3層構造** | phase-dependency-model | validator-system (L2 phase-gate), regression-suite (K2/K14回帰テスト) | Level 1→2→3の前提条件・成果物定義 |
| **@unit/@layerメタデータ仕様** | traceability-model | biome-ast-engine (L1), validator-system (L2 metadata), skill-quality (Cascade Updater), regression-suite | メタデータアノテーション仕様 |
| **AcCoverageGatePolicy** | nyquist-validation | validator-system (L2 phase-gateバリデータが実行) | ACマッピング完了判定ロジック |
| **RuleViolation Contract** | biome-ast-engine | validator-system (L1結果参照) | `{ filePath, line, column, ruleName, message, severity, fix_example? }` |
| **Traceability World Read DTO** | traceability-model | world-model | Unit / Story / AC / WorkItem / TestReferenceのcanonical owner IDとprovenanceをplain DTOで公開する。world-modelはprovider domain modelをimportしない。<!-- @work-item-id WI-285 --> |
| **Matrix World Read DTO** | nyquist-validation | world-model | Story / AC / TestReference indexをowner-defined plain projectionで公開する。matrix ownershipはnyquist-validationに残る。<!-- @work-item-id WI-285 --> |
| **Attestation Evidence Read DTO** | attestation | world-model | gate-run evidenceとverification statusをplain DTOで公開する。signature bytes、self digest、volatile metadataはWorld projection対象外。<!-- @work-item-id WI-285 --> |
| **Integrity Declaration Read DTO** | ci-governance | world-model | instruction corpusのtarget / digest declarationをplain DTOで公開する。integrity lifecycleとraw-byte digest contractはci-governanceが所有する。<!-- @work-item-id WI-285 --> |
| **SHA-256 Capability** | attestation public facade | attestation, world-model | `Uint8Array -> sha256:<64 lowercase hex>`のplain capability。各consumerがlocal port / Digestへadaptし、attestation内部port / VOを公開しない。<!-- @work-item-id WI-285 --> |
| **World Snapshot / Evaluation Facade** | world-model | validator-system, harness-api / top-level composition | Snapshot / diagnostic / policy-free WCR evaluation / obligation DTOを公開する。validator-systemがgate execution、severity、blocking policyを所有する。<!-- @work-item-id WI-285 --> |

#### Harness API Response DTO

```typescript
interface HarnessApiResponse<T = unknown> {
  status: "pass" | "fail" | "error";
  errors: HarnessError[];
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  data?: T;  // コマンド固有のpayload型（例: PhaseInfo, DriftReportSummary, CiCheckResult）
}
```

> **共通envelope + payload型パターン**: 全コマンドのJSON出力は共通envelope `{ status, errors[], summary }` を持ちつつ、コマンド固有のpayload型を `data` フィールドに格納する。例: `phasegate:check-phase` → `data: PhaseInfo`、`phasegate:detect-drift` → `data: DriftReportSummary`、`phasegate:ci-check` → `data: CiCheckResult`。

#### RequirementTestMatrix Schema

```typescript
interface RequirementTestMatrix {
  stories: {
    storyId: string;      // e.g., "H01-01"
    acs: {
      acId: string;       // e.g., "AC-1"
      tests: {
        file: string;     // テストファイルパス
        type: "unit" | "it" | "scenario";
      }[];
    }[];
  }[];
}
```

#### ADR Frontmatter Schema

```yaml
---
adr_id: "NNN"                                          # ADR識別子（例: "001"）
title: "ADR title"
status: Proposed | Accepted | Deprecated | Superseded
date: "YYYY-MM-DD"
superseded_by: "optional ADR reference"                # Superseded時のみ必須
archgate:                                              # optional: ADR→HarnessError紐付け
  enforced_by:
    - validator_id: "L1-001"
      error_code: "L1-001"
---
```

---

## 3. CLI APIエンドポイント一覧

### 3.1 harness-api所有コマンド

| コマンド | 説明 | 入力 | 出力 | 終了コード |
|---------|------|------|------|-----------|
| `phasegate:check-ready` | 全storyのPhase Gate通過状態を返却 | なし | HarnessApiResponse（Phase Gate通過状態） | 0: 全通過 / 1: 未通過あり / 2: エラー |
| `phasegate:check-phase <unit>` | 指定Unitの現在フェーズを返却 | Unit名 | PhaseInfo（Level/スキル名） | 0: 正常 / 1: Unit未検出 / 2: エラー |
| `phasegate:ci-check` | 全L3バリデータの統合実行 | なし | CiCheckResult（バリデータ別Pass/Fail + HarnessError一覧） | 0: Pass / 1: Fail / 2: エラー |
| `phasegate:detect-drift` | 設計⇔コード双方向乖離検出 | `--json`（オプション） | DriftReportSummary（方向/unit/要素/推奨アクション） | 0: 正常（drift findings は advisory） / 2: エラー |
| `phasegate:status` | ハーネス全体の健全性サマリー | `--json`（オプション） | HarnessStatusSummary（`configurationState` / `cachedArtifactState` / `liveValidationState` を含む L1-L4健全性/Phase Gate/Preset/設定） | 0: 正常 / 2: エラー |
| `phasegate:lint` | L1 Biomeバリデータ実行 | なし | HarnessApiResponse | 0: Pass / 1: Fail / 2: エラー |
| `phasegate:complete-check` | L1-L4全バリデータ統合実行 | なし | HarnessApiResponse | 0: Pass / 1: Fail / 2: エラー |
| `phasegate:impact-analysis <HXX-XX>` | 変更影響テストケース特定 | ストーリーID（HXX-XX形式） | ImpactAnalysisResult | 0: 正常 / 1: ストーリー未検出 / 2: エラー |

> **実行ロジック所有**: `phasegate:lint` → biome-ast-engine、`phasegate:ci-check` / `phasegate:complete-check` / `phasegate:detect-drift` → validator-system + biome-ast-engine、`phasegate:status` → config-foundation + validator-system、`phasegate:impact-analysis` → nyquist-validation

<!-- @work-item-id WI-151, WI-158 -->
Status and drift commands emit JSON to stdout and separate configured state, cached artifacts, and live validation result. Persisted report paths are command-specific; do not infer `reporting.outputDir` from this CLI envelope.

### 3.2 config-foundation所有コマンド

| コマンド | 説明 | 入力 | 出力 | 終了コード |
|---------|------|------|------|-----------|
| `phasegate:enable <feature>` | GSD由来品質機能の個別有効化 | 機能名 | 有効化結果メッセージ | 0: 成功 / 1: 機能名不明 / 2: エラー |
| `phasegate:disable <feature>` | GSD由来品質機能の個別無効化 | 機能名 | 無効化結果メッセージ | 0: 成功 / 1: 機能名不明 / 2: エラー |

### 3.3 終了コード規約（全コマンド共通）

| コード | 意味 |
|--------|------|
| 0 | 正常 / Pass |
| 1 | Fail / 対象未検出 |
| 2 | 実行エラー |

### 3.4 world-model所有コマンド（H-17で段階実装）

<!-- @work-item-id WI-285 -->

| コマンド | 既定mode | 明示副作用 | exit 1 | exit 2 |
|---|---|---|---|---|
| `world:inspect` | read-only snapshot | なし | snapshot生成後にhard extraction diagnosticあり | config / schema / I/O / hashing failureでsnapshot不能 |
| `world:pin` | preview-only | `--apply`で`phasegate.world-constraints.json`をatomic update | endpoint missing / duplicate / ambiguous、malformed declaration | usage / unknown schema / invalid config / I/O / hashing failure |
| `world:derive` | pure / read-only | `--write [--out <path>]`でobligation reportをatomic write | blocking obligationまたはpolicy cleanup required | trustworthy evaluationを作れないusage / config / schema / I/O / hashing failure |

三commandは`--format human|json`と`--json` aliasを受理する。primary resultはstdout、usage / process failureはstderrへ出す。JSONは`phasegate-world-cli/v1` envelope一件だけを出力する。実装時はmain dispatch、harness-api known-command registry、help / conformance testを同じcommitで更新する。

---

## 4. Unit依存関係図

### 4.1 依存関係図

```
Wave 1（基盤 — 型・契約の先行定義により並列開発可能）
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  [仕様確定依存: Wave開始前にインターフェースを先行定義]               │
│  ┌─────────────────────────────────────────────────────────┐         │
│  │ HarnessError型 (harness-error)                          │         │
│  │ HarnessConfigV2型 (config-foundation)                   │         │
│  │ → 型定義のみ先行。実装は各Unitで並列進行               │         │
│  └─────────────────────────────────────────────────────────┘         │
│                                                                      │
│  biome-ast-engine    phase-dependency-model   traceability-model     │
│  (独立)              (独立)                   (独立)                 │
│                                                                      │
│  config-foundation   adr-foundation           harness-error          │
│  (独立)              (独立)                   (独立)                 │
│                                                                      │
│  ※ harness-error → config-foundation の実装時依存あり               │
│  （fix_example検証でバリデータ実行にconfig必要）                     │
│  → 型定義の先行確定により、実装フェーズも並列可能                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

Wave 2（コア品質機構）
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  [並列グループA]                                                     │
│  validator-system ←── phase-dependency-model（L2 phase-gate）       │
│       │           ←── traceability-model（L2 metadata）             │
│       │           ←── harness-error（エラーフォーマット）            │
│       │           ←── config-foundation（閾値・有効/無効設定）       │
│       │           ←── biome-ast-engine（L1結果参照）                 │
│       │                                                              │
│  nyquist-validation ←── traceability-model（@story連携）            │
│       │                                                              │
│  quick-mode ←── config-foundation（quickMode設定）                  │
│             ←── validator-system（バリデータ選択実行）               │
│                                                                      │
│  [順序依存グループ]                                                  │
│  harness-api ←── validator-system（バリデータ実行）                 │
│              ←── config-foundation（設定読取）                      │
│              ←── validator-system:L4 drift-detect（乖離レポート）   │
│              ※ lint / complete-check コマンドも本Unit所有            │
│       │                                                              │
│  agent-integration ←── harness-api（CLI契約を呼び出す薄いAdapter） │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

Wave 3（拡張・運用・保証）
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  skill-quality ←── nyquist-validation（Nyquist統合）                │
│                ←── traceability-model（@story-id自動付与）          │
│                ←── validator-system（L1+L2 Atomic commit前チェック） │
│                ※ AGENTS.mdに直接書かず、lesson artifactを出力       │
│                                                                      │
│  ci-governance ←── harness-api（phasegate:statusポインタ）            │
│                ←── harness-error（反復エラー検出）                  │
│                ←── adr-foundation（ADR参照リンク）                  │
│                ←── skill-quality（lesson artifact消費→AGENTS.md集約）│
│                                                                      │
│  regression-suite                                                    │
│    Phase A (H14): Wave 2後半から設計開始可能                         │
│      ←── Wave 1全Unit（回帰テスト対象）                            │
│    Phase B (H15): 全v1 Unit完了後に着手                             │
│      ←── 全Wave 1-2 Unit（v0テスト移植対象）                       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

Future
┌──────────────────────────────────────────────────────────────────────┐
│  phase2-extensions ←── validator-system（L4拡張）                   │
│                    ←── harness-api（CLI拡張）                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 依存種別の定義

| 種別 | 説明 | 例 |
|------|------|---|
| 仕様確定依存（型・契約） | Wave開始前にインターフェースのみ先行定義 | HarnessError型、HarnessConfigV2型 |
| 実装時依存（モジュール呼出） | 実行時に他Unitのモジュールを呼び出す | harness-api → validator-system |

### 4.3 World Model import方向

<!-- @work-item-id WI-285 -->

```text
traceability-model public DTO ───────────────┐
nyquist-validation matrix public DTO ───────┤
attestation evidence / SHA public facade ───┼─> world-model infrastructure adapters
ci-governance integrity public DTO ─────────┘                 │
                                                              v
                                                   world-model application/domain
                                                              │
                                                              v
validator-system infrastructure adapter <── world-model public evaluation facade
harness-api / top-level composition       <── world-model handlers / plain DTO
```

- anti-corruption adapterはconsumerであるworld-modelのinfrastructure層に置く。
- world-model domain / applicationはconsumer-owned portだけに依存し、providerのdomain / infrastructure / composition-rootをimportしない。
- validator-systemはworld-model public evaluation facadeをinfrastructure adapterから消費し、WCR findingをgate policyへ写像する。
- attestation v2へ将来`worldSnapshotRoot`を渡す場合はtop-level compositionがprimitive DTOを注入し、attestationからworld-modelをimportしない。

---

## 5. Wave実行計画

| Wave | Unit群 | US数 | 並列グループ | 順序依存 | 前提条件 |
|------|--------|------|-------------|---------|---------|
| **Wave 1**: 基盤構築 | biome-ast-engine, phase-dependency-model, traceability-model, config-foundation, adr-foundation, harness-error | 27 | 全6 Unitが並列開発可能 | なし | **型定義の先行確定**: HarnessError型・HarnessConfigV2型のインターフェースをWave開始前に合意 |
| **Wave 2**: コア品質機構 | nyquist-validation, validator-system, harness-api, quick-mode, agent-integration | 24 | nyquist-validation, validator-system, quick-modeは並列可能 | harness-api → agent-integration の順序推奨 | validator-system, nyquist-validationの主要インターフェースが確定後にharness-api着手 |
| **Wave 3**: 拡張・運用・保証 | skill-quality, ci-governance, regression-suite, installation, attestation capability | 19 | Unitごとの既存contractに従う | regression-suite Phase Bは全v1 Unit完了後 | H-12〜H-16のowner contractを維持 |
| **Wave 4**: World Model | world-model + provider public facades | 12 | WM-06 / 07 / 08、WM-09 / 10 / 12の分離範囲のみ | composition-root / CLI / application統合点はdelivery plan順に直列 | ADR-031〜037とWM-05 product設計完了 |
| **Future** | phase2-extensions | 5 | — | — | v1全Unit完了後 |

---

## 5.5 installation (新規 / WI-144 系)

> **Unit ID**: installation
> **担当 WI**: WI-145 / WI-146 / WI-147 / WI-148
> **Wave**: 3（品質防御メタ層）
> **詳細**: `docs/product/units/installation_unit.md` 参照

phasegate 自身の deploy 状態管理 / 構造健全性検査 / 既存ファイルへの structured merge / clean uninstall を担当する Bounded Context。

- **公開 API**: `phasegate doctor` (WI-145), `phasegate install` (WI-146), `phasegate uninstall` (WI-147), `phasegate reconcile` (WI-148) の 4 CLI コマンド
- **永続データ**: `.phasegate/manifest.json` (DeploymentManifest schema)
- **依存**: harness-api (CLI presentation) ← installation → {agent-integration, ci-governance, config-foundation}
- **WI-146 API**: `phasegate install --dry-run|--apply [--force] [--json]` は `.claude/settings.json` / `.codex/hooks.json` / `.husky/*` / `.github/workflows/phasegate-aidlc-gate.yml` / `package.json` / agent skill symlink を structured merge し、結果を manifest に `created` / `merged` / `symlink` として記録する。
- **WI-147 API**: `phasegate uninstall --dry-run|--apply [--force] [--json]` は manifest entries を読み、`created` / `symlink` entries を削除し、`merged` entries は JSON hooks / shell managed block / `package.json` phasegate scripts-devDependency だけを除去する。hash mismatch は force 無しで refuse し、force 時は `.phasegate/backups/uninstall-*/` に snapshot を保存する。完了後 `.phasegate/manifest.json` は `.phasegate/uninstalled-*.json` に rename される。
- **WI-148 API**: `phasegate reconcile --dry-run|--apply [--force] [--json]` は manifest entries と現行 bundled templates を比較し、`merged` entries の PhaseGate managed portion、`created` entries の unmodified files、manifest に無い新規 deploy target を現行 version に追従する。hash mismatch は force 無しで refuse し、force 時は `.phasegate/backups/reconcile-*/` に snapshot を保存する。apply 後は `.phasegate/manifest.json` の version/hash を更新する。`phasegate update-skills` は互換 alias として同 use case に委譲する。

## 5.6 world-model（WI-285 / H17）

<!-- @work-item-id WI-285 -->

> **Unit ID**: world-model
> **担当 Story**: H17-01〜H17-12
> **Wave**: 4
> **詳細**: `docs/product/units/world-model_unit.md` 参照

設計文書、source、generated artifact、external declarationをowner facade経由で観測し、typed factの組立、canonical Snapshot、WCR構造制約評価、immutable obligation report導出を担当するBounded Context。gate実行、severity、blocking policyはvalidator-systemに残す。

- **受信契約**: traceability-model / nyquist-validation / attestation / ci-governanceのplain DTO public facadeと、attestation public SHA-256 capability。provider内部のdomain / infrastructure型はimportしない。
- **公開契約**: Snapshot / extraction diagnostic / policy-free WCR finding / obligation DTO、および`world:inspect`、`world:pin`、`world:derive` handler。
- **control inputs**: repository rootの`phasegate.world-constraints.json`、`phasegate.world-baseline.json`、`phasegate.world-waivers.json`、`phasegate.world-debts.json`。いずれもversioned external declarationであり、generated reportとは分離する。
- **generated output**: `.harness/world-obligations.json`。毎回再導出し、手編集値を入力へ戻さない。既定ではGit追跡しない。
- **validator接続**: 将来のL2-017 / L3-008 adapterがWorld evaluation facadeを消費する。world-modelはvalidator-systemをimportせず、登録とblockingPolicyはPhase Cでvalidator-systemが所有する。
- **実装順序**: WM-06〜17をH17-01〜12へ1対1でbindingし、provider facade、domain、extractor、graph、constraints、policy inputs、CLI、self-repo adoptionを段階的に実装する。

---

## 6. Future Extension Points

### 6.1 agent-integration: Runtime hook 登録インターフェース

L0 相当の runtime enforcement を追加する場合の拡張ポイント。agent runtime hook と Husky hook の登録・配布経路を通じて追加し、Validator ID Registry には登録しない。

### 6.2 harness-api: CLIコマンド拡張ポイント

CLI Command Registryへの新規コマンド登録API。Future Unitが新たなCLIコマンドを追加する際、harness-apiのCommandRegistryに登録する。コマンド名の一意性は自動検証。

### 6.3 config-foundation: Hook 設定拡張

runtime hook の設定項目を追加する場合の拡張ポイント。validator layer 設定は `layers.L1`〜`layers.L4` を対象とし、L0 hook は agent / git hook 側の設定で扱う。

### 6.4 phase2-extensions: L4バリデータ追加

doc-freshness-checker、pointer-validatorをL4バリデータとして追加。validator-systemのValidator ID Registryに新規ID（L4-004〜）で登録。

---

## 7. 非交渉要件（K1-K15） → Unitマッピング

| K# | 要件 | Primary Unit | Supporting Units |
|----|------|-------------|-----------------|
| K1 | 4層防御モデル（L1-L4）。将来 L0（OS-level enforcement）追加時は 5 層に拡張 | **validator-system** | biome-ast-engine (L1), config-foundation (layers設定), harness-api (status/complete-check) |
| K2 | Phase Gate | **phase-dependency-model** | validator-system (L2 phase-gate実行), harness-api (check-ready/check-phase) |
| K3 | Biome AST解析 | **biome-ast-engine** | harness-api (phasegate:lint), agent-integration (phasegate:lint経由) |
| K3.5 | @unit/@layer/@story-idメタデータ | **traceability-model** | biome-ast-engine (L1 require-*-comment), validator-system (L2 metadata), skill-quality (Cascade Updater) |
| K4 | テスト品質ルール | **validator-system** | — |
| K5 | DDD設計スキル群 | **skill-quality** | — |
| K6 | 2-Phase Execution | **phase-dependency-model** | validator-system (phase-gate検証) |
| K7 | Document Split（inception/product） | **traceability-model** | phase-dependency-model (3層構造のplan配置先) |
| K8 | Cascade Updater | **skill-quality** | traceability-model (@story-id追跡) |
| K9 | Agent-Lesson System | **skill-quality** | ci-governance (AGENTS.md集約反映) |
| K10 | Security/Performance検出 | **validator-system** | harness-api (ci-check実行) |
| K11 | Drift Detection | **validator-system** | harness-api (detect-driftコマンド) |
| K12 | Consistency Checker | **validator-system** | — |
| K13 | phasegate.config.json | **config-foundation** | harness-api (status表示), validator-system (閾値参照) |
| K14 | Phase Dependency Model | **phase-dependency-model** | config-foundation (phaseDependencies設定), validator-system (phase-gate検証) |
| K15 | Plan文書の必須生成 | **phase-dependency-model** | validator-system (phase-gate: plan文書存在チェック) |

---

## 8. 認証認可

Phasegateはローカル開発ツールキットであり、認証認可機構は持たない。

- **コマンド制御**: Claude Code deny-check.sh / シェルラッパーによる破壊的コマンドブロック
- **設定変更制御**: PreToolUse Hookによるリンター設定ファイル保護
- **プロジェクトローカル**: `~/.claude/`へのグローバルインストール不可（Go/No-Go Gate #6）

---

## 9. バリデータID一覧

### L1 — Biome ASTルール（biome-ast-engine）

| ID | ルール | 検出対象 |
|----|--------|---------|
| L1-001 | require-unit-comment | `// @unit` コメントのないソースファイル |
| L1-002 | require-layer-comment | `// @layer` コメントのないソースファイル |
| L1-003 | no-layer-violation | レイヤー境界を越えるimport |
| L1-004 | enforce-folder-structure | アーキテクチャに違反するファイル配置 |
| L1-005 | no-any-abuse | `any`型の過剰使用 |
| L1-006 | no-code-duplication | 構造的に重複するコードブロック |
| L1-007 | no-ghost-file | importされないが存在するファイル |
| L1-008 | no-comment-flood | 過剰なコメント |

<!-- @work-item-id WI-265 — L1-006/L1-007/L1-008 を canonical レジストリ（rule-definition-registry.ts）に整合。旧表記（L1-006=no-ghost-file, L1-007=no-comment-flood, L1-008=no-code-duplication）はドメイン非整合だったため訂正 -->


### L2 — Pre-commitバリデータ（validator-system）

| ID | バリデータ | 検出対象 |
|----|-----------|---------|
| L2-001 | phase-gate | Phase Dependency 3層構造の前提条件違反 |
| L2-002 | metadata | @unit/@layer/@story-id/@storyメタデータの完全性 |
| L2-003 | test-quality | AAA/actual命名/single-act/no-domain-mock/E2E seed/describe-it規約 |
| L2-017 | world-constraints（予約） | World WCR findingのL2 gate写像。WM-19まで未登録・未実装 |

### L3 — CIバリデータ（validator-system）

| ID | バリデータ | 検出対象 |
|----|-----------|---------|
| L3-001 | security | ハードコード秘密情報、SQLインジェクション |
| L3-002 | performance | ループ内await、N+1、bundleSizeLimit |
| L3-003 | coverage | カバレッジ閾値未達（standard: 90%, strict: 95%） |
| L3-004 | nyquist | 要件→テスト双方向トレーサビリティ欠落 |
| L3-008 | world-constraints（予約） | World WCR findingのL3 CI gate写像。WM-20まで未登録・未実装 |

### L4 — Scheduledバリデータ（validator-system）

| ID | バリデータ | 検出対象 |
|----|-----------|---------|
| L4-001 | drift-detect | 設計⇔コード双方向乖離 |
| L4-002 | consistency-check | 文書間レイヤー整合性破綻 |
| L4-003 | dead-code | 未使用エクスポート、到達不能コード |
