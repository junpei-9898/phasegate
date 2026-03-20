# GSDLC_HARNESS v1 スキルシステム進化計画

> **目的**: v0の26スキル + GSD2.0統合による新規7スキル = 33+スキルの統合設計
> **作成日**: 2026-03-10
> **前提文書**: `gsd2_integration_analysis.md`, `harness_bestpractice_gap_analysis.md`
> **ステータス**: Draft

---

## 1. スキルマップ v1: 全スキルのカテゴリ分類と依存関係

### 1.1 カテゴリ分類（7カテゴリ / 33スキル）

```
A. Foundation（基盤設計）          4スキル
B. Design（詳細設計）              6スキル
C. Test Engineering（テスト工学）   7スキル
D. Implementation（実装）          3スキル + 1強化
E. Orchestration（実行制御）       3スキル [NEW]
F. Verification（検証・整合性）     3スキル
G. Meta（メタ・横断）              7スキル + 4スキル [NEW]
```

### 1.2 全スキル一覧

#### A. Foundation（基盤設計）— プロダクト全体構造の確立

| # | スキル名 | v0/v1 | 説明 | Phase |
|---|---------|-------|------|-------|
| A1 | `product-architect` | v0 | ビジネス要求→プロダクト全体像定義 | - |
| A2 | `story-writer` | v0 | ユーザーストーリー・受入基準作成 | - |
| A3 | `story-mapper` | v0 | ストーリーマッピング・優先順位付け | - |
| A4 | `unit-designer` | v0 | Unit分割・統合契約定義 | - |

#### B. Design（詳細設計）— Unit/Story単位の設計

| # | スキル名 | v0/v1 | 説明 | Phase |
|---|---------|-------|------|-------|
| B1 | `domain-designer` | v0 | DDDドメインモデル設計 | - |
| B2 | `logical-designer` | v0 | 論理設計（横断+ストーリー固有） | - |
| B3 | `mock-designer` | v0 | モック・スタブ設計 | - |
| B4 | `uiux-designer` | v0 | UI/UX設計 | - |
| B5 | `codebase-mapper` | **v1 NEW** | Brownfield既存コードベース分析 | Phase 2 |
| B6 | `environment-designer` | v0 | 環境設計・環境契約定義 | - |

#### C. Test Engineering（テスト工学）— テスト設計・ロジック・検証

| # | スキル名 | v0/v1 | 説明 | Phase |
|---|---------|-------|------|-------|
| C1 | `scenario-test-designer` | v0 | E2Eシナリオテストケース設計 | - |
| C2 | `it-test-designer` | v0 | 統合テストケース設計 | - |
| C3 | `unit-test-designer` | v0 | ユニットテストケース設計 | - |
| C4 | `test-coverage-checker` | v0 **強化** | テスト網羅性検証 + **Nyquist Validation** | Phase 2 |
| C5 | `scenario-test-logic-designer` | v0 | シナリオテストロジック設計 | - |
| C6 | `it-test-logic-designer` | v0 | 統合テストロジック設計 | - |
| C7 | `unit-test-logic-designer` | v0 | ユニットテストロジック設計 | - |

#### D. Implementation（実装）— TDD実装・計画・検証

| # | スキル名 | v0/v1 | 説明 | Phase |
|---|---------|-------|------|-------|
| D1 | `implementation-planner` | v0 | 実装計画作成 | - |
| D2 | `implementation-readiness-checker` | v0 **強化** | 実装準備検証 + **plan-checkerループ(max 3)** | Phase 1 |
| D3 | `story-implementor` | v0 **強化** | TDD実装 + **Fresh Context分離 + Atomic Git Commits** | Phase 1 |
| D4 | `quick-implementor` | **v1 NEW** | ハーネス緩和版の軽量実装 | Phase 1 |

#### E. Orchestration（実行制御）— Wave並列・セッション・進捗 [NEW]

| # | スキル名 | v0/v1 | 説明 | Phase |
|---|---------|-------|------|-------|
| E1 | `wave-orchestrator` | **v1 NEW** | Wave並列実行のオーケストレーション | Phase 1 |
| E2 | `session-manager` | **v1 NEW** | pause/resume/progress管理 | Phase 1 |
| E3 | `milestone-manager` | **v1 NEW** | マイルストーンライフサイクル管理 | Phase 2 |

#### F. Verification（検証・整合性）— 品質保証・影響伝播

| # | スキル名 | v0/v1 | 説明 | Phase |
|---|---------|-------|------|-------|
| F1 | `consistency-checker` | v0 | 文書間レイヤー整合性検証 | - |
| F2 | `cascade-updater` | v0 | 下位変更→上位設計への影響伝播 | - |
| F3 | `scope-manager` | **v1 NEW** | 動的スコープ変更（add/insert/remove） | Phase 3 |

#### G. Meta（メタ・横断）— スキル生成・思考・リサーチ・委任

| # | スキル名 | v0/v1 | 説明 | Phase |
|---|---------|-------|------|-------|
| G1 | `skill-creator` | v0 | 新規スキル定義テンプレート生成 | - |
| G2 | `kimunii-perspective` | v0 | 多角的思考フレームワーク | - |
| G3 | `codex-delegator` | v0 | Codexへのタスク委任 | - |
| G4 | `research-coordinator` | **v1 NEW** | リサーチ並列化オーケストレーション | Phase 3 |

### 1.3 依存関係グラフ

