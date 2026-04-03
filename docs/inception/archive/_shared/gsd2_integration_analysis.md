# GSD2.0 × AIDLC_HARNESS 統合分析・意思決定書

> **目的**: GSD2.0フレームワークの機能をAIDLC_HARNESSに統合する際の採用・棄却・融合の意思決定
> **作成日**: 2026-03-10
> **ステータス**: Draft - 4エージェントチーム議論結果統合版
> **分析チーム**: Context Engineering Specialist / Design Quality Specialist / Integration Architect / Risk & Tradeoff Analyst

---

## 1. エグゼクティブサマリー

### 結論: 「GSD2.0はオーケストレーションエンジン、AIDLCは品質エンフォーサー」

GSD2.0とAIDLC_HARNESSは**補完関係**にある。GSD2.0は「いかに効率的に実行するか」（コンテキスト工学、マルチエージェント並列化、セッション管理）に優れ、AIDLCは「いかに品質を保証するか」（DDD設計、4層防御、テスト品質、アーキテクチャ強制）に優れる。

**統合方針**: GSD2.0の**概念のみ**を自前実装し、AIDLCの品質保証層と設計方法論を維持する。npmパッケージとしてのGSD依存はしない。

**最終判定**: CONDITIONAL GO — GSD2.0のnpmパッケージは使わず、以下の概念を自前実装で取り込む:
1. コンテキストエンジニアリング（Fresh Context per Executor）
2. Wave並列実行（依存性分析→グループ化→並列）
3. セッション管理（STATE.md + pause/resume）
4. Quick Mode（ハーネス緩和版）
5. Nyquist Validation（要件→テストトレーサビリティ）

**非交渉要件**: AIDLCの12の強みのうち**9つは非交渉要件**（後述§3.2）。GSD統合はこれらを絶対に侵害しない。

---

## 2. フレームワーク比較マトリクス

### 2.1 機能領域の対応関係

| 機能領域 | GSD2.0 | AIDLC_HARNESS | 優位 | 判定 |
|----------|--------|---------------|------|------|
| **プロジェクト初期化** | `/gsd:new-project` (質問→リサーチ→要件→ロードマップ) | `product-architect` + `story-writer` + `unit-designer` | GSD | GSD採用 + AIDLC設計出力に置換 |
| **要件管理** | REQUIREMENTS.md (v1/v2/out-of-scope) | user_stories.md + units + story-mapping | AIDLC | AIDLC維持 (DDDベースの要件分解) |
| **設計フェーズ** | CONTEXT.md (実装嗜好の記録) | 26スキルによる多層設計 (domain→logical→test→uiux) | AIDLC | AIDLC維持 (設計方法論の核心) |
| **リサーチ** | 4並列エージェント (stack/features/arch/pitfalls) | なし (手動 or 個別スキル内) | GSD | GSD採用 |
| **計画検証** | Planner + Checker ループ (最大3回) | `implementation-readiness-checker` + `consistency-checker` | 互角 | 融合 |
| **実行オーケストレーション** | Wave並列実行 (依存性分析→グループ化→並列) | なし (逐次的なstory-implementor) | GSD | **GSD採用 (最重要)** |
| **コンテキスト管理** | Fresh 200K per executor (context rot防止) | なし (単一セッション依存) | GSD | **GSD採用 (最重要)** |
| **コード品質強制** | なし | 4層防御 (ESLint→Pre-commit→CI→Scheduled) | AIDLC | **AIDLC維持 (差別化要因)** |
| **アーキテクチャ強制** | なし | ESLint AST解析、レイヤー依存方向チェック | AIDLC | **AIDLC維持 (差別化要因)** |
| **テスト品質** | Nyquist Validation (要件→テストマッピング) | AAA強制、actual命名、ドメインモック禁止 | 互角 | 融合 |
| **設計-実装整合性** | なし | L4 drift-detector + consistency validator | AIDLC | **AIDLC維持** |
| **セッション管理** | pause-work/resume-work/STATE.md | なし | GSD | GSD採用 |
| **進捗追跡** | `/gsd:progress` + ROADMAP.md | なし (手動) | GSD | GSD採用 |
| **スコープ変更** | add-phase/insert-phase/remove-phase | なし (手動) | GSD | GSD採用 |
| **Quick モード** | `/gsd:quick` (ad-hocタスク) | なし (常にフル設計フロー) | GSD | GSD採用 |
| **モデルコスト最適化** | quality/balanced/budget プロファイル | なし | GSD | GSD採用 |
| **Brownfield対応** | map-codebase (4並列マッパー) | なし | GSD | GSD採用 |
| **Git管理** | Atomic commits per task + branching strategy | なし (実装者任せ) | GSD | GSD採用 |
| **マイルストーン管理** | audit→complete→new-milestone | なし | GSD | GSD採用 |
| **セキュリティ検出** | なし (deny list程度) | ハードコード秘密、SQLインジェクション、N+1検出 | AIDLC | **AIDLC維持** |
| **Phase Gate** | なし (計画はあるがコードレベル強制なし) | Pre-commit + ESLint でコード変更時に設計文書存在チェック | AIDLC | **AIDLC維持** |
| **Agent-Lesson** | なし | コード内の[Agent-Lesson]自動収集→AGENTS.md更新 | AIDLC | **AIDLC維持** |
| **Cascade Update** | なし | 下位変更→上位設計への影響伝播 | AIDLC | AIDLC維持 |
| **UAT** | `/gsd:verify-work` (自動診断+デバッグエージェント) | なし (テスト設計のみ) | GSD | GSD採用 |
| **Claude Code Hooks** | context-monitor, statusline, check-update | format-settings-hook, format-typescript-hook, analyze-errors-hook, deny-check | 互角 | 融合 |

