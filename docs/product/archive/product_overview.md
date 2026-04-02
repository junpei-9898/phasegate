# Phasegate — Product Overview

> **Version**: v1.0 (Draft)
> **作成日**: 2026-03-10
> **前身**: AIDLC Harness v0（ALIDL_HARNESS）
> **ステータス**: Inception — 全体設計確定待ち

---

## 1. プロダクト定義

### 1.1 正式名称

**Phasegate** = **G**overned **S**oftware **D**evelopment **L**ife**C**ycle

| 要素 | 意味 | 由来 |
|------|------|------|
| **G** | Governed（統治された） | AIDLC v0 の品質ガバナンス思想 |
| **SD** | Software Development | SDLC の業界標準用語 |
| **LC** | Life Cycle | プロジェクト全生涯の管理 |

"Get Shit Done" の精神（速度・実行力・実用主義）をDNAとして持ちながら、"Governed" の冠により「品質ゲートなき速度は暴走に過ぎない」というAIDLCの哲学を表現する。口語では "Get Shit Done Life Cycle" と読んでも差し支えない。これは意図的なダブルミーニングである。

### 1.2 What This Is

**Phasegateは、AIエージェントによるソフトウェア開発の全ライフサイクルを、品質ゲート付きで自律的にオーケストレーションするエンジニアリングツールキットである。** DDD設計方法論と5層品質防御（L0-L4）を核に持ち、FUSE Hooks Engineによる決定論的ガバナンスとWave並列実行によって、設計から実装・検証までを安全かつ高速に駆動する。

**対象ユーザー**: AIエージェント（Claude Code, Codex等）を活用してプロダクション品質のソフトウェアを構築するエンジニアリングチーム。「AIにコードを書かせたいが、品質を妥協したくない」チームのためのもの。

### 1.3 Core Value

> **「設計意図とコードの構造的整合性を、機械的に保証し続けること」**

全てのスキルが壊れても、全てのオーケストレーションが止まっても、この1つだけは機能しなければならない。設計文書に書かれた構造（ドメインモデル、レイヤー境界、テスト仕様）と、実際のコードが乖離していないことを、人間の注意力に頼らず検出し続ける能力。

v1で追加される全ての機能（Wave並列実行、コンテキスト管理、セッション管理）は、このCore Valueを侵害しない限りにおいてのみ存在が許される。

---

## 2. v0からv1への進化

### 2.1 進化のナラティブ

**AIDLC Harness v0**は「AI駆動開発に品質保証の鎧を着せる」ことに成功した。24のAgentSkills、4層防御モデル（L1-L4）、2-Phase Execution、@unit/@layerメタデータによるコード-設計トレーサビリティは、AIエージェントが生成するコードの品質を人間の設計意図に従わせる強力な仕組みを確立した。

しかしv0には致命的な弱点があった：

| 弱点 | 影響 |
|------|------|
| **コンテキスト腐敗** | 597KB超の設計ドキュメントがコンテキストを圧迫。長時間セッションで品質劣化 |
| **逐次実行のボトルネック** | 1ストーリーずつの逐次実行。並列化の仕組みなし |
| **セッション間の記憶喪失** | pause/resume機構なし。セッション切れ＝コンテキスト喪失 |
| **柔軟性の欠如** | 1行のタイポ修正にもフル設計フロー強制 |
| **ライフサイクル管理不在** | マイルストーン・ロードマップ・進捗追跡の仕組みなし |

一方、GSD2.0フレームワークは正反対の強みを持っていた。コンテキストエンジニアリング、Wave並列実行、セッション管理。速度は出るが、品質の担保は開発者の自己規律に委ねられていた。

**Phasegate v1は、この二つの世界を一つにする。** GSD2.0の「オーケストレーションエンジン」をAIDLCの「品質エンフォーサー」の内側に組み込む。

```
v0 (AIDLC)        v1 (Phasegate)
品質 ████████████   品質 ████████████  ← 維持
速度 ████           速度 ██████████    ← Wave並列で強化
効率 ███            効率 █████████     ← コンテキスト管理で強化
柔軟 ██             柔軟 ████████      ← Quick Mode追加
```

### 2.2 統合方針

**「GSD2.0の概念のみを自前実装し、AIDLCの品質保証層と設計方法論を維持する」**

- GSD2.0のnpmパッケージには依存しない
- GSD2.0のコマンド体系（`/gsd:*`）は露出せず、Phasegateスキル内部に統合
- AIDLCのK1-K13非交渉要件（+K3.5）は絶対維持

---

## 3. 設計哲学 — 5原則

### 原則 1: Gated Velocity（品質ゲート付き速度最適化）

> ゲートは通過必須。ゲート間は最大速度。

```
Gate ──── 最大速度 ──── Gate ──── 最大速度 ──── Gate
 │    Wave 1 (並列)     │    Wave 2 (並列)     │
 │    ├─ US-001         │    └─ US-003         │
 │    └─ US-002         │                      │
 └─ Pre-flight          └─ Post-wave           └─ Final
    harness:check-ready    L2 validators          drift-detect
```

### 原則 2: Human Gate, Machine Execute（設計は人間承認、実行は機械自律）

> 2-Phase Executionは設計フェーズの聖域。実行フェーズは自律の領域。

設計スキル（domain-designer, logical-designer等）の出力には必ず人間の承認を求め、実行スキル（story-implementor）は承認済み設計に基づいて自律的に動く。Quick Modeであっても、新規ドメインモデルの追加には人間承認が必須。

### 原則 3: Fresh Context = Quality（コンテキストの鮮度は品質である）