```
Phase 0: Foundation
═══════════════════════════════════════════════════════════
  product-architect ─→ story-writer ─→ story-mapper ─→ unit-designer
        │                                                    │
        └── [research-coordinator] (並列リサーチ, v1)         │
                                                             │
Phase 1: Design (per Unit)                                   │
═══════════════════════════════════════════════════════════   │
  ┌──────────────────────────────────────────────────────────┘
  ▼
  domain-designer ─→ logical-designer(横断) ─→ environment-designer
        │                    │
        │     [codebase-mapper] (Brownfield時, v1)
        │                    │
        ▼                    ▼
  mock-designer        uiux-designer

Phase 2: Test Design (per Unit)
═══════════════════════════════════════════════════════════
  scenario-test-designer ──┐
  it-test-designer ────────┼──→ test-coverage-checker [+Nyquist]
  unit-test-designer ──────┘           │
                                       ▼
  scenario-test-logic-designer ──┐
  it-test-logic-designer ────────┤
  unit-test-logic-designer ──────┘

Phase 3: Implementation Readiness
═══════════════════════════════════════════════════════════
  implementation-planner
        │
        ▼
  implementation-readiness-checker [+plan-checker loop x3]
        │
        ├──→ (PASS) → Phase 4
        └──→ (FAIL) → implementation-planner (最大3回)

Phase 4: Execution
═══════════════════════════════════════════════════════════
  wave-orchestrator [NEW] ─── session-manager [NEW]
        │
        ├──→ story-implementor(US-001) [+Fresh Context +Atomic Commits]
        ├──→ story-implementor(US-002) [並列]
        └──→ story-implementor(US-003) [Wave 2, 依存待ち]
        │
        └── quick-implementor [NEW] (Quick Mode時のみ)

Phase 5: Verification
═══════════════════════════════════════════════════════════
  consistency-checker ──→ cascade-updater
        │
        ▼
  milestone-manager [NEW] (マイルストーン単位の監査・完了)
```

### 1.4 依存関係マトリクス（新規スキルの位置づけ）

```
                        依存先（requires）
                   ┌────────────────────────────────────────────┐
                   │ A1-A4  B1-B6  C1-C7  D1-D4  E1-E3  F1-F3 │
依  wave-orch  E1  │   -    logic   test    impl    -      -   │
存  session    E2  │   -      -      -       -     E1      -   │
元  quick-impl D4  │   -      -      -       -      -      -   │
    codebase   B5  │  unit    -      -       -      -      -   │
    milestone  E3  │ story    -      -       -     E1,E2   F1  │
    scope      F3  │ story  story    -       -      -      -   │
    research   G4  │ prod     -      -       -      -      -   │
```

---

## 2. 新規スキルの入出力定義

### 2.1 wave-orchestrator（Wave並列実行オーケストレーター）

```yaml
name: wave-orchestrator
category: Orchestration
phase: Phase 1 (最優先)
```

**責務**: 複数ストーリーの実装を依存関係に基づいてWaveにグルーピングし、Wave内は並列・Wave間は直列で実行する。各executorにFresh Contextを配分する。

| 項目 | 定義 |
|------|------|
| **Input (必須)** | 1. `docs/inception/_shared/roadmap.md` — 実行対象ストーリー一覧 |
|  | 2. `docs/product/user_story_mapping.md` — ストーリー間依存関係 |
|  | 3. `harness.config.json` の `orchestration` セクション |
| **Input (任意)** | 1. `docs/inception/_shared/execution-waves.json` — 手動Wave定義（override） |
|  | 2. `docs/inception/_shared/state.md` — 前回セッションの実行状態 |
| **Output** | 1. `docs/inception/_shared/execution-waves.json` — 自動生成Wave定義 |
|  | 2. `docs/inception/_shared/state.md` — 更新された実行状態 |
|  | 3. 各Wave実行後のvalidation結果（会話内レポート） |
| **Trigger** | `/aidlc:execute <unit>` コマンド |
| **依存スキル** | `implementation-readiness-checker`（Pre-flight gate）, `story-implementor`（executor）, `consistency-checker`（Post-wave validation） |

**内部フロー**:

```
1. Pre-flight
   ├── FOR EACH story: implementation-readiness-checker
   └── ALL PASS? → continue / ANY FAIL? → abort with report

2. Wave計算
   ├── ストーリー間依存関係を分析
   ├── 独立ストーリーを同一Waveにグルーピング
   └── Wave順序を確定 → execution-waves.json に出力

3. Wave実行（Wave N）
   ├── FOR EACH story IN wave (PARALLEL):
   │   ├── Fresh Context割り当て（200K per executor）
   │   ├── Context投入: domain_model.md + logical_design.md + test_design.md
   │   ├── story-implementor 実行
   │   └── Atomic Git Commit（feat({unit}/{story_id}): ...）
   │
   └── Post-wave validation:
       ├── harness L2 checks（architecture, dependency, test-quality）
       ├── consistency-checker（文書間整合性）
       └── ALL PASS? → next wave / ANY FAIL? → pause + report

4. 全Wave完了
   ├── consistency-checker（最終整合性チェック）
   ├── cascade-updater（影響伝播）
   └── state.md 更新
```

**2フェーズ実行**:
- Phase 1: Wave計画の出力（execution-waves.json）+ Pre-flight結果 → 人間承認
- Phase 2: Wave順次実行

---

### 2.2 session-manager（セッション管理）

```yaml
name: session-manager
category: Orchestration
phase: Phase 1
```

**責務**: プロジェクトの実行状態を永続化し、セッション間のコンテキスト継続性を保証する。