---

## 3. 意思決定: 採用・棄却・融合

### 3.1 GSD2.0から採用する機能 (11件)

#### A1: コンテキストエンジニアリング [Critical]

**GSD機能**: Fresh 200K context per executor。オーケストレーターは15%のみ使用、各executorに100%のフレッシュコンテキストを配分。

**AIDLC現状**: 単一セッション依存。長時間作業でcontext rot発生。597KB+の設計文書がコンテキストを圧迫。`hooks_engine_implementation_plan.md`でPreCompact Hookの検討があるが「再現不可能」と結論。

**採用方針**: GSD方式を完全採用。ただしexecutorに渡すコンテキストにAIDLC設計文書（domain_model.md, logical_design.md等）を含める。
追加施策: `.harness/context-priority.json` を導入し、ドキュメント優先度（critical/important/reference/archive）を定義。

```
AIDLC統合版:
Orchestrator (15% context)
├── Load: product_overview.md, roadmap, state
├── Analyze: plan dependencies
└── Spawn Executors (each gets fresh 200K):
    ├── Load: domain_model.md, logical_design.md, test_design.md
    ├── Load: PLAN.md (XML task definition)
    └── Execute: story-implementor with full design context
```

#### A2: Wave並列実行 [Critical]

**GSD機能**: 依存性分析→Waveグループ化→Wave内並列/Wave間逐次

**AIDLC現状**: story-implementorが1ストーリーずつ逐次実行

**採用方針**: Unit内の複数ストーリー実装をWave並列化。ただしAIDLCのphase-gate（設計文書存在チェック）をWave実行前にゲートとして挿入。

```
AIDLC + GSD Wave実行:
Pre-flight: phasegate:check-ready for ALL stories in wave
Wave 1 (parallel):
├── story-implementor(US-001) [fresh context + design docs]
└── story-implementor(US-002) [fresh context + design docs]
Post-wave: harness validators (architecture, dependency, test-quality)
Wave 2:
└── story-implementor(US-003) [depends on US-001]
Post-wave: harness validators
Final: consistency check + drift detection
```

#### A3: セッション管理 (pause/resume/progress) [Important]

**GSD機能**: STATE.md に意思決定・ブロッカー・メモリを永続化。progress コマンドで現在位置表示。

**AIDLC現状**: なし。セッション切れ = コンテキスト喪失。

**採用方針**: STATE.md をAIDLCの `docs/inception/_shared/` 配下に配置。ただしAIDLCのfolder_management_rulesに準拠する形で統合。

#### A4: リサーチエージェント並列化 [Important]

**GSD機能**: 4並列リサーチャー（stack, features, architecture, pitfalls）

**AIDLC現状**: 各スキル内で個別にリサーチ（暗黙的）

**採用方針**: AIDLCの `domain-designer`, `logical-designer` の前段にリサーチフェーズを追加。特に新技術選定時に有効。

#### A5: Quick モード [Important]

**GSD機能**: `/gsd:quick` でフル計画なしのad-hocタスク実行。atomic commit + state tracking は維持。

**AIDLC現状**: 常にフル設計フロー（2-phase execution）。小さなバグ修正にも設計文書作成が必要。

**採用方針**: AIDLCに「Quick Mode」を追加。phase-gateを緩和（既存ストーリーの修正は設計文書更新不要）し、テスト品質ハーネスのみ維持。

```
Quick Mode 適用条件:
- 既存ストーリーのバグ修正
- ドキュメントのみの変更
- テストの追加（設計変更なし）
- 設定ファイルの変更

Quick Mode でも維持するハーネス:
✓ L1: ESLint (architecture, test-quality)
✓ L2: Pre-commit (dependency, test-quality)
✗ Phase Gate: 緩和（既存ストーリーの修正時のみ）
```

#### A6: 進捗追跡・ロードマップ [Important]

**GSD機能**: ROADMAP.md によるフェーズ進捗管理

**AIDLC現状**: user_story_mapping.md はあるが実行進捗なし

**採用方針**: AIDLCのstory-mapperの出力にGSD形式の進捗追跡を追加。

#### A7: スコープ変更コマンド [Nice-to-have]

**GSD機能**: add-phase, insert-phase, remove-phase