> 腐ったコンテキストで書かれたコードは、腐ったコードである。

各executorには新鮮な200Kコンテキストを割り当て、設計文書を毎回ロードする。オーケストレーターはコンテキストの15%のみ使用し、残りをexecutorに配分する。

### 原則 4: Executable Governance（検証は実行可能コードで表現する）

> ドキュメントに書かれたルールは破られる。コードに書かれたルールは実行される。ファイルシステムで阻止されたルールは物理的に破れない。

- 「ドメイン層は外部フレームワークに依存しない」→ `no-layer-violation` Biomeルール
- 「全ソースファイルにUnit/Layer帰属を明示する」→ `require-unit-comment` / `require-layer-comment` Biomeルール
- 「フォルダ構造はアーキテクチャに従う」→ `enforce-folder-structure` Biomeルール
- 「テストはAAAパターンで書く」→ `test-quality` Pre-commitバリデータ（AAA/actual/single-act/no-domain-mock）
- 「設計文書なしに実装コードを変更しない」→ `phase-gate` Pre-commitバリデータ
- 「レイヤー違反ファイルは書き込めない」→ FUSE PreWrite物理阻止（L0）

FUSE Hooks EngineはこのExecutable Governanceに**物理的強制力**を与える。L1-L4が「検出して報告する」のに対し、L0は「そもそも書き込ませない」。これにより、AIエージェントの種類やプロンプト遵守度に依存しない、決定論的なガバナンスが実現する。

### 原則 5: Progressive Disclosure（段階的開示で複雑さを隠蔽する）

> 入口は簡素に。奥行きは深く。

- **入口**: `/gsdlc:quick` で即座にアドホックタスクを実行
- **標準**: `/gsdlc:execute <unit>` でWave並列実行が自動的に動く
- **詳細**: 個別スキル（domain-designer等）を直接呼び出せる
- **設定**: `phasegate.config.json` で全パラメータを制御

---

## 4. アーキテクチャ

### 4.1 レイヤー構成

