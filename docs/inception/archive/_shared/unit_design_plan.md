# Unit設計計画

> **ステータス**: Phase 1（計画）— 承認待ち
> **作成日**: 2026-03-10
> **入力**: `docs/product/user_stories.md`（確定版・55ストーリー）、`docs/product/product_overview.md`

---

## 1. スコープ

- **対象ストーリー数**: 55（15 Epic）
- **分析対象の業務領域**: GSDLC Harness v1の全機能領域
  - 設定基盤、品質ハーネス、オーケストレーション、セッション/ライフサイクル、ツールチェーン、FUSE Hooks Engine、オーケストレーションコマンド定義

---

## 2. グルーピング方針

### 凝集性の基準

1. **ドメイン凝集**: 同一業務ドメイン（品質検証、設定管理、セッション管理等）に属するストーリーを同一Unitに
2. **データ凝集**: 同じデータ構造（harness.config.json、session-state.json等）を読み書きするストーリーを同一Unitに
3. **変更凝集**: 同時に変更される可能性が高いストーリーを同一Unitに

### Unit分割の判断根拠

- **アーキテクチャレイヤーとの対応**: Product Overviewの5層アーキテクチャ（Layer 1-5 + FUSE横断基盤）を尊重
- **Wave依存関係の反映**: user_stories.mdのWave分割（依存関係グラフ）を考慮し、同一Waveで並行実装可能なUnit境界を設定
- **独立構築可能性**: 各Unitが他Unitの実装完了を待たずに設計・一部実装を開始できること
- **適正サイズ**: 1 Unit = 2〜7ストーリー。小さすぎると管理オーバーヘッド、大きすぎると並行開発の阻害

### Epic→Unit統合の判断

以下のEpicは関連性が高いため統合を検討した：

| 統合候補 | 判断 | 理由 |
|---------|------|------|
| E-04（セッション）+ E-07（ライフサイクル） | **統合** | 同一の状態永続化ドメイン。session-state.json / milestones.json / state.json は同一ランタイムで管理 |
| E-09（回帰保証）+ E-14（v0テスト移行） | **統合** | 両者ともテスト資産のv1保証が目的。E-14はE-09の基盤実装であり分離のメリットが薄い |
| E-02（Nyquist）+ E-13（スキル強化） | **分離維持** | E-13のUS-045/047はNyquist以外の機能（FCP、Plan-Checker）も含むため分離が適切 |
| E-05（Hooks拡張）+ E-12（FUSE） | **分離維持** | 抽象レベルが異なる。E-05はClaude Code Hooks層、E-12はOS-level FUSE層 |

---

## 3. Unit一覧（ドラフト）

| # | Unit名 | 担当ストーリーID | ストーリー数 | 責務概要 |
|---|--------|----------------|-------------|---------|
| 1 | config-foundation | US-027, US-028, US-029, US-030 | 4 | harness.config.json v2スキーマ設計・マイグレーション・GSD機能フラグ管理 |
| 2 | adr-documentation | US-020, US-021, US-022 | 3 | ADRテンプレート、初期10件ADR作成、ステータス管理 |
| 3 | biome-toolchain | US-036, US-037, US-038, US-039 | 4 | v0 ESLintルールのBiomeプラグイン移植、PostToolUse Hook高速化、L1バリデータ再構築、CIパイプライン統合 |
| 4 | context-engineering | US-001, US-002, US-003, US-004 | 4 | context-priority.json、SKILL.mdコンテキストバジェット、Fresh Context Protocol、Compact時優先保持 |
| 5 | nyquist-validation | US-005, US-006, US-007, US-008, US-009 | 5 | requirement-test-matrix.json、phase-gate ACマッピングチェック、要件カバレッジ算出、impact-analysis、VALIDATION.md |
| 6 | quality-hooks | US-016, US-017, US-018, US-019 | 4 | PreToolUse Hookリンター設定保護、Stop Hookテストゲート、無限ループ防止、ci-check追加 |
| 7 | session-lifecycle | US-013, US-014, US-015, US-023, US-024, US-025, US-026 | 7 | セッション状態永続化（session-state.json）、resume、pause、マイルストーン管理、プロジェクト状態追跡、進捗可視化 |
| 8 | quick-mode | US-010, US-011, US-012 | 3 | quick_modeセクション定義、最小バリデータ実行・phase-gateスキップ、harness:quick-checkコマンド |
| 9 | harness-dx | US-034, US-035 | 2 | HarnessErrorフォーマット拡充（ADR参照+修正コード例）、AGENTS.mdポインタ型移行 |
| 10 | fuse-hooks-engine | US-040, US-041, US-042, US-043, US-044 | 5 | .harness-hooks.yml宣言的フック定義、FUSEパススルー、PreRead機密ファイルブロック、PreBash/PostBash、完了ゲート |
| 11 | regression-suite | US-031, US-032, US-033, US-048, US-049, US-055 | 6 | K1-K13回帰テスト整備（5層防御・Phase Gate・スキル・Security等）、Go/No-Go Gate 8条件回帰テスト、v0テスト仕様v1再実装、CIゲート化 |
| 12 | skill-enhancement | US-045, US-046, US-047 | 3 | story-implementor FCP+Atomic Commits、test-coverage-checker Nyquist統合、implementation-readiness-checker Plan-Checker Loop |
| 13 | orchestration-commands | US-050, US-051, US-052, US-053, US-054 | 5 | /gsdlc:init-project, design, plan, execute, verify の5メインコマンドオーケストレーションSKILL.md定義 |