**採用方針**: AIDLCスキルとして`scope-manager`を追加。ただしstory-mappingとunit定義の整合性維持ロジック付き。

#### A8: モデルプロファイル [Nice-to-have]

**GSD機能**: quality/balanced/budget でエージェントごとにモデル選択

**採用方針**: AIDLC phasegate.config.json に `modelProfile` セクションを追加。

```json
{
  "modelProfile": "balanced",
  "profiles": {
    "quality": {
      "designer": "opus",
      "implementor": "opus",
      "checker": "sonnet"
    },
    "balanced": {
      "designer": "opus",
      "implementor": "sonnet",
      "checker": "sonnet"
    },
    "budget": {
      "designer": "sonnet",
      "implementor": "sonnet",
      "checker": "haiku"
    }
  }
}
```

#### A9: Brownfield対応 (map-codebase) [Important]

**GSD機能**: 4並列マッパーで既存コードベースを分析

**採用方針**: AIDLCスキルとして `codebase-mapper` を追加。出力はAIDLCのdomain-model形式と互換。

#### A10: Atomic Git Commits [Important]

**GSD機能**: タスクごとのatomic commit。フェーズプレフィックス付き。

**採用方針**: story-implementorにatomic commit機能を組み込み。コミットメッセージにUnit名+Story IDを含める。

```
feat(auth/US-001): add email confirmation flow
test(auth/US-001): add confirmation token validation tests
```

#### A11: UAT自動診断 [Nice-to-have]

**GSD機能**: verify-work でテスト可能な成果物を抽出→自動診断→デバッグエージェント起動

**採用方針**: scenario-test実行 + 失敗時のデバッグエージェント起動として統合。

---

### 3.2 AIDLC_HARNESSで維持する機能 (13件) — GSD2.0にないもの

| ID | 機能 | 理由 |
|----|------|------|
| ID | 機能 | 交渉可否 | 理由 |
|----|------|----------|------|
| K1 | **4層防御モデル** (L1-L4) | **非交渉** | AIDLCの差別化要因。GSD2.0に同等機能なし |
| K2 | **Phase Gate** | **非交渉** (トリガー拡張可) | 設計文書の存在をコードレベルで強制。`phase-gate.ts`の`checkImplementationReadiness()`が最終判定者 |
| K3 | **ESLint AST解析** | **非交渉** | `dependency.ts`がimportグラフ解析+循環依存検出。GSD2.0にはコードレベル強制なし |
| K4 | **テスト品質ルール** | **非交渉** | AAA, actual, single-act, no-domain-mocking。GSD2.0は「テストを書け」とだけ指示。AIDLCは「どう書くか」を強制 |
| K5 | **DDD設計スキル群** | **非交渉** (GSD概念で強化可) | domain-designer等。個別スキルがGSD概念を吸収する形で強化は可 |
| K6 | **2-Phase Execution** | **非交渉** | 最も重要なAI安全メカニズム。GSD2.0より構造的に強力 |
| K7 | **Document Split** (inception/product) | **非交渉** | inception=一時的、product=累積的。GSD2.0の`.planning/`はフラットで劣る |
| K8 | **Cascade Updater** | **非交渉** (メカニズム改善可) | 概念は維持。GSD依存追跡で「影響範囲特定」ステップの自動化は可 |
| K9 | **Agent-Lesson System** | **非交渉** (ユニーク革新) | GSD2.0にも主流フレームワークにも同等機能なし |
| K10 | **Security/Performance検出** | 維持推奨 | 3rd-partyツール代替可だが、phasegate.config.json統合とHarnessError統一形式に価値あり |
| K11 | **Drift Detection** | **非交渉** (検出範囲拡張可) | 双方向検出（設計にあるがコードにない / コードにあるが設計にない）。GSD完了追跡との連携で強化可 |
| K12 | **Consistency Checker** | 維持 (drift detectorと役割整理要) | drift-detector = コードレベル整合性。consistency-checker = 文書間レイヤー整合性に特化 |
| K13 | **phasegate.config.json** | **非交渉** | 単一設定ファイル。GSD設定もここに統合 |

---

### 3.3 棄却する機能 (7件)

#### GSD2.0から棄却

| ID | 機能 | 棄却理由 |
|----|------|----------|
| D1 | **`--dangerously-skip-permissions`** 推奨 | AIDLCの安全哲学と真っ向対立。AIDLC deny-check.sh + settings.json の deny list で制御 |
| D2 | **yolo モード** | AIDLCの2-phase execution (人間承認) の存在意義を無効化する |
| D3 | **GSD独自のXML Plan構造** | AIDLCの設計文書（domain_model.md, logical_design.md）が計画の役割を果たす。XML taskは過剰 |
| D4 | **`.planning/` ディレクトリ** | AIDLCの `docs/inception/` + `docs/product/` で統一。ドキュメント配置ルールの二重化を防止 |
| D5 | **GSD独自のPROJECT.md/REQUIREMENTS.md** | AIDLCの `product_overview.md` + `user_stories.md` + `units/` で代替済み |