```
╔═══════════════════════════════════════════════════════════════════════╗
║  Layer 1: USER INTERFACE                                             ║
║  ─────────────────────────────────────────────────────────────────── ║
║  [Main Commands]           [Session]           [Harness]             ║
║  /gsdlc:init-project       /gsdlc:pause        harness:status       ║
║  /gsdlc:design <unit>      /gsdlc:resume        harness:check-phase  ║
║  /gsdlc:plan <unit>        /gsdlc:progress      harness:check-ready  ║
║  /gsdlc:execute <unit>                          harness:ci-check     ║
║  /gsdlc:verify <unit>     [Utility]             harness:detect-drift ║
║  /gsdlc:quick <task>       /gsdlc:map-codebase  harness:init         ║
║  /gsdlc:progress           /gsdlc:settings      harness:enable       ║
║  /gsdlc:milestone <act>                          harness:disable      ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Layer 2: ORCHESTRATION ENGINE                     [GSD2.0由来]      ║
║  ─────────────────────────────────────────────────────────────────── ║
║  ┌─────────────────┐ ┌──────────────────┐ ┌────────────────────┐    ║
║  │ Wave Scheduler  │ │ Session Manager  │ │ Model Router       │    ║
║  │ 依存性→Wave化  │ │ STATE.md永続化   │ │ quality/balanced   │    ║
║  │ Wave内並列      │ │ pause/resume     │ │ /budget profiles   │    ║
║  │ Pre-flight gate │ │ ROADMAP.md進捗   │ │                    │    ║
║  └─────────────────┘ └──────────────────┘ └────────────────────┘    ║
║  ┌─────────────────┐ ┌──────────────────┐                           ║
║  │ Git Strategy    │ │ Research Coord.  │  ※Context管理は           ║
║  │ Atomic commits  │ │ 4並列リサーチャー│  FUSE Hooks Engine        ║
║  │ feat(unit/US):  │ │ stack/features/  │  (横断基盤) が担当        ║
║  │ prefix          │ │ arch/pitfalls    │                           ║
║  └─────────────────┘ └──────────────────┘                           ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Layer 3: DESIGN METHODOLOGY                       [AIDLC v0核心]   ║
║  ─────────────────────────────────────────────────────────────────── ║
║  [2-Phase Execution: Plan → Human Approval → Execute]                ║
║                                                                      ║
║  Phase 0: Foundation        Phase 1: Unit Design                     ║
║  product-architect          domain-designer → logical-designer       ║
║  story-writer               → test-designers → uiux-designer        ║
║  unit-designer              → test-coverage-checker                  ║
║  story-mapper               → readiness-checker                      ║
║                                                                      ║
║  Phase 2: Story Impl        Support Skills                           ║
║  story-implementor          consistency-checker, cascade-updater     ║
║  (Wave並列実行)             codebase-mapper, codex-delegator         ║
║                                                                      ║
║  [DDD: Entity/VO/Aggregate, Hexagonal, Port & Adapter]              ║
║  [Document: inception/(一時的) + product/(永続的累積)]               ║
║  [@unit/@layer Metadata: 全ソースファイルにUnit・Layer帰属を       ║
║   コメントで付与し、コード⇔設計の双方向トレーサビリティを実現]     ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Layer 4: QUALITY HARNESS                          [AIDLC v0核心]    ║
║  ─────────────────────────────────────────────────────────────────── ║
║  L0 FUSE:      Pre-write enforcement (optional, FUSE Hooks Engine)   ║
║                  ファイル書き込み前にルール違反を物理的に阻止         ║
║  L1 Editor:    Biome AST (v0 ESLint 4ルールをBiome移行)             ║
║                  require-unit-comment / require-layer-comment         ║
║                  no-layer-violation / enforce-folder-structure        ║
║                  + AI生成コードアンチパターン検出                      ║
║                  (any乱用/コード重複/ゴーストファイル/コメント洪水)    ║
║  L2 Pre-commit: phase-gate / architecture / metadata                 ║
║                  + Wave Pre-flight Gate                               ║
║  L3 CI/CD:     dependency / test-quality / security / performance    ║
║                  / consistency / coverage(90%)                        ║
║                  + Nyquist Validation (要件→テストトレーサビリティ)   ║
║  L4 Scheduled: drift-detector / lesson-collector / dead-code         ║
║                  + context-monitor                                    ║
║                  + doc-freshness-checker (ドキュメント鮮度検証)        ║
║                  + pointer-validator (AGENTS.md/CLAUDE.md参照先検証)  ║
║                                                                      ║
║  Validators: 8+3+3  Error: HarnessError {code, severity, suggestion,║
║                              adr_ref, fix_example}                   ║
║  ※L0はFUSE利用可能時のみ。L1-L4はFUSE有無に関わらず常時稼働        ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Layer 5: CONFIGURATION                                              ║
║  ─────────────────────────────────────────────────────────────────── ║
║  phasegate.config.json (Single Source of Truth)                        ║
║  ├── project / layers / harnesses / paths / reporting    ← AIDLC    ║
║  ├── orchestration { mode, parallelization, modelProfile,            ║
║  │     contextStrategy, commitStrategy, workflow }       ← GSD統合  ║
║  └── session { stateFile, roadmapFile }                  ← GSD統合  ║
║                                                                      ║
║  .claude/settings.json   context-priority.json   Claude Code Hooks   ║
╠═══════════════════════════════════════════════════════════════════════╣
║  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
║  ░  FUSE HOOKS ENGINE — 横断基盤 (Cross-Cutting Infrastructure)   ░ ║
║  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
║  ─────────────────────────────────────────────────────────────────── ║
║  OS-level FUSE (FUSE-T macOS / libfuse Linux) による                ║
║  ファイルI/Oインターセプション。エージェント非依存。                  ║
║                                                                      ║
║  ┌─ Quality Harness (L0) ─────────────────────────────────────────┐  ║
║  │  PreWrite: レイヤー違反ファイルの書き込み物理阻止               │  ║
║  │  PreWrite: 設計文書なしの実装コード書き込み拒否                 │  ║
║  │  PostWrite: 即座にESLint/バリデータ自動実行                    │  ║
║  └────────────────────────────────────────────────────────────────┘  ║
║  ┌─ Orchestration ────────────────────────────────────────────────┐  ║
║  │  PreRead: context-priority.jsonに基づくコンテキスト優先度制御   │  ║
║  │  PreRead: 不要ファイルの読み込みフィルタリング                  │  ║
║  │  OnComplete: Fresh Context 200K バジェット管理                  │  ║
║  └────────────────────────────────────────────────────────────────┘  ║
║  ┌─ Design Methodology ──────────────────────────────────────────┐  ║
║  │  PreWrite: 2-Phase Execution承認マーカー検証                   │  ║
║  │  PreBash: Phase Gate強制（未承認設計での実装コマンド阻止）      │  ║
║  │  OnComplete: Cascade Update自動トリガー                        │  ║
║  └────────────────────────────────────────────────────────────────┘  ║
║                                                                      ║
║  Config: .harness-hooks.yml (宣言的フック定義)                       ║
║  Fallback: FUSE未使用時はClaude Code Hooks + L1-L4で同等ルール適用  ║
╚═══════════════════════════════════════════════════════════════════════╝

依存方向: Layer 1 → Layer 2 → Layer 3 → Layer 4 → Layer 5
          (上位は下位に依存、下位は上位を知らない)
FUSE Hooks Engine: 横断的にLayer 2-4を強化（レイヤーではなく基盤）
```

### 4.2 責務境界

```
┌─────────────────────────────────────────────────────────┐
│  GSD概念が担う領域 (HOW to execute efficiently)          │
│  ─────────────────────────────────────────────────────  │
│  ・Executorライフサイクル管理（生成/破棄）                │
│  ・Waveスケジューリング（依存性→グループ化→並列制御）    │
│  ・セッション管理（STATE.md / pause / resume）           │
│  ・モデルルーティング（quality/balanced/budget）          │
│  ・Git戦略（Atomic commit / ブランチ戦略）               │
│  ・リサーチ並列化（4並列リサーチャー）                    │
│  ・Quick Mode（ハーネス緩和ルール判定）                   │
│  ・スコープ変更管理（add/insert/remove phase）           │
└─────────────────────────────────────────────────────────┘
      ↕ 共有: phasegate.config.json, HarnessError, Hooks
┌─────────────────────────────────────────────────────────┐
│  AIDLCが担う領域 (WHAT to build & quality to enforce)    │
│  ─────────────────────────────────────────────────────  │
│  ・設計スキル群（33スキル）                               │
│  ・2-Phase Execution（計画→人間承認→実行）                │
│  ・Phase Gateルール（設計→実装の順序強制）                │
│  ・5層防御バリデーター群（L0-L4, 8+3検出器+FUSE）        │
│  ・DDD戦術パターン（Entity/VO/Aggregate/Hexagonal）      │
│  ・@unit/@layerメタデータ（コード⇔設計トレーサビリティ） │
│  ・ドキュメント管理（inception/product分離）              │
│  ・テスト品質基準（AAA/actual/single-act/no-domain-mock   │
│    E2E seed pattern/Page UI MSW/describe-it命名規約）     │
│  ・エラー形式（HarnessError統一: ADR参照+修正コード例付き）│
│  ・Cascade Update / Agent-Lesson System                   │
└─────────────────────────────────────────────────────────┘
      ↕ 横断基盤: .harness-hooks.yml
┌─────────────────────────────────────────────────────────┐
│  FUSE Hooks Engineが担う領域 (HOW to enforce physically) │
│  ─────────────────────────────────────────────────────  │
│  ・コンテキスト配分（PreRead優先度フィルタリング）        │
│  ・L0 Pre-write enforcement（書き込み前ルール検証）      │
│  ・2-Phase承認マーカー検証（設計承認の物理的強制）        │
│  ・Phase Gate物理強制（PreBash/PreWrite）                │
│  ・PostWrite自動検証トリガー                             │
│  ・Cascade Update自動トリガー（OnComplete）              │
│  ・Fresh Context バジェット管理                           │
│  ※FUSE非使用時: Claude Code Hooks + プロンプトで代替     │
└─────────────────────────────────────────────────────────┘
```