| 項目 | 定義 |
|------|------|
| **Input (必須)** | 1. 現在のプロジェクト状態（git status, 設計文書の存在状況） |
| **Input (任意)** | 1. `docs/inception/_shared/state.md` — 前回セッション状態 |
|  | 2. `docs/inception/_shared/roadmap.md` — ロードマップ |
| **Output** | 1. `docs/inception/_shared/state.md` — 更新された状態 |
|  | 2. 進捗サマリー（会話内レポート） |
| **Trigger** | `/aidlc:pause`, `/aidlc:resume`, `/aidlc:progress` |
| **依存スキル** | なし（他スキルから状態更新を受け取る） |

**state.md フォーマット**:

```markdown
# Project State

## Current Position
- **Phase**: Phase 3 (Story Implementation)
- **Unit**: withholding_tax
- **Active Stories**: US-217, US-218
- **Last Action**: story-implementor(US-217) completed Wave 1

## Completed
- [x] product-architect
- [x] story-writer / story-mapper / unit-designer
- [x] domain-designer(withholding_tax)
- [x] logical-designer(withholding_tax)
- [x] test-designers(withholding_tax)
- [x] US-217 implementation

## In Progress
- [ ] US-218 implementation (Wave 2, blocked by US-217)

## Blockers
- None

## Decisions Made This Session
- 2026-03-10: CSVパース戦略をストリーミング方式に決定

## Next Actions
1. US-218の実装を開始
2. US-219のテスト設計に着手

## Context Notes (for next session)
- WithholdingTaxProcess集約のcreate()メソッドにバリデーション追加済み
- フロントエンドはまだ未着手
```

**サブコマンド**:

| コマンド | 動作 |
|---------|------|
| `/aidlc:pause` | 現在の進捗・コンテキストメモ・次アクションをstate.mdに保存 |
| `/aidlc:resume` | state.mdを読み込み、中断箇所から再開提案。起動ルーチン実行 |
| `/aidlc:progress` | 現在の進捗をサマリー表示（完了率、残ストーリー、ブロッカー） |

---

### 2.3 quick-implementor（ハーネス緩和版実装）

```yaml
name: quick-implementor
category: Implementation
phase: Phase 1
```

**責務**: フル設計フローを経ずに、小規模な変更（バグ修正、typo修正、テスト追加、設定変更）を安全に実行する。品質ハーネスのうちphase-gateのみ緩和し、コード品質ゲートは維持する。

| 項目 | 定義 |
|------|------|
| **Input (必須)** | 1. 変更内容の説明（口頭 or issueリンク） |
|  | 2. 対象ファイルパス |
| **Input (任意)** | 1. 関連するストーリーID |
| **Output** | 1. コード変更 + Atomic Git Commit |
|  | 2. 変更サマリー（会話内レポート） |
| **Trigger** | `/aidlc:quick` |
| **依存スキル** | なし（独立実行） |

**適用条件（自動判定）**:

```
Quick Mode 適用可:
  ✓ 既存ストーリーのバグ修正
  ✓ ドキュメントのみの変更
  ✓ テストの追加（設計変更なし）
  ✓ 設定ファイルの変更
  ✓ リファクタリング（既存テスト全グリーン前提）

Quick Mode 適用不可（フルフローへリダイレクト）:
  ✗ 新規ドメインモデルの追加
  ✗ API契約の変更
  ✗ 新機能の追加
  ✗ 既存の受入基準の変更
```

**維持するハーネス**:

| ハーネス | 維持 | 理由 |
|---------|------|------|
| L1: ESLint（architecture, test-quality） | 維持 | コード品質は非交渉 |
| L2: Pre-commit（dependency, test-quality） | 維持 | 構造的品質は非交渉 |
| Phase Gate（設計文書存在チェック） | **緩和** | 既存ストーリーの修正時のみ |
| 2-Phase Execution | **省略** | Quick Modeの本質 |
| Atomic Git Commits | 維持 | `fix({unit}/{story_id}): ...` |

---

### 2.4 codebase-mapper（Brownfield既存コードベース分析）

```yaml
name: codebase-mapper
category: Design
phase: Phase 2
```

**責務**: 既存コードベースを4つの観点で並列分析し、AIDLC導入に必要なメタデータを抽出する。

| 項目 | 定義 |
|------|------|
| **Input (必須)** | 1. プロジェクトルートパス |
|  | 2. 使用言語・フレームワーク情報 |
| **Input (任意)** | 1. 既存ドキュメント（README, API仕様書等） |
| **Output** | 1. `docs/inception/_shared/codebase-analysis.md` — 分析レポート |
|  | 2. `harness-scan-report.json` — 機械可読な分析結果 |
|  | 3. Unit候補の提案 |
|  | 4. レイヤー構造の推定 |
| **Trigger** | `/aidlc:map-codebase` |
| **依存スキル** | `unit-designer`（分析結果を入力としてUnit設計に利用） |

**4並列分析マッパー**:

| マッパー | 分析観点 | 出力 |
|---------|---------|------|
| Stack Mapper | 技術スタック・依存関係 | 言語、FW、DB、外部サービス一覧 |
| Architecture Mapper | レイヤー構造・モジュール境界 | @unit/@layer候補、依存方向グラフ |
| Convention Mapper | コーディング規約・パターン | 命名規則、ディレクトリ構造パターン |
| Concern Mapper | 横断的関心事・技術負債 | セキュリティ懸念、N+1、循環依存 |

---

### 2.5 milestone-manager（マイルストーンライフサイクル管理）