#### AIDLCから棄却

| ID | 機能 | 棄却理由 |
|----|------|----------|
| D6 | **逐次実行のみの story-implementor** | GSD2.0のWave並列実行に置き換え。story-implementorのロジック自体は維持するが、オーケストレーションはGSD方式に |
| D7 | **設計変更なしのバグ修正にもフル設計フロー強制** | GSD2.0 Quick Modeを採用し、小規模修正の効率化 |

---

### 3.4 融合する機能 (5件)

#### F1: 計画検証ループ

```
GSD: Planner + Checker (最大3回ループ)
AIDLC: implementation-readiness-checker + consistency-checker

融合方針:
1. GSD方式の「計画→検証→修正ループ」を採用
2. 検証基準にAIDLCのチェッカーを使用:
   - implementation-readiness-checker: 設計文書の完全性
   - consistency-checker: レイヤー間整合性
   - test-coverage-checker: テスト網羅性
3. ループ上限: 3回 (GSD準拠)
```

#### F2: テスト検証 + 要件トレーサビリティ

```
GSD: Nyquist Validation (要件→テストコマンドマッピング)
AIDLC: test-coverage-checker + unit-test-designer + scenario-test-designer

現状の問題:
AIDLCのtest-coverage-checkerと90%CIカバレッジゲートは「コードカバレッジ」を測定。
「要件カバレッジ」（各受入基準にテストが紐づいているか）は未検証。

融合方針:
1. GSD Nyquistの「要件→テストマッピング」概念を採用
2. マッピング対象をAIDLCの設計レベルに拡張:
   - User Story (AC) → Scenario Test (E2E)
   - Use Case → Integration Test
   - Domain Model (Entity/VO) → Unit Test
3. `requirement-test-matrix.json` をUnit単位で生成
4. AC→テストマッピング完全性チェックをphase-gateに追加
5. `phasegate:impact-analysis US-XXX` コマンドで変更影響検出
6. AIDLC test-coverage-checker がNyquist検証を内包
7. Wave実行前にVALIDATION.md を生成
```

#### F3: Claude Code Hooks

```
GSD: gsd-context-monitor.js, gsd-statusline.js, gsd-check-update.js
AIDLC: deny-check.sh, format-settings-hook.sh, format-typescript-hook.sh, analyze-errors-hook.sh

融合方針:
1. 両方のHooksを統合（衝突しない）
2. AIDLC側のHooksはPreToolUse/PostToolUseに配置（現状維持）
3. GSD側のcontext-monitorをAIDLC版に適応:
   - コンテキスト使用率のモニタリング
   - 閾値超過時の自動/clear警告
4. AIDLC deny-check.sh は維持（GSD skip-permissionsの代替として必須）
```

#### F4: ドキュメント配置

```
GSD: .planning/ (フラット構造)
AIDLC: docs/inception/ + docs/product/ (階層構造)

融合方針:
1. AIDLCのdocs/配下に統一
2. GSD由来のアーティファクトの配置ルール:
   - PROJECT.md → 不要（product_overview.mdで代替）
   - REQUIREMENTS.md → 不要（user_stories.mdで代替）
   - ROADMAP.md → docs/inception/_shared/roadmap.md
   - STATE.md → docs/inception/_shared/state.md
   - RESEARCH.md → docs/inception/{unit}/research.md
   - VALIDATION.md → docs/inception/{unit}/{US}/validation.md
   - SUMMARY.md → docs/inception/{unit}/{US}/implementation_summary.md
   - UAT.md → docs/inception/{unit}/{US}/uat_report.md
3. folder_management_rules.md を更新してGSD由来ファイルの配置を明記
```

#### F5: 設定ファイル統合

```
GSD: .planning/config.json
AIDLC: phasegate.config.json

融合方針:
phasegate.config.json にGSD設定を統合

{
  // AIDLC既存
  "version": "2.0",
  "preset": "standard",
  "project": { ... },
  "layers": { ... },
  "harnesses": { ... },
  "paths": { ... },
  "reporting": { ... },

  // GSD統合追加
  "orchestration": {
    "mode": "interactive",        // interactive | quick
    "parallelization": true,      // Wave並列実行
    "modelProfile": "balanced",   // quality | balanced | budget
    "contextStrategy": "fresh",   // fresh (200K per executor)
    "commitStrategy": "atomic",   // atomic | phase | manual
    "branchingStrategy": "none",  // none | phase | milestone
    "workflow": {
      "research": true,
      "planCheck": true,
      "verifier": true,
      "nyquistValidation": true
    }
  },
  "session": {
    "stateFile": "docs/inception/_shared/state.md",
    "roadmapFile": "docs/inception/_shared/roadmap.md"
  }
}
```

---

## 4. 統合アーキテクチャ

### 4.1 レイヤー構成