**原則**: GSDはAIDLCを迂回しない。AIDLCはGSDに依存しない。

---

## 5. 統合ワークフロー

```
/gsdlc:init-project
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 0: PROJECT FOUNDATION                             │
│  research-coordinator (4並列) → product-architect [2P]   │
│  → story-writer [2P] → story-mapper → unit-designer [2P]│
│  Output: docs/product/ 基盤文書群 + roadmap + state      │
└────────────────────────┬────────────────────────────────┘
                         │
  ┌──────────────────────▼──────────────────────┐
  │            FOR EACH UNIT IN ROADMAP          │
  └──────────────────────┬──────────────────────┘
                         │
     /gsdlc:design       │
     ────────────        ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 1: UNIT DESIGN  (2-Phase Execution厳守)           │
│  domain-designer → logical-designer → test-designers     │
│  → uiux-designer → test-coverage-checker                 │
│  Gate: implementation-readiness-checker                   │
│  Output: docs/product/construction/{unit}/ 設計文書群     │
└────────────────────────┬────────────────────────────────┘
                         │
     /gsdlc:plan         │
     ───────────         ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 2: IMPLEMENTATION PLANNING                        │
│  implementation-planner (依存性分析 → Wave分割)           │
│  Plan-Check Loop (max 3): planner → checker → retry      │
│  + Nyquist Validation (要件→テストマッピング完全性)      │
│  Output: Wave実行計画 + VALIDATION.md                     │
└────────────────────────┬────────────────────────────────┘
                         │
     /gsdlc:execute      │
     ──────────────      ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 3: WAVE EXECUTION                                 │
│                                                          │
│  PRE-FLIGHT: harness:check-ready (全story, Phase Gate)   │
│                                                          │
│  ═══ Wave 1 (並列) ═══════════════════════════════════   │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │ Executor A      │  │ Executor B      │               │
│  │ Fresh 200K ctx  │  │ Fresh 200K ctx  │               │
│  │ story-impl      │  │ story-impl      │               │
│  │ (US-001)        │  │ (US-002)        │               │
│  │ → Atomic commit │  │ → Atomic commit │               │
│  └─────────────────┘  └─────────────────┘               │
│  POST-WAVE: L2 harness validators                        │
│                                                          │
│  ═══ Wave 2 ═══════════════════════════════════════════  │
│  ┌─────────────────┐                                     │
│  │ Executor C      │  (US-001に依存)                     │
│  │ story-impl      │                                     │
│  │ (US-003)        │                                     │
│  └─────────────────┘                                     │
│  POST-WAVE: L2 harness validators                        │
└────────────────────────┬────────────────────────────────┘
                         │
     /gsdlc:verify       │
     ──────────────      ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 4: VERIFICATION & RECONCILIATION                  │
│  consistency-checker / drift-detector / Nyquist          │
│  test-coverage-checker (90%+)                            │
│  cascade-updater → product/ 設計文書累積更新             │
│  lesson-collector → AGENTS.md更新                        │
│  STATE.md / ROADMAP.md 進捗反映                          │
└────────────────────────┬────────────────────────────────┘
                         │
                    次Unit? ── Yes → PHASE 1
                         │ No
     /gsdlc:milestone    ▼
┌─────────────────────────────────────────────────────────┐
│  MILESTONE COMPLETION                                    │
│  audit → complete (タグ+アーカイブ) → new                │
└─────────────────────────────────────────────────────────┘


═══ Quick Mode分岐 (/gsdlc:quick) ══════════════════════
  適用: バグ修正, ドキュメント修正, テスト追加, 設定変更
  除外: 新機能追加, API契約変更, 新ドメインモデル
  維持: L1(Biome) + L2(Pre-commit) + Atomic commit
  緩和: Phase Gate, 2-Phase Execution
═════════════════════════════════════════════════════════
```

---

## 6. コマンド体系

### 6.1 メインコマンド（8個）