```yaml
name: milestone-manager
category: Orchestration
phase: Phase 2
```

**責務**: マイルストーン単位でのプロジェクト進捗管理。監査・完了・次マイルストーン開始のライフサイクルを制御する。

| 項目 | 定義 |
|------|------|
| **Input (必須)** | 1. `docs/inception/_shared/milestones.json` — マイルストーン定義 |
|  | 2. `docs/product/user_stories.md` — ストーリー一覧 |
| **Input (任意)** | 1. `docs/inception/_shared/state.md` — 現在の実行状態 |
| **Output** | 1. `docs/inception/_shared/milestones.json` — 更新されたマイルストーン状態 |
|  | 2. 監査レポート（会話内） |
|  | 3. Git tag（マイルストーン完了時） |
| **Trigger** | `/aidlc:milestone audit`, `/aidlc:milestone complete`, `/aidlc:milestone new` |
| **依存スキル** | `session-manager`（状態読取）, `consistency-checker`（監査時） |

**milestones.json フォーマット**:

```json
{
  "milestones": [
    {
      "id": "M1",
      "name": "MVP - コアCSV処理",
      "status": "in_progress",
      "stories": ["US-217", "US-218", "US-219"],
      "completionCriteria": {
        "allStoriesImplemented": false,
        "allTestsPassing": false,
        "consistencyCheckPassed": false,
        "driftDetectionClean": false
      },
      "startDate": "2026-03-01",
      "targetDate": "2026-03-31"
    }
  ]
}
```

**サブコマンド**:

| コマンド | 動作 |
|---------|------|
| `/aidlc:milestone audit` | 現在のマイルストーンの完了状況を監査。全ストーリー実装済み・テスト全グリーン・整合性チェック通過を検証 |
| `/aidlc:milestone complete` | 監査通過後、マイルストーンを完了。Git tag作成、アーカイブ、state.md更新 |
| `/aidlc:milestone new` | 新しいマイルストーンを作成。対象ストーリーの選択と目標日の設定 |

---

### 2.6 scope-manager（動的スコープ変更）

```yaml
name: scope-manager
category: Verification
phase: Phase 3
```

**責務**: プロジェクト進行中のストーリー追加・挿入・削除を安全に管理する。関連する設計文書・テスト設計・Wave定義への影響を分析し、整合性を維持する。

| 項目 | 定義 |
|------|------|
| **Input (必須)** | 1. 変更内容（追加/挿入/削除するストーリー） |
|  | 2. `docs/product/user_stories.md` — 現在のストーリー一覧 |
|  | 3. `docs/product/user_story_mapping.md` — 現在のマッピング |
| **Input (任意)** | 1. 変更理由の説明 |
| **Output** | 1. 更新された `user_stories.md` |
|  | 2. 更新された `user_story_mapping.md` |
|  | 3. 影響分析レポート（依存するUnit/設計文書/テスト設計への影響） |
| **Trigger** | `/aidlc:scope add`, `/aidlc:scope insert`, `/aidlc:scope remove` |
| **依存スキル** | `story-writer`（ストーリー追加時）, `story-mapper`（マッピング更新時）, `consistency-checker`（影響分析） |

---

### 2.7 research-coordinator（リサーチ並列化）

```yaml
name: research-coordinator
category: Meta
phase: Phase 3
```

**責務**: 技術選定やアーキテクチャ判断に必要なリサーチを4つの観点で並列実行し、意思決定の品質を向上させる。

| 項目 | 定義 |
|------|------|
| **Input (必須)** | 1. リサーチテーマ（技術選定、アーキテクチャ判断等） |
|  | 2. 制約条件（予算、チーム規模、既存技術スタック） |
| **Input (任意)** | 1. `docs/product/product_overview.md` — プロダクト概要 |
|  | 2. 既存ADR — 過去の技術判断 |
| **Output** | 1. `docs/inception/_shared/research/{theme}_research.md` — リサーチレポート |
|  | 2. ADR草案（技術選定の場合） |
| **Trigger** | `product-architect`, `domain-designer` の前段で自動呼出し / 手動呼出し |
| **依存スキル** | `product-architect`（結果を入力として利用）, `domain-designer`（結果を入力として利用） |

**4並列リサーチャー**:

| リサーチャー | 分析観点 |
|------------|---------|
| Stack Researcher | 技術スタックの候補比較・実績調査 |
| Feature Researcher | 要件実現可能性・ライブラリ調査 |
| Architecture Researcher | アーキテクチャパターンの適合性分析 |
| Pitfall Researcher | 落とし穴・リスク・パフォーマンスボトルネック調査 |

---

## 3. 既存スキル強化の差分

### 3.1 story-implementor: Fresh Context分離 + Atomic Git Commits

**変更対象**: `skills/story-implementor/SKILL.md`

#### 追加 (1): Fresh Context分離

Phase 2（実行）の冒頭に以下のセクションを追加:

```markdown
### Step 0: コンテキスト初期化（Fresh Context Protocol）

**Wave Orchestratorから呼ばれる場合、以下のコンテキスト初期化プロトコルに従う:**

1. **コンテキストバジェット**: 200K tokens（executor割り当て分）
2. **必須ロードドキュメント**（優先度順）:
   | 優先度 | ドキュメント | 推定サイズ |
   |--------|------------|----------|
   | Critical | 対象ストーリーのlogical_design.md | ~15KB |
   | Critical | domain_model.md（対象Unitのみ） | ~20KB |
   | Critical | test_design.md（unit + it + scenario） | ~30KB |
   | Important | test_logic.md（unit + it + scenario） | ~25KB |
   | Important | environment_contract.md | ~10KB |
   | Reference | product_overview.md（要約版） | ~5KB |

3. **ロードしないドキュメント**:
   - 他Unitの設計文書
   - 完了済みストーリーの設計文書
   - harness_design/配下の内部設計文書

4. **コンテキスト新鮮性ルール**:
   - 各ストーリー実装は独立したコンテキストで開始する
   - 前のストーリーの実装コンテキストは引き継がない
   - 設計文書は毎回ファイルから読み込む（キャッシュに依存しない）
```

#### 追加 (2): Atomic Git Commits

Phase 2のワークフロー各ステップ完了後に自動コミット:

```markdown
### Git Commit戦略（Atomic Commits）

各TDDサイクル完了後に自動的にatomicコミットを作成する:

| タイミング | コミットメッセージフォーマット |
|----------|---------------------------|
| ドメインモデル実装完了 | `feat({unit}/{story_id}): add domain model - {entity/VO名}` |
| ユニットテスト完了 | `test({unit}/{story_id}): add unit tests for {対象}` |
| UseCase/Repository実装完了 | `feat({unit}/{story_id}): add {usecase名}` |
| ITテスト完了 | `test({unit}/{story_id}): add integration tests for {対象}` |
| Controller/BFF実装完了 | `feat({unit}/{story_id}): add {endpoint}` |
| E2Eテスト完了 | `test({unit}/{story_id}): add e2e tests for {シナリオ}` |
| フロントエンド実装完了 | `feat({unit}/{story_id}): add {画面名}` |
| リファクタリング | `refactor({unit}/{story_id}): {変更内容}` |
```

---

### 3.2 test-coverage-checker: Nyquist Validation統合

**変更対象**: `skills/test-coverage-checker/SKILL.md`

#### 追加: 要件カバレッジ検証（Nyquist Validation Layer）

既存の4観点（受入基準/ドメインロジック/UseCase/API）に加え、以下を追加:

```markdown
### 5. Nyquist Validation（要件→テスト双方向トレーサビリティ）

#### 5.1 トレーサビリティマトリクス生成

以下の3層マッピングを自動生成する:

| 層 | マッピング | 検証内容 |
|----|----------|---------|
| Layer 1 | User Story (AC) → Scenario Test | 各受入基準にE2Eテストが存在するか |
| Layer 2 | Use Case → Integration Test | 各UseCaseに統合テストが存在するか |
| Layer 3 | Domain Model (Entity/VO) → Unit Test | 各ドメインモデルにユニットテストが存在するか |

#### 5.2 出力ファイル

`docs/product/construction/{unit}/requirement-test-matrix.json`

```json
{
  "unit": "withholding_tax",
  "generated": "2026-03-10T12:00:00Z",
  "layers": {
    "story_to_scenario": [
      {
        "storyId": "US-217",
        "ac": "AC-1: CSVアップロード成功",
        "tests": ["SC-001"],
        "covered": true
      }
    ],
    "usecase_to_integration": [...],
    "domain_to_unit": [...]
  },
  "summary": {
    "totalRequirements": 15,
    "coveredRequirements": 13,
    "coverageRate": 86.7,
    "gaps": [
      {
        "requirement": "AC-3: 重複チェック",
        "layer": "story_to_scenario",
        "recommendation": "SC-003を追加"
      }
    ]
  }
}
```

#### 5.3 Phase Gate統合

- フェーズゲートに「全AC→テストケースマッピング完了」チェックを追加
- `implementation-readiness-checker` が `requirement-test-matrix.json` の存在と coverageRate >= 90% を検証
```

---

### 3.3 implementation-readiness-checker: plan-checkerループ統合

**変更対象**: `skills/implementation-readiness-checker/SKILL.md`

#### 追加: 計画→検証→修正ループ（最大3回）

```markdown
### Plan-Checker Loop（GSD2.0 Planner+Checker統合）

implementation-readiness-checkerは、検証に失敗した場合、自動的に修正提案→再検証のループを最大3回実行する。

#### ループフロー

```
Round 1:
  implementation-readiness-checker → 検証
  ├── PASS → story-implementor へ進む
  └── FAIL → 不足ファイル・修正箇所を特定
       ├── 自動修正可能 → 対応スキルを自動呼出し
       └── 人間判断必要 → レポート出力 + ユーザー確認

Round 2 (自動修正後):
  implementation-readiness-checker → 再検証
  ├── PASS → story-implementor へ進む
  └── FAIL → 残存問題を特定 + 追加修正

Round 3 (最終):
  implementation-readiness-checker → 最終検証
  ├── PASS → story-implementor へ進む
  └── FAIL → 強制停止 + 詳細レポート出力
       → ユーザーに判断を委ねる（スキップ or 手動修正）
```

#### 追加検証項目（v1で追加）

| 検証項目 | v0 | v1 |
|---------|----|----|
| 設計文書の存在チェック | ✅ | ✅ |
| カバレッジレポートの閾値チェック | ✅ | ✅ |
| **requirement-test-matrix.json の存在** | - | ✅ NEW |
| **Nyquist coverageRate >= 90%** | - | ✅ NEW |
| **execution-waves.json との整合性** | - | ✅ NEW |
```

---

## 4. 統合ワークフロー: スキル間の実行フロー

### 4.1 フルワークフロー（Greenfield新規プロジェクト）