```
┌─────────────────────────────────────────────────────────┐
│                   User Interface                        │
│  AIDLC Skills (26) + GSD-inspired Commands              │
│  /aidlc:new-project, /aidlc:plan-unit, /aidlc:execute,  │
│  /aidlc:verify, /aidlc:progress, /aidlc:quick           │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Orchestration Engine (from GSD)             │
│  - Context Engineering (fresh 200K per executor)         │
│  - Wave Parallelization (dependency → group → parallel)  │
│  - Session Management (pause/resume/STATE.md)            │
│  - Progress Tracking (ROADMAP.md)                        │
│  - Model Profile Selection                               │
│  - Atomic Git Commits                                    │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│            Design Methodology (AIDLC Core)              │
│  - DDD Tactical Patterns (Entity, VO, Aggregate)         │
│  - Hexagonal Architecture                                │
│  - 26 Specialized Design Skills                          │
│  - 2-Phase Execution (Plan → Approve → Execute)          │
│  - Inception/Product Document Split                      │
│  - Cascade Update                                        │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│            Quality Harness (AIDLC Core)                  │
│  L1: ESLint (architecture, metadata, test-quality)       │
│  L2: Pre-commit (phase-gate, dependency, test-quality)   │
│  L3: CI/CD (consistency, coverage, security)             │
│  L4: Scheduled (drift, lessons, dead-code)               │
│  + Nyquist Validation (from GSD, enhanced)               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Configuration (Unified)                     │
│  phasegate.config.json                                     │
│  (AIDLC harness + GSD orchestration + session)           │
└─────────────────────────────────────────────────────────┘
```

### 4.2 統合ワークフロー

```
Project Start
     │
     ▼
┌─────────────────────────┐
│ Phase 0: Foundation      │
│ ┌─ product-architect ──┐│  ← AIDLC設計スキル
│ │  (+ GSD parallel     ││  ← GSDリサーチャー組込み
│ │   researchers)        ││
│ ├─ story-writer ────────┤│
│ ├─ unit-designer ───────┤│
│ └─ story-mapper ────────┘│
│ Output: product/ docs    │
└────────────┬────────────┘
             │
     ┌───────▼────────┐
     │ FOR EACH UNIT: │
     │                │
     │ Phase 1: Design│
     │ ┌─domain-designer──┐  ← AIDLC 2-phase execution
     │ ├─logical-designer──┤
     │ ├─test-designers────┤
     │ ├─uiux-designer─────┤
     │ └─readiness-checker─┘
     │         │
     │ Phase 2: Plan  │
     │ ┌─implementation-planner──┐
     │ │ + GSD plan-checker loop │  ← GSD検証ループ (max 3)
     │ │ + Nyquist validation    │  ← GSD テストマッピング
     │ └─────────┬───────────────┘
     │           │
     │ Phase 3: Execute │
     │ ┌─GSD Wave Orchestrator──────┐  ← GSD実行エンジン
     │ │ Pre-flight:                │
     │ │   phasegate:check-ready      │  ← AIDLC phase-gate
     │ │ Wave 1 (parallel):         │
     │ │   ├─ executor(US-001)      │  ← Fresh 200K context
     │ │   └─ executor(US-002)      │     + AIDLC design docs
     │ │ Post-wave:                 │
     │ │   harness validators       │  ← AIDLC L2 checks
     │ │ Wave 2:                    │
     │ │   └─ executor(US-003)      │
     │ │ Post-wave:                 │
     │ │   harness validators       │
     │ │ Atomic commits per task    │  ← GSD git管理
     │ └────────────┬───────────────┘
     │              │
     │ Phase 4: Verify │
     │ ┌─GSD verify-work────────────┐  ← GSD UAT
     │ │ + AIDLC consistency-checker│  ← AIDLC整合性
     │ │ + AIDLC drift-detector     │  ← AIDLC乖離検出
     │ │ + cascade-updater          │  ← AIDLC影響伝播
     │ └────────────┬───────────────┘
     │              │
     │     Next Unit? ──────────────┘
     │              │ No
     └──────────────┼──────────────┘
                    │
     ┌──────────────▼──────────────┐
     │ Milestone Complete           │
     │ /aidlc:audit-milestone       │  ← GSD概念採用
     │ /aidlc:complete-milestone    │
     └─────────────────────────────┘
```

---

## 5. リスク分析と軽減策

### 5.0 統合の絶対条件 (Go/No-Go Gate)

以下の条件をすべて満たす場合のみ統合を進める。1つでも満たせない場合は統合を中止する。