| コマンド | 説明 | 内部スキル |
|---------|------|-----------|
| `/gsdlc:init-project` | プロジェクト初期化（リサーチ→要件→設計基盤） | research-coordinator, product-architect, story-writer, unit-designer, story-mapper |
| `/gsdlc:design <unit>` | Unit設計（DDD設計スキル群を2-Phase Executionで実行） | domain-designer, logical-designer, test-designers, uiux-designer, readiness-checker |
| `/gsdlc:plan <unit>` | 実装計画（Wave分割+Plan-Checkループ+Nyquist検証） | implementation-planner, consistency-checker, nyquist-validator |
| `/gsdlc:execute <unit>` | Wave並列実行（Fresh contextで各story-implementorを並列起動） | wave-orchestrator, story-implementor(xN), harness validators |
| `/gsdlc:verify <unit>` | 検証・整合（設計-実装整合性チェック+カスケード更新） | consistency-checker, drift-detector, cascade-updater |
| `/gsdlc:quick <task>` | Quick Mode（ハーネス緩和版のad-hocタスク実行） | quick-implementor |
| `/gsdlc:progress` | 進捗表示（STATE.md/ROADMAP.mdの可視化） | session-manager |
| `/gsdlc:milestone <act>` | マイルストーン管理（audit/complete/new） | milestone-manager |

### 6.2 セッション・ユーティリティコマンド

| コマンド | 説明 |
|---------|------|
| `/gsdlc:pause` | 作業中断。STATE.mdに進捗・コンテキスト保存 |
| `/gsdlc:resume` | 作業再開。STATE.mdからコンテキスト復元 + 起動ルーチン実行 |
| `/gsdlc:map-codebase` | 既存コードベース分析（Brownfield対応） |
| `/gsdlc:settings` | phasegate.config.json設定変更 |

**起動ルーチン**（`/gsdlc:resume` 内部で自動実行）:
1. 作業ディレクトリ確認 + Git状態チェック
2. STATE.mdから前回の進捗・次タスクを復元
3. 疎通テスト（`pnpm test` サニティチェック）
4. 次アクション提案 → 人間承認 → 作業再開

### 6.3 ハーネスコマンド（既存継承+拡張）

```
harness:status, harness:init, harness:enable, harness:disable,
harness:check-phase, harness:check-ready, harness:ci-check,
harness:detect-drift, harness:collect-lessons, harness:detect-dead-code
```

---

## 7. スキルシステム v1（33スキル）

### 7.1 スキルマップ

| カテゴリ | 既存スキル | 新規スキル(v1) |
|---------|-----------|---------------|
| **Foundation** | product-architect, story-writer, unit-designer, story-mapper | — |
| **Design** | domain-designer, logical-designer, mock-designer, uiux-designer, environment-designer | — |
| **Test Engineering** | scenario-test-designer, it-test-designer, unit-test-designer, scenario-test-logic-designer, it-test-logic-designer, unit-test-logic-designer, test-coverage-checker | — |
| **Implementation** | story-implementor, implementation-planner, implementation-readiness-checker | **quick-implementor** |
| **Orchestration** | — | **wave-orchestrator**, **session-manager**, **research-coordinator** |
| **Verification** | consistency-checker, cascade-updater, codex-delegator | **codebase-mapper**, **milestone-manager**, **scope-manager**, **doc-freshness-checker**, **pointer-validator** |
| **Meta** | skill-creator, kimunii-perspective | — |

### 7.2 既存スキル強化

| スキル | 強化内容 |
|--------|---------|
| **story-implementor** | Fresh Context Protocol（200Kバジェット、優先度付きドキュメントロード）+ Atomic Git Commits（TDDサイクル単位の自動コミット） |
| **test-coverage-checker** | Nyquist Validation Layer（要件→テスト双方向トレーサビリティ + requirement-test-matrix.json生成） |
| **implementation-readiness-checker** | Plan-Checker Loop（最大3回の自動検証→修正ループ + Nyquist coverageRate検証） |

### 7.3 プリセット体系（v0継承）

段階的採用を支援する3プリセット。v1ではorchestrationセクションが追加される。

| プリセット | 用途 | 有効レイヤー | カバレッジ閾値 | 主要差分 |
|-----------|------|------------|-------------|---------|
| **minimal** | 学習・プロトタイプ | L1, L2 | — | phaseGateのみ |
| **standard** | 通常開発 | L1, L2, L3 | 90% | 全8バリデータ（L3まで） |
| **strict** | 本番・エンタープライズ | L1-L4 | 95% | 全11バリデータ + bundleSizeLimit 500KB + agentLessonCollection + deadCodeGC |

### 7.4 CI/CDテンプレート（v0継承）

| テンプレート | 用途 | トリガー |
|------------|------|---------|
| `aidlc-gate.yml` | PR検証ワークフロー（全バリデータ実行、失敗時PRコメント） | Pull Request |
| `consistency-check.yml` | 週次設計-実装整合性チェック（乖離検出時Issue自動作成） | Scheduled (weekly) |
| `.husky/pre-commit` | Pre-commitフックテンプレート | git commit |

### 7.5 Claude Code Hooks体系（v0継承 → v1拡張）

v0のHooks設定をベースラインとし、v1で拡張する。

| フック種別 | v0ベースライン | v1拡張 |
|-----------|-------------|-------|
| **PreToolUse** | `deny-check.sh`（危険コマンドブロック） | + リンター設定保護（.biome.json, tsconfig.json変更阻止） |
| **PostToolUse** | `format-typescript-hook.sh`（TypeScript整形）+ `analyze-errors-hook.sh`（エラー解析） | Biome高速フォーマット + PostWrite自動検証 |
| **Stop** | サウンド通知（`afplay`） | + テスト完了ゲート（全テストグリーン必須） |

### 7.6 ハーネス自身のテスト資産

v0で確立した143テスト（バリデータ・CLIコマンド・Biomeルール）を継承し、v1新機能分を追加する。ハーネスツールキット自身の品質もハーネスで保証する。

---

## 8. ポジショニング

### 競合フレームワークとの差別化