```
User: /aidlc:new-project
══════════════════════════════════════════════════════
│
├── [research-coordinator] (Phase 3で利用可能)
│     ├── Stack Researcher (並列)
│     ├── Feature Researcher (並列)
│     ├── Architecture Researcher (並列)
│     └── Pitfall Researcher (並列)
│
├── product-architect ← Phase 1(計画) → 人間承認 → Phase 2(実行)
│     Output: product_overview.md
│
├── story-writer ← Phase 1 → 承認 → Phase 2
│     Output: user_stories.md
│
├── story-mapper ← Phase 1 → 承認 → Phase 2
│     Output: user_story_mapping.md
│
└── unit-designer ← Phase 1 → 承認 → Phase 2
      Output: units/{unit}.md, integration_contract.md

User: /aidlc:design-unit <unit>
══════════════════════════════════════════════════════
│
├── domain-designer ← Phase 1 → 承認 → Phase 2
│     Output: domain_model.md
│
├── logical-designer(横断) ← Phase 1 → 承認 → Phase 2
│     Output: logical_design.md
│
├── environment-designer ← Phase 1 → 承認 → Phase 2
│     Output: environment_contract.md
│
├── uiux-designer ← Phase 1 → 承認 → Phase 2
│     Output: uiux_design.md
│
├── scenario-test-designer → it-test-designer → unit-test-designer
│     Output: *_test_design.md
│
├── test-coverage-checker [+Nyquist]
│     Output: coverage_report.md, requirement-test-matrix.json
│
└── *-test-logic-designer (unit/it/scenario)
      Output: *_test_logic.md

User: /aidlc:plan-stories <unit>
══════════════════════════════════════════════════════
│
├── logical-designer(ストーリー固有) × N stories
│     Output: inception/{unit}/{story}/logical_design.md
│
├── implementation-planner × N stories
│     Output: inception/{unit}/{story}/tdd_implementation_plan.md
│
└── implementation-readiness-checker [+plan-checker loop x3]
      ├── Round 1: 検証 → PASS/FAIL
      ├── Round 2: 自動修正後再検証 (if needed)
      └── Round 3: 最終検証 (if needed)

User: /aidlc:execute <unit>
══════════════════════════════════════════════════════
│
├── session-manager: resume (前回状態の復元)
│
├── wave-orchestrator ← Phase 1(Wave計画) → 承認 → Phase 2(実行)
│     │
│     ├── Pre-flight: readiness-checker for ALL stories
│     │
│     ├── Wave 1 (PARALLEL):
│     │   ├── story-implementor(US-001) [Fresh Context]
│     │   │   └── Atomic Commits: feat/test/refactor
│     │   └── story-implementor(US-002) [Fresh Context]
│     │       └── Atomic Commits: feat/test/refactor
│     │
│     ├── Post-Wave 1: L2 checks + consistency-checker
│     │
│     ├── Wave 2:
│     │   └── story-implementor(US-003) [depends on US-001]
│     │       └── Atomic Commits
│     │
│     └── Post-Wave 2: L2 checks + consistency-checker
│
├── session-manager: save (状態保存)
│
└── cascade-updater (影響伝播: product/construction/{unit}/* を更新)

User: /aidlc:verify <unit>
══════════════════════════════════════════════════════
│
├── consistency-checker (文書間レイヤー整合性)
├── drift-detector (設計-実装乖離検出) [L4 harness]
├── cascade-updater (影響伝播)
└── test-coverage-checker (最終カバレッジ確認)

User: /aidlc:milestone complete
══════════════════════════════════════════════════════
│
├── milestone-manager: audit
│   ├── 全ストーリー実装済み?
│   ├── テスト全グリーン?
│   ├── consistency-checker PASS?
│   └── drift-detector CLEAN?
│
├── milestone-manager: complete
│   ├── Git tag作成 (v{milestone})
│   ├── state.md 更新
│   └── アーカイブ
│
└── milestone-manager: new (次マイルストーン開始)
```

### 4.2 Quick Mode ワークフロー（短縮フロー）

```
User: /aidlc:quick "US-217のバグ修正: CSVパース時のnullチェック漏れ"
══════════════════════════════════════════════════════
│
├── quick-implementor: スコープ判定
│   ├── Quick Mode適用可? → YES (既存ストーリーのバグ修正)
│   └── Phase Gate: 緩和（設計文書更新不要）
│
├── quick-implementor: 実装
│   ├── 既存テスト確認 → 全グリーン確認
│   ├── 修正テスト追加 (RED)
│   ├── バグ修正 (GREEN)
│   └── リファクタリング (REFACTOR)
│
├── L1 + L2 harness checks (architecture, dependency, test-quality)
│
└── Atomic Commit: fix(withholding_tax/US-217): add null check for CSV parsing
```

### 4.3 Brownfield導入ワークフロー

```
User: /aidlc:map-codebase
══════════════════════════════════════════════════════
│
├── codebase-mapper (4並列分析)
│   ├── Stack Mapper → 技術スタック特定
│   ├── Architecture Mapper → レイヤー構造推定
│   ├── Convention Mapper → 規約パターン抽出
│   └── Concern Mapper → 技術負債・リスク検出
│
├── Output: codebase-analysis.md + harness-scan-report.json
│
├── 人間承認: Unit候補・レイヤー推定のレビュー
│
└── unit-designer: scan結果をInputとしてUnit設計
    └── 段階的harness導入:
        Week 1: L1 (ESLint) のみ
        Week 2: L2 (Pre-commit) 追加
        Week 3: L3 (CI) 追加
        Week 4: L4 (Scheduled) 追加
```