| # | 条件 | 根拠 |
|---|------|------|
| 1 | **npmパッケージ非依存**: GSD2.0のnpmパッケージは使わず概念のみ自前実装 | 外部依存リスク回避、AIDLC自己完結性の維持 |
| 2 | **`.planning/` 不使用**: GSD由来のアーティファクトはすべて `docs/inception/` に配置 | folder_management_rules.md 準拠 |
| 3 | **設定ファイル統一**: GSD設定は `phasegate.config.json` に統合、別config.json不可 | Single Source of Truth |
| 4 | **yolo/skip-permissions 不採用**: AIDLCのdeny listとhooksは不可侵 | セキュリティ境界 |
| 5 | **2-phase execution 維持**: 設計スキルの人間承認ゲートは絶対維持 | AI安全性の最後の砦 |
| 6 | **プロジェクトローカル実行**: `~/.claude/` へのグローバルインストール不可 | 他プロジェクトへの影響回避 |
| 7 | **既存コマンド体系尊重**: `/gsd:*` コマンドは露出せず、AIDLCスキル内部に統合 | UX一貫性 |
| 8 | **デフォルトOFF**: GSD由来機能は `phasegate.config.json` でデフォルト無効 | Progressive adoption |

### 5.1 リスクマトリクス

| リスク | 深刻度 | 発生確率 | 軽減策 |
|--------|--------|----------|--------|
| **哲学の衝突**: GSD「速度優先」vs AIDLC「品質優先」 | 高 | 中 | AIDLCの品質ゲートを非交渉要件として確立。GSD側のyolo/skip-permissionsは採用しない |
| **複雑度の爆発**: 26スキル + GSD実行エンジン | 高 | 高 | 段階的統合（Phase 1: コア3機能のみ）。ユーザーから見えるコマンドは簡素に保つ |
| **設定ファイルの肥大化** | 中 | 中 | phasegate.config.json に統合。GSD設定はorchestrationセクション内に封じ込め |
| **ドキュメント配置の混乱** | 中 | 低 | folder_management_rules.md を更新。GSD由来ファイルの配置ルールを明記 |
| **GSD外部依存** (npm package更新) | 中 | 中 | GSD概念のみ採用し、npmパッケージには依存しない。自前実装 |
| **学習曲線の増大** | 中 | 高 | Quick Modeを入口に。フル機能は段階的に利用可能に |
| **セッション管理とAIDLC state競合** | 低 | 低 | STATE.md は inception/_shared/ に配置。既存ファイルとの衝突なし |

### 5.2 哲学的トレードオフの解決

| 軸 | GSD2.0の立場 | AIDLCの立場 | **統合版の立場** |
|----|-------------|-------------|-----------------|
| 速度 vs 品質 | 速度優先 | 品質優先 | **品質ゲート付き速度最適化**: ゲートは通過必須、ゲート間は最大速度 |
| 自動 vs 人間制御 | 自動化推奨 | 人間承認必須 | **設計は人間承認、実行は自動化**: 2-phase execution維持、Wave実行は自動 |
| 簡素 vs 完全 | コマンド数を最小に | 26スキルでカバレッジ完全 | **Progressive Disclosure**: 基本コマンド5つ + 詳細操作はスキル経由 |

---

## 6. 実装ロードマップ

### Phase 1: コア統合 (最優先)

| 項目 | 工数見積 | 成果物 |
|------|---------|--------|
| Context Engineering統合 | スキル設計 | story-implementorにfresh context分離を組込み |
| Wave並列実行 | スキル設計 + CLI | `wave-orchestrator` スキル新規作成 |
| Session管理 | スキル設計 | STATE.md + progress コマンド |
| Quick Mode | スキル設計 | `quick` スキル新規作成 |
| phasegate.config.json拡張 | 実装 | orchestrationセクション追加 |

### Phase 2: 強化機能

| 項目 | 工数見積 | 成果物 |
|------|---------|--------|
| Nyquist Validation統合 | test-coverage-checker拡張 | VALIDATION.md生成 |
| Brownfield対応 | スキル設計 | `codebase-mapper` スキル新規作成 |
| Model Profile | phasegate.config.json | プロファイル設定 |
| Atomic Git Commits | story-implementor拡張 | コミット戦略の自動化 |
| Milestone管理 | スキル設計 | `milestone-manager` スキル新規作成 |

### Phase 3: 洗練

| 項目 | 成果物 |
|------|--------|
| Context Monitor Hook | コンテキスト使用率モニタリング |
| リサーチャー並列化 | domain-designer前段のリサーチ強化 |
| scope-manager | add/insert/remove phase |
| UAT自動診断統合 | scenario-test + デバッグエージェント |
| folder_management_rules.md更新 | GSD由来ファイル配置ルール |

---

## 7. 新規コマンド体系 (統合後)

### メインコマンド (ユーザー向け)

| コマンド | 対応GSD | 内部で呼ぶAIDLCスキル |
|----------|---------|----------------------|
| `/aidlc:new-project` | `/gsd:new-project` | product-architect, story-writer, unit-designer, story-mapper |
| `/aidlc:design-unit <unit>` | `/gsd:discuss-phase` | domain-designer, logical-designer, test-designers |
| `/aidlc:plan-stories <unit>` | `/gsd:plan-phase` | implementation-planner + readiness-checker (loop) |
| `/aidlc:execute <unit>` | `/gsd:execute-phase` | wave-orchestrator → story-implementor (parallel) |
| `/aidlc:verify <unit>` | `/gsd:verify-work` | consistency-checker, drift-detector, cascade-updater |
| `/aidlc:progress` | `/gsd:progress` | (state/roadmap読み取り) |
| `/aidlc:quick` | `/gsd:quick` | (ハーネス緩和版 story-implementor) |
| `/aidlc:milestone` | `/gsd:complete-milestone` | (アーカイブ + タグ) |

