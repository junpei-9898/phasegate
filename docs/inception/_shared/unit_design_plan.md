# Unit設計計画

> **ステータス**: Phase 1（計画）— codexレビュー反映済み・人間承認待ち
> **作成日**: 2026-03-12
> **入力**: `docs/product/user_stories.md`（62 US / 17 Epic）
> **参考**: `docs/product/archive/units/`（v0の13 Unit + 統合契約）
> **レビュー**: codex (gpt-5.4) — 評価C → 5件指摘を反映済み

---

## 1. スコープ

- **対象ストーリー数**: 62（v1: 54, Future: 8）
- **Epic数**: 17（H-01〜H-15 + H-F1〜H-F2）
- **Wave構成**: Wave 1（基盤構築 18 US）/ Wave 2（コア品質機構 22 US）/ Wave 3（拡張・運用・保証 14 US）/ Future（8 US）
- **プロダクト**: GSDLC Quality Harness — エージェント非依存の品質防御ツールキット
- **コアドメイン**: 4層防御モデル（L1-L4）、Phase Dependency Model、Traceability Model

---

## 2. グルーピング方針

### 2.1 分割原則

1. **ドメイン凝集性**: 同一の業務概念・ユビキタス言語を共有するストーリーを1 Unitに集約
2. **独立デプロイ可能性**: Unit間の依存を最小化し、Wave内での並列開発を可能にする
3. **変更理由の単一性**: 1つの変更理由が1つのUnitに閉じるよう分割
4. **v0アーカイブとの対応**: v0の13 Unit構造を参考にしつつ、新ストーリー構造に最適化

### 2.2 v0→v1の主要変更点

| 観点 | v0（アーカイブ） | v1（今回） |
|------|-----------------|-----------|
| スコープ | 品質+オーケストレーション混在 | 品質ハーネスのみ |
| Unit数 | 13（統合契約記載） | 14（v1） + 2（Future）|
| オーケストレーション系 | context-engineering, session-lifecycle, orchestration-commands | 移管済み（スコープ外）|
| 新規追加 | — | phase-dependency-model, traceability-model, harness-api, validator-system, ci-governance |
| 統合 | — | H-14 + H-15 → regression-suite |

### 2.3 Shared Kernel（全Unit共通の共有カーネル）

| 概念 | 定義元Unit | 利用Unit |
|------|-----------|---------|
| `HarnessError` 型 | harness-error | 全Unit |
| `HarnessConfigV2` 型 | config-foundation | 全Unit |
| `@unit/@layer` メタデータ仕様 | traceability-model | biome-ast-engine, validator-system |
| Layer依存方向 | architecture-philosophy.md | biome-ast-engine |
| Folder structure | folder_management_rules.md | biome-ast-engine |
| Phase Dependency 3層構造 | phase-dependency-model | validator-system (phase-gate) |

### 2.4 Cross-Unit Contract（Unit間公開契約）

> codexレビュー指摘3への対応: Shared Kernelだけでは横断契約が不足するため、Public Contractを別途定義

| 契約 | 所有Unit | 消費Unit | 内容 |
|------|---------|---------|------|
| **Harness API Response DTO** | harness-api | agent-integration, ci-governance | CLI出力のJSON構造（status/errors/summary） |
| **Validator ID Registry** | validator-system | harness-api, quick-mode, config-foundation | バリデータID一覧（L1-001〜L4-003）と実行インターフェース |
| **Preset ID Registry** | config-foundation | harness-api, quick-mode, validator-system | プリセットID（minimal/standard/strict）と有効レイヤー定義 |
| **RequirementTestMatrix Schema** | nyquist-validation | skill-quality (test-coverage-checker), harness-api | requirement-test-matrix.jsonのJSONスキーマ |
| **AGENTS.md Schema** | ci-governance | skill-quality (Agent-Lesson) | AGENTS.mdの構造定義。skill-qualityはlesson artifactを出力し、ci-governanceがAGENTS.mdに集約反映 |
| **ADR Frontmatter Schema** | adr-foundation | harness-error (adr_ref), ci-governance (ADRリンク) | ADRフロントマターのYAML構造 |
| **CLI Command Registry** | harness-api | agent-integration | 全CLIコマンド名・入出力仕様・終了コード定義（`harness:lint`、`harness:complete-check`含む） |

---

## 3. Unit一覧（ドラフト）

### Wave 1: 基盤構築（6 Unit / 18 US）