---

## 5. Progressive Disclosure: コンポジットコマンド設計

### 5.1 設計原則

ユーザーが直接操作するコマンドは **8個のメインコマンド** に限定する。内部で複数のスキルが連携するが、ユーザーはそれを意識する必要がない。

```
Progressive Disclosure の3層構造:

Layer 1 (ユーザー向け):    8 コマンド  ← ユーザーが使う
Layer 2 (パワーユーザー): 33 スキル   ← 必要に応じて直接呼出し可
Layer 3 (内部):           harness:*   ← CLIツール群
```

### 5.2 メインコマンド（Layer 1）— 8コマンド

| # | コマンド | 説明 | 内部で呼ぶスキル |
|---|---------|------|----------------|
| 1 | `/aidlc:new-project` | プロジェクト初期化 | product-architect → story-writer → story-mapper → unit-designer |
| 2 | `/aidlc:design-unit <unit>` | Unit設計（ドメイン→テスト設計まで一気通貫） | domain-designer → logical-designer → test-designers → test-coverage-checker → test-logic-designers |
| 3 | `/aidlc:plan-stories <unit>` | ストーリー実装計画 | logical-designer(固有) → implementation-planner → readiness-checker(loop) |
| 4 | `/aidlc:execute <unit>` | Wave並列実装 | wave-orchestrator → story-implementor × N |
| 5 | `/aidlc:verify <unit>` | 検証・整合性確認 | consistency-checker → drift-detector → cascade-updater |
| 6 | `/aidlc:quick` | 軽量修正（ハーネス緩和） | quick-implementor |
| 7 | `/aidlc:progress` | 進捗確認 | session-manager |
| 8 | `/aidlc:milestone <sub>` | マイルストーン管理 | milestone-manager |

### 5.3 補助コマンド（Layer 1.5）— 必要時のみ

| # | コマンド | 説明 | 内部で呼ぶスキル |
|---|---------|------|----------------|
| 9 | `/aidlc:pause` | セッション中断 | session-manager |
| 10 | `/aidlc:resume` | セッション再開 | session-manager |
| 11 | `/aidlc:map-codebase` | 既存コード分析 | codebase-mapper |
| 12 | `/aidlc:scope <sub>` | スコープ変更 | scope-manager |

### 5.4 コンポジットコマンドの内部動作詳細

#### `/aidlc:new-project` の内部フロー

```
ユーザー操作          内部スキル呼出し              2-Phase
━━━━━━━━━━          ━━━━━━━━━━━━━━━              ━━━━━━━
/aidlc:new-project
    │
    ├── research-coordinator (利用可能なら)
    │   └── 4並列リサーチ → リサーチレポート出力
    │
    ├── product-architect
    │   ├── Phase 1: product_overview_plan.md → 「承認しますか？」
    │   └── Phase 2: product_overview.md
    │
    ├── story-writer
    │   ├── Phase 1: story_writer_plan.md → 「承認しますか？」
    │   └── Phase 2: user_stories.md
    │
    ├── story-mapper
    │   ├── Phase 1: story_mapping_plan.md → 「承認しますか？」
    │   └── Phase 2: user_story_mapping.md
    │
    └── unit-designer
        ├── Phase 1: unit_design_plan.md → 「承認しますか？」
        └── Phase 2: units/*.md + integration_contract.md
```

ユーザーが見るもの:
```
> /aidlc:new-project

Phase 0: プロダクト設計を開始します。

[Step 1/4] product-architect の計画を作成中...

## プロダクト設計計画
(計画内容)

この計画で進めてよろしいですか？ [Yes/修正指示]

> Yes

product_overview.md を作成しました。

[Step 2/4] story-writer の計画を作成中...
...
```

#### `/aidlc:execute <unit>` の内部フロー

```
ユーザー操作          内部スキル呼出し              2-Phase
━━━━━━━━━━          ━━━━━━━━━━━━━━━              ━━━━━━━
/aidlc:execute auth
    │
    ├── session-manager: resume
    │   └── 「前回はUS-001まで完了しています。US-002から再開します。」
    │
    ├── wave-orchestrator
    │   ├── Phase 1: Wave計画
    │   │   ├── Pre-flight: readiness-checker × N stories
    │   │   └── execution-waves.json 出力
    │   │   → 「以下のWave計画で実行しますか？」
    │   │
    │   │   Wave 1: US-002, US-003 (並列)
    │   │   Wave 2: US-004 (US-002に依存)
    │   │
    │   └── Phase 2: Wave実行
    │       ├── Wave 1 並列実行
    │       │   ├── story-implementor(US-002) → Atomic Commits
    │       │   └── story-implementor(US-003) → Atomic Commits
    │       ├── Post-Wave 1 validation → PASS
    │       ├── Wave 2 実行
    │       │   └── story-implementor(US-004) → Atomic Commits
    │       └── Post-Wave 2 validation → PASS
    │
    └── session-manager: save + cascade-updater
```

ユーザーが見るもの:
```
> /aidlc:execute auth

前回セッション: US-001まで完了。US-002から再開します。

## Wave実行計画

| Wave | ストーリー | 依存関係 |
|------|----------|---------|
| Wave 1 | US-002, US-003 | なし（並列実行可） |
| Wave 2 | US-004 | US-002 |

Pre-flight: 全ストーリーの実装準備完了を確認済み ✅

この計画で実行しますか？ [Yes/修正指示]

> Yes

Wave 1 実行中...
  US-002: feat(auth/US-002): add email confirmation flow ✅
  US-003: feat(auth/US-003): add password reset ✅
  Post-Wave validation: ✅

Wave 2 実行中...
  US-004: feat(auth/US-004): add 2FA support ✅
  Post-Wave validation: ✅

全Wave完了。cascade-updater で product/ を更新中...
完了しました。
```