### ハーネスコマンド (既存維持)

```
phasegate:status, phasegate:init, phasegate:enable, phasegate:disable,
phasegate:check-phase, phasegate:check-ready, phasegate:ci-check,
phasegate:detect-drift, phasegate:collect-lessons, phasegate:detect-dead-code
```

---

## 8. 採用しないGSD2.0機能の詳細理由

### D1: `--dangerously-skip-permissions` の不採用

GSD2.0は「GSD is designed for frictionless automation. Stopping to approve `date` and `git commit` 50 times defeats the purpose.」と主張する。

**AIDLC反論**: AIDLC_HARNESSは `.claude/settings.json` の deny list で危険な操作（deploy, git push, rm -rf, sudo等）を明示的にブロックしている。これはAIエージェントの暴走を防ぐ安全装置であり、GSD2.0の利便性のために無効化すべきではない。

**代替策**: 頻繁に承認が必要な安全なコマンド（date, echo, ls等）は settings.json の allow list に追加。危険なコマンドのみ deny を維持。

### D2: yolo モードの不採用

GSD2.0の `mode: "yolo"` は全意思決定を自動承認する。

**AIDLC反論**: AIDLCの2-phase execution（Plan→Human Approval→Execute）は設計品質の最後の砦。特にdomain-designerやlogical-designerの出力は人間のレビューが必須。

**代替策**: 2-phase executionは設計スキルでのみ必須。実行フェーズ（story-implementor）は自動化可。

### D3: XML Plan構造の不採用

GSD2.0の `<task type="auto">` XML構造は汎用的だが浅い。

**AIDLC反論**: AIDLCの設計文書（domain_model.md, logical_design.md, test_design.md）がPlanの役割を果たし、より深い設計情報を含む。XMLタスク定義は設計文書のサブセットに過ぎない。

**代替策**: story-implementorが設計文書を直接読む。XMLは不要。

### D4-D5: .planning/ ディレクトリとGSD独自文書の不採用

**AIDLC反論**: AIDLCは `docs/inception/` (一時的) と `docs/product/` (永続的) の明確な分離があり、folder_management_rules.mdで管理されている。`.planning/` を追加するとドキュメント配置の二重化が発生する。

---

## 9. GSD2.0の思想で学ぶべきだが機能として取り込まないもの

### 「コンテキストの新鮮さ」の思想

GSD2.0の最も重要な洞察は「context rot = 品質劣化」という認識。これは機能ではなく**設計原則**として取り込む:

> **AIDLC設計原則追加**: 長時間の設計・実装セッションでは、明示的にコンテキストをリフレッシュする。各story-implementorは独立したコンテキストで実行し、設計文書を毎回ロードする。

### 「XML Prompt Formatting」の思想

GSD2.0がXMLでプロンプトを構造化するのは、AIの理解精度を上げるため。AIDLCはすでにマークダウンで構造化された設計文書を持つが、**実行指示の構造化**は改善余地あり。

> **AIDLC改善**: story-implementorの入力を、より構造化された形式（セクション、明確なタスク定義）に改善。ただしXMLではなくマークダウンで。

---

## 10. 統合後の全体像

### Before (AIDLC only)

```
設計: 26スキル (手動逐次実行) ← 人間がスキルを1つずつ呼ぶ
実行: story-implementor (1ストーリーずつ) ← コンテキスト制限
品質: 4層防御 ← 強力
追跡: なし ← 弱点
セッション: なし ← 弱点
```

### After (AIDLC + GSD Concepts)

```
設計: 26スキル (2-phase execution維持) ← 品質保証
オーケストレーション: Wave並列実行 + Fresh Context ← GSD由来
実行: story-implementor × N (並列) ← 効率化
品質: 4層防御 + Nyquist Validation ← 強化
追跡: ROADMAP.md + progress コマンド ← GSD由来
セッション: STATE.md + pause/resume ← GSD由来
Quick: /aidlc:quick (ハーネス緩和) ← GSD由来
コスト: Model Profiles ← GSD由来
```

---

## Appendix A: GSD2.0 コマンド → AIDLC対応表