**合計**: 13 Unit / 55 ストーリー（全ストーリー網羅確認済み）

---

## 4. Unit間依存関係（ドラフト）

### 依存関係図

```
                    ┌──────────────────┐
                    │ config-foundation│  (Wave 1)
                    │   US-027~030     │
                    └────────┬─────────┘
           ┌─────────┬──────┼──────┬────────────┐
           ▼         ▼      ▼      ▼            ▼
    ┌──────────┐ ┌───────┐ ┌────────┐ ┌───────────┐ ┌──────────┐
    │ context- │ │ quick │ │session-│ │  nyquist- │ │ quality- │
    │ engineer │ │ -mode │ │lifecycl│ │ validation│ │  hooks   │
    │US-001~004│ │010~012│ │013~026 │ │ 005~009   │ │ 016~019  │
    └──────────┘ └───────┘ └────────┘ └─────┬─────┘ └────┬─────┘
                                            │            │
                                            ▼            ▼
                                     ┌────────────┐ ┌──────────┐
                                     │   skill-   │ │  fuse-   │
                                     │enhancement │ │  hooks-  │
                                     │ 045~047    │ │  engine  │
                                     └──────┬─────┘ │ 040~044  │
                                            │       └──────────┘
                                            ▼
                                     ┌────────────────┐
                                     │ orchestration- │
                                     │ commands       │
                                     │ US-050~054     │
                                     └────────────────┘

    ┌──────────────┐         ┌──────────┐
    │ adr-         │────────▶│ harness- │
    │documentation │         │   dx     │
    │ US-020~022   │         │ 034~035  │
    └──────┬───────┘         └──────────┘
           │
    ┌──────▼───────┐         ┌──────────────────────┐
    │ biome-       │────────▶│ regression-suite      │
    │ toolchain    │         │ 031~033,048~049,055   │
    │ US-036~039   │         └──────────────────────┘
    └──────────────┘
```

### 依存関係マトリクス

| Unit（依存元 → 依存先） | config | adr | biome | context | nyquist | hooks | session | quick | dx | fuse | regress | skill | orch |
|-------------------------|:------:|:---:|:-----:|:-------:|:-------:|:-----:|:-------:|:-----:|:--:|:----:|:-------:|:-----:|:----:|
| config-foundation | - | | | | | | | | | | | | |
| adr-documentation | | - | | | | | | | | | | | |
| biome-toolchain | | | - | | | | | | | | | | |
| context-engineering | **●** | | | - | | | | | | | | | |
| nyquist-validation | | | | | - | | | | | | | | |
| quality-hooks | | | | | | - | | | | | | | |
| session-lifecycle | **●** | | | | | | - | | | | | | |
| quick-mode | **●** | | | | | | | - | | | | | |
| harness-dx | | **●** | | | | | | | - | | | | |
| fuse-hooks-engine | **●** | | | | | **●** | | | | - | | | |
| regression-suite | | | **●** | | | | | | | | - | | |
| skill-enhancement | | | | | **●** | | | | | | | - | |
| orchestration-commands | **●** | | | | | | | | | | | **●** | - |