```
                品質保証の深さ
                ▲
                │
        Phasegate ■ │
                │         AIDLC v0 ●
                │
                │              BMAD ●
                │
                │    Speckit ●
                │
    GSD2.0 ●   │   Taskmaster ●
                │
                └──────────────────────► 実行効率・速度
```

**Phasegateのユニークポジション**: 「コードレベルのアーキテクチャ強制力を持つ、唯一のAI開発オーケストレーションフレームワーク」

| 比較対象 | 相手の強み | Phasegateとの違い |
|---------|-----------|-------------|
| **GSD2.0** | コンテキスト管理、Wave並列、セッション管理 | PhasegateはGSDの実行概念を品質ゲートの中に封じ込める |
| **BMAD** | ロールベースのエージェント設計 | Phasegateは「プロンプトで願う」のではなく「コードで強制する」 |
| **Speckit** | 仕様駆動開発、型安全な仕様管理 | Phasegateは仕様から実行・検証まで全ライフサイクルをカバー |
| **Taskmaster** | タスク分解と依存管理 | Phasegateはタスク管理の上位に設計方法論と品質ハーネスを持つ |

---

## 9. スコープと要件

### 9.1 v1 MVH（Minimum Viable Harness）スコープ

| 優先度 | 機能 | 根拠 |
|--------|------|------|
| **v1必須** | コンテキスト腐敗防止（context-priority.json + Fresh Context Protocol） | Critical Gap |
| **v1必須** | Nyquist検証層（要件→テスト双方向トレーサビリティ） | Critical Gap |
| **v1必須** | Quick Mode（ハーネス緩和版ad-hocタスク実行） | ユーザビリティ |
| **v1必須** | セッション継続性（pause/resume + STATE.md） | ワークフロー改善 |
| **v1必須** | ライフサイクル管理（milestone + ROADMAP.md + progress） | プロジェクト可視化 |
| **v1必須** | phasegate.config.json v2（orchestrationセクション統合） | 設定統一 |
| **v1必須** | ADR初期作成（10件以上） + archgateパターン | ベストプラクティス |
| **v1必須** | リンター設定保護Hook + Stop Hookテストゲート | ベストプラクティス |
| **v1必須** | HarnessErrorフォーマット拡充（ADR参照+修正コード例） | エージェント自己修正率向上 |
| **v1必須** | AGENTS.md改善（記述的情報削除→コマンド実行方式へ） | ポインタ型設計の徹底 |
| **v1必須** | 起動ルーチン標準化（/gsdlc:resume内蔵） | セッション復元の確実性 |
| **v1必須** | K1-K13非交渉要件の完全維持 | Core Value |
| **v1必須** | ESLint→Biome全面移行（v0 4ルール移植 + PostToolUse高速化 + L1再構築 + CI統合） | Biomeネイティブで構築（Q7決定） |
| **v1必須** | FUSE Hooks Engine基盤（.harness-hooks.yml + PreWrite/PostWrite + PreRead + PreBash + 完了ゲート） | 5層防御L0の実現（Q8決定） |
| **v1必須** | オーケストレーションコマンド定義（init-project/design/plan/execute/verify SKILL.md） | v1コアUX |
| **v1必須** | Go/No-Go Gate 8条件の回帰テスト整備 | リリース判定の絶対条件 |
| Phase 2 | Wave並列実行エンジン | 設計複雑度が高い |
| Phase 2 | Brownfield対応（codebase-mapper） | 新規PJ検証優先 |
| Phase 2 | AI生成コードアンチパターン検出（any乱用/重複/ゴースト/コメント洪水） | L1 Biome拡張 |
| Phase 2 | ドキュメント鮮度チェッカー（doc-freshness-checker） | L4バリデータ拡張 |
| Phase 2 | ポインタ腐敗検知バリデータ（pointer-validator） | L4バリデータ拡張 |
| Phase 2 | ハイブリッド運用戦略ガイダンス（Claude Code+Codex連携ドキュメント） | codex-delegator活用促進 |
| Phase 3 | 動的スコープ管理（scope-manager） | Nice-to-have |
| Phase 3 | モデルプロファイル（quality/balanced/budget自動選択） | Nice-to-have |
| Phase 3 | E2Eテスト戦略テンプレート（Playwright統合） | テンプレート |

### 9.2 Go/No-Go Gate（統合の絶対条件）

| # | 条件 | 根拠 |
|---|------|------|
| 1 | **npmパッケージ非依存**: GSD概念のみ自前実装 | 外部依存リスク回避 |
| 2 | **`.planning/` 不使用**: GSD由来アーティファクトは `docs/inception/` に配置 | folder_management_rules準拠 |
| 3 | **設定ファイル統一**: GSD設定は `phasegate.config.json` に統合 | Single Source of Truth |
| 4 | **yolo/skip-permissions 不採用**: deny listとhooksは不可侵 | セキュリティ境界 |
| 5 | **2-Phase Execution維持**: 設計スキルの人間承認ゲートは絶対維持 | AI安全性の最後の砦 |
| 6 | **プロジェクトローカル実行**: `~/.claude/` へのグローバルインストール不可 | 他PJへの影響回避 |
| 7 | **既存コマンド体系尊重**: `/gsd:*` コマンドは露出せずPhasegateスキル内部に統合 | UX一貫性 |
| 8 | **デフォルトOFF**: GSD由来機能は `phasegate.config.json` でデフォルト無効 | Progressive adoption |

---

## 10. 非交渉要件（v0からの不変契約）

以下はPhasegate v1においていかなる統合・最適化・簡素化の圧力にも屈してはならない要件である。