| GSD2.0 コマンド | 統合後の対応 | 備考 |
|-----------------|-------------|------|
| `/gsd:new-project` | `/aidlc:new-project` | product-architect群を内部呼出 |
| `/gsd:discuss-phase` | AIDLCスキル直接呼出 | domain-designer等の2-phase execution |
| `/gsd:plan-phase` | `/aidlc:plan-stories` | implementation-planner + checker loop |
| `/gsd:execute-phase` | `/aidlc:execute` | wave-orchestrator + story-implementor |
| `/gsd:verify-work` | `/aidlc:verify` | consistency + drift + cascade |
| `/gsd:progress` | `/aidlc:progress` | そのまま採用 |
| `/gsd:quick` | `/aidlc:quick` | ハーネス緩和版 |
| `/gsd:map-codebase` | `/aidlc:map-codebase` | codebase-mapper新規スキル |
| `/gsd:audit-milestone` | `/aidlc:milestone audit` | 新規 |
| `/gsd:complete-milestone` | `/aidlc:milestone complete` | 新規 |
| `/gsd:new-milestone` | `/aidlc:milestone new` | 新規 |
| `/gsd:pause-work` | `/aidlc:pause` | STATE.md更新 |
| `/gsd:resume-work` | `/aidlc:resume` | STATE.md読込 |
| `/gsd:add-phase` | `/aidlc:scope add` | scope-manager |
| `/gsd:insert-phase` | `/aidlc:scope insert` | scope-manager |
| `/gsd:remove-phase` | `/aidlc:scope remove` | scope-manager |
| `/gsd:debug` | (既存のデバッグフロー) | 特別なコマンド不要 |
| `/gsd:settings` | phasegate.config.json直接編集 | CLIコマンド追加検討 |
| `/gsd:set-profile` | phasegate.config.json | 設定変更 |
| `/gsd:health` | `phasegate:status` | 既存コマンドで代替 |
| `/gsd:update` | (npmパッケージ非依存のため不要) | 自前管理 |

## Appendix B: 新規作成が必要なスキル

| スキル名 | 由来 | 優先度 |
|----------|------|--------|
| `wave-orchestrator` | GSD execute-phase | Phase 1 |
| `session-manager` | GSD pause/resume/progress | Phase 1 |
| `quick-implementor` | GSD quick | Phase 1 |
| `codebase-mapper` | GSD map-codebase | Phase 2 |
| `milestone-manager` | GSD milestone lifecycle | Phase 2 |
| `scope-manager` | GSD add/insert/remove phase | Phase 3 |
| `research-coordinator` | GSD parallel researchers | Phase 3 |

---

## 11. 統合で初めて可能になること (Neither Framework Alone)

| # | 新機能 | 説明 |
|---|--------|------|
| 1 | **自律的設計→実装パイプライン** | AIDLCのフル設計ライフサイクルがGSDオーケストレーションで自動進行。人間ゲートは2-phase承認ポイントのみ |
| 2 | **並列マルチUnit開発** | @unit分離 + dependency validatorにより安全に並列実装可能 |
| 3 | **コスト最適化品質保証** | モデルルーティング: 設計=Opus、実装=Sonnet、検証=Haiku、Codex委任=既存codex-delegator |
| 4 | **自己修復ハーネス** | lesson-collector検出 → cascade-updater → ハーネスルール改善の自動フィードバックループ |
| 5 | **段階的Brownfield採用** | map-codebase → L1のみ → L2追加 → L3追加 → L4追加（週単位で段階的に） |
| 6 | **完全な要件→テストトレーサビリティ** | Nyquist over AIDLC metadata chain: user_stories → unit → domain_model → logical_design → test_design → code(@story) |
| 7 | **エラー自己修正ループ** | GSD retry + AIDLCの`agent_instruction`エラーフィールド → 次回試行コンテキストに自動注入 |

## 12. 責務境界の原則

```
┌─────────────────────────────────────────────────────┐
│  GSD概念が担う領域 (Orchestration)                    │
│  - Executorライフサイクル管理                          │
│  - コンテキスト配分                                   │
│  - Wave スケジューリング                              │
│  - セッション管理 (pause/resume)                      │
│  - モデルルーティング                                  │
│  - スコープ変更管理                                   │
└─────────────────────────────────────────────────────┘
        ↕ 共有: config, progress, git strategy, retry loop
┌─────────────────────────────────────────────────────┐
│  AIDLCが担う領域 (Governance)                         │
│  - スキル定義 (26スキル)                              │
│  - Phase Gate ルール                                  │
│  - バリデータ (8+3)                                   │
│  - ESLintルール (4)                                   │
│  - エラーフォーマット (HarnessError)                   │
│  - ドキュメント構造 (inception/product)                │
│  - テスト品質基準                                     │
│  - メタデータ (@unit/@layer)                          │
│  - Cascade Update                                     │
│  - Agent-Lesson収集                                   │
└─────────────────────────────────────────────────────┘
```

---

> **最終判定**: GSD2.0の実行エンジン概念（コンテキスト工学、Wave並列化、セッション管理）をAIDLC_HARNESSに**自前実装**で統合する。AIDLCの設計方法論（DDD、26スキル、2-phase execution）と品質ハーネス（4層防御）は維持する。GSD2.0のnpmパッケージには依存せず、概念のみを採用する。統合はPhase 1（コア3機能）→ Phase 2（強化5機能）→ Phase 3（洗練4機能）の段階的実装で進める。