**●** = 依存あり

### Wave対応

| Wave | Unit | 根拠 |
|------|------|------|
| Wave 1 | config-foundation, adr-documentation, biome-toolchain | 他Unitの前提。依存先なし |
| Wave 2 | context-engineering, nyquist-validation, quality-hooks, harness-dx | Wave 1の成果物に依存 |
| Wave 3 | quick-mode, session-lifecycle, skill-enhancement, orchestration-commands | Wave 1-2の成果物に依存。orchestration-commandsはskill-enhancement完了後 |
| Wave 4 | fuse-hooks-engine, regression-suite | 最終統合。Wave 1-3の成果物に依存 |

---

## 5. QA（不明点・確認事項）

### [Question] Q1: E-04（セッション）とE-07（ライフサイクル）の統合について

E-04（session-state.json）とE-07（milestones.json / state.json）は、両者とも「プロジェクト/セッション状態の永続化と復元」というドメインに属します。以下の理由で1つのUnit「session-lifecycle」に統合することを提案します：

- session-state.json（E-04）とstate.json（E-07）は内容的に重複する可能性がある
- US-015（Stop Hook/pause時自動更新）はsession-stateとmilestone双方に影響しうる
- harness:resume（US-014）とharness:progress（US-025）は同一セッション管理コンテキストで利用される

**推奨案:** 統合（7ストーリーは上限に近いが、ドメイン凝集性が高いため分離のデメリットが上回る）

[Answer]
統合しよう

### [Question] Q2: E-09（回帰保証）とE-14（v0テスト移行）の統合について

E-09の回帰テスト整備（US-031~033）とE-14のv0テスト仕様再実装（US-048~049）は、「v0品質基準のv1維持保証」という同一目的を持ちます。

- E-09はK1-K13の回帰テスト設計・仕様策定
- E-14はv0の143テストの物理的再実装とCIゲート化
- 両者は同じテストコードベースを共有する

**推奨案:** 統合。ただしE-14はE-11（Biome移行）完了後に着手するため、Unit内でフェーズ分けが必要。

[Answer]
統合しよう


### [Question] Q3: E-13（スキル強化）のUnit配置について

E-13の3ストーリーはそれぞれ異なる既存スキルを強化します：

- US-045: story-implementor → FCP + Atomic Commits（context-engineeringに関連）
- US-046: test-coverage-checker → Nyquist統合（nyquist-validationに関連）
- US-047: implementation-readiness-checker → Plan-Checker Loop（nyquist-validationに関連）

選択肢：
1. **独立Unit「skill-enhancement」として維持**（推奨）— 強化対象が複数スキルにまたがるため
2. **各関連Unitに分散配置** — US-045をcontext-engineering、US-046/047をnyquist-validationに

**推奨案:** 独立Unit維持。理由：スキル強化は既存スキルのSKILL.md修正とコード変更が主であり、新規ドメインモデル設計とは性質が異なる。分散させるとUnit間の設計一貫性が低下する。

[Answer]
独立Unit維持でいこう

---

## 6. 前提条件・リスク

### 前提条件

1. 全55ストーリーはuser_stories.mdの確定版に基づく
2. Wave分割ロードマップ（user_stories.md末尾）のWave 1-4順序を尊重する
3. product_overview.mdのアーキテクチャ5層構造を尊重する

### リスク

| リスク | 影響度 | 軽減策 |
|--------|--------|--------|
| session-lifecycle Unit（7ストーリー）が大きすぎ、設計が肥大化する | 中 | domain-designer段階でE-04/E-07のサブモジュール境界を明確化 |
| regression-suiteがBiome移行完了に強く依存し、着手が遅延する | 中 | Wave 1でbiome-toolchain完了を優先。regression-suiteの設計のみ先行可能 |
| skill-enhancementの各ストーリーが既存スキルの内部構造に深く依存する | 中 | domain-designer段階で既存スキルのインターフェース契約を明確化 |
| fuse-hooks-engineの実験的要素（FUSE-T/libfuse）が技術リスク | 高 | Fallback設計（Claude Code Hooks）を統合契約に明記 |