| # | 要件 | 根拠 |
|---|------|------|
| K1 | **5層防御モデル** (L0-L4, L0はFUSE利用時) | Phasegateの差別化要因そのもの |
| K2 | **Phase Gate** | 設計→実装の順序をコードレベルで強制 |
| K3 | **Biome AST解析**（v0 ESLintから移行） | importグラフ解析+循環依存検出。プロンプトでは代替不可能 |
| K3.5 | **@unit/@layerメタデータ** | 全ソースファイルのUnit・Layer帰属を強制。コード⇔設計トレーサビリティの基盤 |
| K4 | **テスト品質ルール** | AAA, actual命名, single-act, no-domain-mocking, E2E seed pattern, describe/it命名規約 |
| K5 | **DDD設計スキル群** | domain-designer等。設計方法論の核心 |
| K6 | **2-Phase Execution** | AI安全メカニズム。人間承認ゲート |
| K7 | **Document Split** (inception/product) | 一時的vs累積的の明確な分離 |
| K8 | **Cascade Updater** | 下位変更→上位設計への影響伝播 |
| K9 | **Agent-Lesson System** | 主流フレームワークに同等機能なし。独自の革新 |
| K10 | **Security/Performance検出** | ハードコード秘密、SQLインジェクション、ループ内await、N+1検出、bundleSizeLimit |
| K11 | **Drift Detection** | 設計にあるがコードにない / コードにあるが設計にない双方向検出 |
| K12 | **Consistency Checker** | 文書間レイヤー整合性チェック |
| K13 | **phasegate.config.json** | 単一設定ファイル。GSD設定もここに統合 |

---

## 11. リスク

| リスク | 深刻度 | 確率 | 軽減策 |
|--------|--------|------|--------|
| 哲学の衝突（GSD速度 vs AIDLC品質） | 高 | 中 | 品質ゲートを非交渉要件として確立。yolo/skip-permissions不採用 |
| 複雑度の爆発（33スキル + GSD実行エンジン） | 高 | 高 | 段階的統合（Phase 1はコア機能のみ）。Progressive Disclosure |
| K要件の意図しない破壊 | 高 | 中 | K要件チェックリスト必須。各機能追加時にK1-K13影響評価 |
| 設定ファイルの肥大化 | 中 | 中 | orchestrationセクション内に封じ込め。プリセットで簡素化 |
| 学習曲線の増大 | 中 | 高 | Quick Modeを入口に。段階的にフルハーネスへ移行 |

---

## 12. 統合で初めて可能になること

| # | 新機能 | 説明 |
|---|--------|------|
| 1 | **自律的設計→実装パイプライン** | フル設計ライフサイクルがオーケストレーションで自動進行。人間ゲートは2-phase承認ポイントのみ |
| 2 | **並列マルチUnit開発** | @unit分離 + dependency validatorで安全に並列実装 |
| 3 | **コスト最適化品質保証** | モデルルーティング: 設計=Opus、実装=Sonnet、検証=Haiku |
| 4 | **自己修復ハーネス** | lesson-collector → cascade-updater → ハーネスルール改善の自動フィードバックループ |
| 5 | **段階的Brownfield採用** | map-codebase → L1のみ → L2追加 → L3 → L4（週単位で段階的に） |
| 6 | **完全な要件→テストトレーサビリティ** | Nyquist over AIDLC: user_stories → unit → domain_model → logical_design → test_design → code(@story) |
| 7 | **エラー自己修正ループ** | GSD retry + AIDLCのagent_instruction → 次回試行コンテキストに自動注入 |
| 8 | **エージェント非依存の決定論的ガバナンス** | FUSE Hooks EngineによるOS-levelファイルI/Oインターセプション。Claude Code, Codex, 任意のAIエージェントに対して同一ルールを物理的に強制 |

---

## 13. FUSE Hooks Engine — Fallback設計

FUSE Hooks Engineはオプショナルな横断基盤である。FUSE利用不可能な環境でもPhasegateの全機能は動作する。

| 機能 | FUSE利用時（決定論的） | FUSE未使用時（プロンプト+既存ツール） |
|------|----------------------|--------------------------------------|
| **L0 Pre-write enforcement** | ファイルシステムレベルで書き込み物理阻止 | L1 ESLint + L2 Pre-commitで検出・報告 |
| **コンテキスト優先度制御** | PreReadフィルタで不要ファイル読み込み阻止 | context-priority.json + プロンプト指示 |
| **2-Phase承認検証** | 承認マーカーなしの実装書き込みを物理拒否 | Phase Gate Pre-commitバリデータで検出 |
| **Phase Gate強制** | PreBashで未承認コマンド実行を阻止 | Pre-commitフックで検出 |
| **PostWrite自動検証** | ファイル書き込み直後にバリデータ自動起動 | Claude Code PostToolUse Hookで代替 |
| **Cascade Update** | OnCompleteで自動トリガー | 手動実行 or Claude Code Hooks |
| **Fresh Context管理** | OnCompleteでバジェット監視・警告 | プロンプト指示 + セッション管理 |

**設計原則**: 同じルールがFUSE有無に関わらず適用される。FUSEは「強制力の物理レベル」を上げるだけであり、ルール自体を変えない。FUSE未使用時でもL1-L4の既存防御でCore Valueは維持される。

---

## 14. 実装ロードマップ

### Phase 1: Core Integration（v1 MVH）