| # | Unit名 | Epic | US数 | 担当ストーリーID | 責務概要 |
|---|--------|------|------|-----------------|---------|
| 1 | **biome-ast-engine** | H-01 | 3 | H01-01, H01-02, H01-03 | L1 Biomeプラグイン（コア4ルール + AIアンチパターン4ルール）、CI統合、ESLint完全除去 |
| 2 | **phase-dependency-model** | H-02 | 3 | H02-01, H02-02, H02-03 | 3層フェーズ構造定義、Planning Mode、phase-gateバリデータ拡張、Phase Dependencyカスタマイズ |
| 3 | **traceability-model** | H-03 | 3 | H03-01, H03-02, H03-03 | @unit/@layer/@US-XXX/@storyメタデータ体系、L2 metadataバリデータ、逆引きチェーン検証 |
| 4 | **config-foundation** | H-04 | 3 | H04-01, H04-02, H04-03 | harness.config.json v2スキーマ、Preset System（minimal/standard/strict）、harness:enable/disable |
| 5 | **adr-foundation** | H-05 | 3 | H05-01, H05-02, H05-03 | ADRテンプレート、初期ADR 11件作成、ステータス管理、フロントマターバリデーション |
| 6 | **harness-error** | H-06 | 3 | H06-01, H06-02, H06-03 | HarnessError統一フォーマット、fix_example品質保証、severity権限契約 |

### Wave 2: コア品質機構 + エージェント統合（5 Unit / 22 US）

| # | Unit名 | Epic | US数 | 担当ストーリーID | 責務概要 |
|---|--------|------|------|-----------------|---------|
| 7 | **nyquist-validation** | H-07 | 4 | H07-01, H07-02, H07-03, H07-04 | requirement-test-matrix.json、ACマッピングチェック、要件カバレッジ算出、impact-analysisコマンド |
| 8 | **validator-system** | H-08 | 6 | H08-01〜H08-06 | L2 test-quality、L3 security/performance/coverage、L4 drift-detect/consistency-check/dead-code。内部は`l2/` `l3/` `l4/`サブモジュールに分離 |
| 9 | **harness-api** | H-09 | 4 | H09-01〜H09-04 | CLIコマンド群（check-ready/check-phase/ci-check/detect-drift/status + **lint + complete-check**）。全CLIコマンドの入出力仕様と終了コードを所有 |
| 10 | **quick-mode** | H-10 | 4 | H10-01〜H10-04 | Quick Mode設定・判定エンジン・バリデータ緩和実行・quick-implementor |
| 11 | **agent-integration** | H-11 | 4 | H11-01〜H11-04 | CLI/FSフォールバック保証、Claude Code Hook Adapter（Pre/Post/Stop）。Hook/FSイベントをharness-api CLIに変換する**薄いAdapter層**に限定 |

### Wave 3: 拡張・運用・保証（3 Unit / 14 US）

| # | Unit名 | Epic | US数 | 担当ストーリーID | 責務概要 | 内部マイルストーン |
|---|--------|------|------|-----------------|---------|-----------------|
| 12 | **skill-quality** | H-12 | 6 | H12-01〜H12-06 | story-implementor Atomic Commits、Nyquist統合、Plan-Checker Loop、Agent-Lesson（lesson artifact出力）、Cascade Updater、SKILL.md検証 | — |
| 13 | **ci-governance** | H-13 | 3 | H13-01〜H13-03 | CI/CDテンプレート、反復エラー自動エスカレーション、AGENTS.mdポインタ型移行（Agent-Lesson artifact集約含む） | — |
| 14 | **regression-suite** | H-14 + H-15 | 5 | H14-01〜H14-03, H15-01〜H15-02 | K1-K15回帰テスト、v0 143テスト仕様のv1再実装、Go/No-Go Gate回帰テスト、CIゲート化 | **Phase A**: H14（Wave 2後半から設計・一部実装開始可能）/ **Phase B**: H15（全v1 Unit実装完了後に着手） |

### Future Phase（2 Unit / 8 US）

| # | Unit名 | Epic | US数 | 担当ストーリーID | 責務概要 |
|---|--------|------|------|-----------------|---------|
| 15 | **fuse-hooks-engine** | H-F1 | 5 | HF1-01〜HF1-05 | .harness-hooks.yml、FUSE PreWrite/PostWrite/PreRead、Shell Wrapper PreBash、完了ゲートMagic File |
| 16 | **phase2-extensions** | H-F2 | 3 | HF2-01〜HF2-03 | doc-freshness-checker、pointer-validator、E2Eテスト戦略テンプレート |

---

## 4. Unit間依存関係

### 4.1 依存関係図

> codexレビュー指摘5への対応: 依存を「仕様確定依存（型・契約）」と「実装時依存（モジュール呼出）」に分離

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
│                    ←── biome-ast-engine（PostToolUse biome直接呼出）│
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