### 5.5 スキル直接呼出し（Layer 2）— パワーユーザー向け

パワーユーザーは個別スキルを直接呼び出すことも可能:

```
> domain-designerを実行して。対象UnitはwithholdingtaxでUS-217。

(domain-designer の Phase 1 が直接実行される)
```

コンポジットコマンドで省略される中間スキルの個別実行や、特定の検証だけを実行したい場合に有効。

### 5.6 コマンド数の比較

| 対象 | v0 | v1 |
|------|----|----|
| ユーザー向けコマンド | 26スキル（全て直接呼出し） | **8メインコマンド** + 4補助 |
| 内部スキル | 26 | 33 |
| ユーザーの認知負荷 | 高（26スキルの実行順序を把握必要） | **低（8コマンドで全フローカバー）** |

---

## 6. 実装ロードマップ

### Phase 1: コア統合（最優先 — 即座に着手）

| # | スキル/強化 | 種別 | 依存関係 |
|---|----------|------|---------|
| 1 | `wave-orchestrator` | 新規スキル | story-implementor, readiness-checker |
| 2 | `session-manager` | 新規スキル | なし |
| 3 | `quick-implementor` | 新規スキル | なし |
| 4 | `story-implementor` 強化 | 既存改修 | なし |
| 5 | `implementation-readiness-checker` 強化 | 既存改修 | なし |

### Phase 2: 強化機能

| # | スキル/強化 | 種別 | 依存関係 |
|---|----------|------|---------|
| 6 | `test-coverage-checker` Nyquist統合 | 既存改修 | なし |
| 7 | `codebase-mapper` | 新規スキル | unit-designer |
| 8 | `milestone-manager` | 新規スキル | session-manager |
| 9 | harness.config.json orchestrationセクション | 設定拡張 | なし |

### Phase 3: 洗練

| # | スキル/強化 | 種別 | 依存関係 |
|---|----------|------|---------|
| 10 | `scope-manager` | 新規スキル | story-writer, story-mapper |
| 11 | `research-coordinator` | 新規スキル | なし |
| 12 | コンポジットコマンド実装 | CLI | 全スキル |
| 13 | context-priority.json + モデルプロファイル | 設定 | なし |

---

## 7. 統合後の全体像

### Before (v0: AIDLC only)

```
ユーザー認知負荷: 26スキルの実行順序を把握
設計:              26スキル（手動逐次実行）
実装:              story-implementor（1ストーリーずつ逐次）
テスト検証:        コードカバレッジのみ
セッション管理:    なし（コンテキスト喪失）
進捗追跡:          なし（手動管理）
Brownfield:        非対応
Quick修正:         フルフロー必須
```

### After (v1: AIDLC + GSD Concepts)

```
ユーザー認知負荷: 8メインコマンド（Progressive Disclosure）
設計:              33スキル（内部連携、2-phase execution維持）
実装:              story-implementor × N（Wave並列、Fresh Context）
テスト検証:        コードカバレッジ + 要件カバレッジ（Nyquist）
セッション管理:    STATE.md + pause/resume
進捗追跡:          milestone-manager + progress
Brownfield:        codebase-mapper + 段階的harness導入
Quick修正:         /aidlc:quick（ハーネス緩和）
```

### 責務境界の明確化

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Progressive Disclosure (8 commands)            │
│  ユーザーが直接操作するインターフェース                     │
│  /aidlc:new-project, design-unit, plan-stories,          │
│  execute, verify, quick, progress, milestone             │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  Layer 2: Orchestration Engine (GSD概念)                  │
│  wave-orchestrator, session-manager, milestone-manager    │
│  Fresh Context配分, Wave並列化, セッション継続性            │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  Layer 3: Design Methodology (AIDLC Core, 33 skills)     │
│  product-architect, domain-designer, story-implementor   │
│  2-Phase Execution, DDD, Hexagonal Architecture          │
│  26 v0スキル + 7 v1新規スキル                              │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  Layer 4: Quality Harness (AIDLC Core)                   │
│  L1-L4 防御, Phase Gate, Nyquist Validation              │
│  ESLint AST解析, Drift Detection, Agent-Lesson            │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  Layer 5: Configuration (Unified)                        │
│  harness.config.json (AIDLC + orchestration + session)   │
│  .harness/context-priority.json                          │
│  .harness-hooks.yml                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 8. 非交渉要件（この設計で絶対に侵害しないもの）

| # | 要件 | 根拠 |
|---|------|------|
| 1 | 2-Phase Execution（設計スキルの人間承認ゲート） | AI安全性の最後の砦 |
| 2 | 4層防御モデル（L1-L4） | AIDLCの差別化要因 |
| 3 | Phase Gate（設計文書存在の物理的強制） | Quick Mode以外では維持 |
| 4 | DDD設計スキル群の独立性 | 設計方法論の核心 |
| 5 | inception/product ドキュメント分離 | 腐敗防止メカニズム |
| 6 | folder_management_rules.md 準拠 | Single Source of Truth |
| 7 | npmパッケージ非依存（GSD概念のみ自前実装） | 外部依存リスク回避 |
| 8 | yolo/skip-permissions 不採用 | セキュリティ境界 |