- コンテキスト腐敗防止（context-priority.json + Fresh Context Protocol）
- Nyquist検証層（requirement-test-matrix.json + test-coverage-checker拡張）
- Quick Mode（quick-implementor + ハーネス緩和ルール）
- セッション管理（session-manager + STATE.md + pause/resume + 起動ルーチン）
- ライフサイクル管理（milestone-manager + ROADMAP.md + progress）
- phasegate.config.json v2（orchestrationセクション）
- ADR初期作成（10件）+ リンター設定保護Hook + Stop Hookテストゲート
- HarnessErrorフォーマット拡充（ADR参照 + 修正コード例を全バリデータに統一）
- AGENTS.md改善（バリデータ一覧→`harness:status`実行方式、ADR参照リンク追加）

### Phase 2: Enhanced Execution + FUSE Hooks Engine

- Wave並列実行エンジン（wave-orchestrator + 依存性分析）
- **FUSE Hooks Engine基盤**（FUSE-T/libfuse + .harness-hooks.yml）
- **L0 Pre-write enforcement**（レイヤー違反・Phase Gate物理阻止）
- **PreRead コンテキスト優先度フィルタリング**
- Brownfield対応（codebase-mapper + harness:scan）
- ESLint→Biome全面移行（v0 4ルール移植 + フォーマット統一 + PostToolUse高速化）
- Atomic Git Commits（story-implementor強化）
- Research Coordinator（4並列リサーチャー）
- AI生成コードアンチパターン検出（L1 ESLint拡張: any乱用/jscpd重複/ゴーストファイル/コメント洪水）
- doc-freshness-checker（L4: ドキュメント最終更新日ベースの鮮度検証・警告）
- pointer-validator（L4: AGENTS.md/CLAUDE.md内ファイルパス参照の存在チェック）
- ハイブリッド運用戦略ガイダンス（Claude Code計画→Codex並列実行→Claude Codeレビュー）

### Phase 3: Refinement

- **FUSE 2-Phase承認マーカー検証**
- **FUSE Fresh Context バジェット管理**
- 動的スコープ管理（scope-manager）
- モデルプロファイル自動選択
- E2Eテスト戦略テンプレート（Playwright統合）
- Context Monitor Hook
- archgateパターン完全実装

---

## 15. ドキュメント配置ルール（v1拡張）

v0の`folder_management_rules.md`を継承し、GSD由来アーティファクトの配置を追加する。

| アーティファクト | 配置先 | 備考 |
|----------------|--------|------|
| STATE.md | `docs/inception/_shared/state.md` | セッション状態（内部はJSON構造化セクションを含む） |
| ROADMAP.md | `docs/inception/_shared/roadmap.md` | 進捗追跡（タスク定義部はJSON形式で機械的更新を保証） |
| RESEARCH | `docs/inception/{unit}/research.md` | リサーチ結果 |
| VALIDATION.md | `docs/inception/{unit}/{US}/validation.md` | Nyquist検証結果 |
| requirement-test-matrix.json | `docs/product/construction/{unit}/` | 要件→テストマッピング |
| context-priority.json | `.harness/context-priority.json` | コンテキスト優先度 |
| execution-waves.json | `docs/inception/{unit}/execution-waves.json` | Wave実行計画 |
| milestones.json | `docs/inception/_shared/milestones.json` | マイルストーン定義 |
| .harness-hooks.yml | プロジェクトルート | FUSE Hooks Engine宣言的設定 |

**原則**: `.planning/` ディレクトリは使用しない。全てのアーティファクトは `docs/` 配下に統一する。

---

## 16. Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| GSD npmパッケージ非依存 | 外部依存リスク回避、自己完結性の維持 | — Pending |
| Phasegate命名（Governed SDLC） | GSD精神 + AIDLC品質哲学のダブルミーニング | — Pending |
| Wave並列をPhase 2に延期 | 設計複雑度が高く、v1 MVHではコンテキスト管理を優先 | — Pending |
| yolo/skip-permissions不採用 | AIDLC安全哲学との根本的対立 | — Pending |
| `.planning/`不使用 | folder_management_rules.mdとの二重化防止 | — Pending |
| GSD由来機能デフォルトOFF | Progressive adoptionを実現 | — Pending |
| FUSE Hooks Engineは横断基盤（レイヤーではない） | レイヤーにするとL1-L4との責務重複。横断基盤としてL2-L4を物理的に強化する設計が最適 | — Pending |
| FUSE利用はオプショナル | FUSE未使用時もL1-L4で同等ルール適用。強制力レベルのみ異なる | — Pending |
| Context EngineをLayer 2から除去 | GSD2.0のコンテキスト管理はプロンプトベース（決定論的ではない）。FUSE PreReadで決定論的に代替 | — Pending |
| Lefthook不採用 | FUSE Hooks Engineがエージェント非依存の物理的強制を実現するため、Lefthookは上位互換として不要 | — Pending |
| 記述的ドキュメント腐敗対策 | Document Split（inception/product）で分離しつつ、doc-freshness-checkerで鮮度を機械的に検証。タイムスタンプ+ステータス（Active/Deprecated）を全設計文書に付与 | — Pending |
| 進捗記録のJSON構造化 | STATE.md/ROADMAP.md内のタスク定義部はJSON形式を採用。AIによる不適切編集リスクをMarkdown比で低減 | — Pending |
| ESLint→Biome全面移行 | Rust製でESLintより50-100倍高速。PostToolUse Hookの速度ボトルネック解消。v0の4カスタムルール（require-unit-comment, require-layer-comment, no-layer-violation, enforce-folder-structure）をBiomeプラグインとして移植 | — Decided |

---

*Last updated: 2026-03-10 — v0既存機能の完全反映（@unit/@layerメタデータ、Biome移行、プリセット体系、CI/CDテンプレート、Hooks体系、テスト資産、バリデータレイヤー配置修正、テスト品質ルール層別詳細、K3.5追加、スキル数修正）*