Wave 3（拡張・運用・保証）
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  skill-quality ←── nyquist-validation（Nyquist統合）                │
│                ←── traceability-model（@US-XXX自動付与）            │
│                ←── validator-system（L1+L2 Atomic commit前チェック） │
│                ※ AGENTS.mdに直接書かず、lesson artifactを出力       │
│                                                                      │
│  ci-governance ←── harness-api（harness:statusポインタ）            │
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
│  fuse-hooks-engine ←── validator-system（L0強制力）                 │
│                    ←── agent-integration（Hook参照実装）            │
│                                                                      │
│  phase2-extensions ←── validator-system（L4拡張）                   │
│                    ←── harness-api（CLI拡張）                       │
│                                                                      │
│  [Extension Points for Future]                                       │
│  - validator-system: L0バリデータ登録インターフェース                │
│  - harness-api: CLIコマンド拡張ポイント                             │
│  - config-foundation: L0セクション追加用スキーマ拡張                │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 Wave内並列開発可能性

| Wave | 並列開発可能なUnit群 | 順序依存 | 前提条件 |
|------|---------------------|---------|---------|
| Wave 1 | 全6 Unitが並列開発可能 | なし | **型定義の先行確定**: HarnessError型・HarnessConfigV2型のインターフェースをWave開始前に合意（実装は各Unit内で並列） |
| Wave 2 | nyquist-validation, validator-system, quick-mode は並列可能 | harness-api → agent-integration の順序推奨 | validator-system, nyquist-validationの主要インターフェースが確定後にharness-api着手 |
| Wave 3 | skill-quality, ci-governance は並列可能 | regression-suite Phase A はWave 2後半から先行開始可能。Phase BはWave全完了後 | skill-quality → ci-governance: lesson artifact契約の事前合意 |

---

## 5. v0アーカイブUnitとの対応関係

> codexレビュー指摘4への対応: v0は13 Unit（統合契約記載）に修正。各Unitの状態を「維持/移管/統合/削除/新規」で分類。US-009（VALIDATION.md）等の扱いを明記。

| v0 Unit（アーカイブ13 Unit） | v1 Unit | 状態 | 変更理由 |
|------------------------------|---------|------|---------|
| biome-toolchain | **biome-ast-engine** | 維持（改名） | ツールチェーン→エンジンとして責務を明確化 |
| config-foundation | **config-foundation** | 維持（縮小） | v2スキーマ対応に特化。旧US-027(orchestration)/US-028(session)/US-030(migration)はOrchestration移管 |
| adr-documentation | **adr-foundation** | 維持（改名） | 基盤としての位置づけを強調 |
| harness-dx | **harness-error** | 維持（再定義） | AGENTS.md管理をci-governanceに移管、HarnessError専任に |
| nyquist-validation | **nyquist-validation** | 維持 | 旧US-009（VALIDATION.md自動生成）は**v1ストーリーに含まれず意図的に削除**。v1ではrequirement-test-matrix.jsonとtest-coverage-checker統合で代替 |
| quality-hooks | **agent-integration** | 維持（改名+拡張） | Claude Code Hook + CLI/FS fallback保証を統合 |
| quick-mode | **quick-mode** | 維持（拡張） | 判定エンジン（H10-02）追加 |
| regression-suite | **regression-suite** | 維持（統合） | H-14 + H-15を統合。内部Phase A/B分割 |
| skill-enhancement | **skill-quality** | 維持（改名+拡張） | Agent-Lesson, Cascade Updater, SKILL.md検証を追加 |
| context-engineering | — | **Orchestrationに移管** | US-001〜004はオーケストレーション責務 |
| session-lifecycle | — | **Orchestrationに移管** | US-013〜015, US-023〜026はセッション/ライフサイクル管理 |
| orchestration-commands | — | **Orchestrationに移管** | US-050〜054はオーケストレーションコマンド |
| fuse-hooks-engine | **fuse-hooks-engine** | **Future移動** | v1スコープ外。L1-L4でCore Value維持可能 |
| — | **phase-dependency-model** | **新規** | v1追加のK14対応。3層フェーズ構造 |
| — | **traceability-model** | **新規** | v1追加のK3.5体系化。メタデータ+逆引きチェーン |
| — | **harness-api** | **新規** | CLIコマンド群をUnit化。lint/complete-check含む |
| — | **validator-system** | **新規** | L2-L4バリデータを集約（内部l2/l3/l4サブモジュール） |
| — | **ci-governance** | **新規** | CI/CDテンプレート + AGENTS.md管理 |
| — | **phase2-extensions** | **新規（Future）** | L4拡張+E2Eテスト戦略 |

### v0ストーリーの扱い（移管・削除明細）

| 旧US | v0所属 | v1での扱い | 理由 |
|------|--------|-----------|------|
| US-009 | nyquist-validation | **削除** | VALIDATION.md自動生成はrequirement-test-matrix.json + coverage_report.mdで代替 |
| US-027 | config-foundation | **Orchestration移管** | orchestrationセクションはオーケストレーション設定 |
| US-028 | config-foundation | **Orchestration移管** | sessionセクションはセッション管理 |
| US-030 | config-foundation | **Orchestration移管** | v1→v2マイグレーションは両パッケージ横断 |
| US-037 | biome-toolchain | **agent-integrationに統合** | PostToolUse Hook → H11-03に包含 |

---

## 6. QA（不明点・確認事項）

### [Question] Q1: validator-system（H-08）の粒度

H-08は6ストーリーを含み、L2 test-quality、L3 security/performance/coverage、L4 drift-detect/consistency-check/dead-codeと**3レイヤーにまたがる**。これを1 Unitとするか、レイヤー別に分割するか。

**推奨案（codex合意済み）:** 1 Unitとして維持。バリデータはドメインとして「品質検証ルール」という同一概念を共有しており、HarnessError出力パイプラインとconfig参照が共通のため、凝集性が高い。**ただし内部は`l2/` `l3/` `l4/`サブモジュールに分離し、担当者とテストスイートも分離する。**

[Answer]
推奨案を採用

### [Question] Q2: harness-apiとagent-integrationの境界

H-09（Harness API）はCLIコマンド定義、H-11（Agent Integration）はCLI/FS fallback + Claude Code Hook Adapterを担当。

**推奨案（codex合意済み）:** 分離を維持。harness-apiは**全CLIコマンドの名前・入出力仕様・終了コードを所有**（`harness:lint`、`harness:complete-check`含む）。agent-integrationはHook/FSイベントをharness-api CLIに変換する**薄いAdapter層に限定**。

[Answer]
推奨案を採用

### [Question] Q3: regression-suiteへのH-15統合

**推奨案（codex合意済み）:** 統合を維持。**内部マイルストーンとしてPhase A（H14: Wave 2後半から設計・一部実装開始可能）/ Phase B（H15: 全v1 Unit完了後に着手）に分離。**

[Answer]
推奨案を採用

### [Question] Q4: Future Phase UnitのUnit定義作成範囲

**推奨案（codex合意済み）:** Unit定義 + integration contract（extension point）まで作成。`product/construction`やUS単位の詳細設計は作成しない。

[Answer]
推奨案を採用

---

## 7. 前提条件・リスク

### 前提条件

1. Orchestrationパッケージへの移管済みストーリー（US-001〜004, US-013〜015, US-023〜028, US-030, US-045 FCP部分, US-050〜054）はスコープ外
2. v0アーカイブの統合契約（`integration_contract.md` — 13 Unit / 55 Story）はフォーマット参考として利用
3. 技術スタック: TypeScript + Biome + Vitest 3.0.0 + pnpm（v0と同一）
4. v0のUS-009（VALIDATION.md自動生成）はv1ストーリーに含まれず、requirement-test-matrix.jsonで代替

### リスク

| リスク | 深刻度 | 軽減策 |
|--------|--------|--------|
| validator-systemが肥大化し開発ボトルネック化 | 中 | 内部をl2/l3/l4サブモジュールに分離。担当者・テストスイートも独立 |
| harness-errorのShared Kernel化による変更波及 | 高 | HarnessError型をインターフェースで定義し、実装詳細を各Unit内に閉じ込める |
| Wave間の依存によるブロッキング | 中 | Shared Kernelのインターフェース（型定義・契約）をWave 1で先行確定 |
| CLIコマンド契約の散逸 | 中 | harness-apiにCLI Command Registryを集約。agent-integrationは薄いAdapter層に限定 |
| AGENTS.mdの所有権競合（skill-quality vs ci-governance） | 中 | skill-qualityはlesson artifactを出力、ci-governanceがAGENTS.mdへの反映を集約 |

---

## 8. codexレビュー指摘への対応サマリー

| # | 指摘 | 深刻度 | 対応 |
|---|------|--------|------|
| 1 | CLIフォールバックの責務が未定義 | Critical | `harness:lint`、`harness:complete-check`をharness-api所有に追加。agent-integrationは薄いAdapter層に限定（§3 Unit一覧、§2.4 CLI Command Registry） |
| 2 | regression-suiteの不要なWaveブロック | Major | 内部Phase A/B分割を明記。Phase AはWave 2後半から先行開始可能（§3 Unit一覧、§4.1 依存関係図） |
| 3 | Shared Kernelが横断契約をカバーしていない | Major | Cross-Unit Contract節を新設。7件の公開契約を定義（§2.4） |
| 4 | v0整合性の前提ずれ | Major | v0を「13 Unit」に修正。US-009/US-027/US-028/US-030/US-037の扱いを明記（§5） |
| 5 | 依存図の意味的誤り | Minor | drift参照をvalidator-system:L4に修正。Wave 1並列性を「型定義先行確定」条件付きに修正（§4） |

---

## 9. 承認

- [x] 人間承認済み

---

*Phase 1完了。codexレビュー反映済み。Phase 2（Unit定義・統合契約の作成）は人間承認後に実行します。*
