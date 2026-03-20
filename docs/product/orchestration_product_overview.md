# GSDLC Orchestration Engine — Product Overview

> **Version**: v1.0 (Draft)
> **作成日**: 2026-03-11
> **パッケージ**: Orchestration Engine（品質ハーネスとは分離）
> **ステータス**: Inception — 設計確定待ち

---

## 1. プロダクト定義

### 1.1 What This Is

**GSDLC Orchestration Engineは、品質ハーネスの検査力を前提に、AIエージェントによる設計→実装→検証の全ライフサイクルを自律的かつ安全にオーケストレーションするエンジンである。** Wave並列実行、セッション管理、コンテキストエンジニアリング、コスト管理を統合し、「人間が承認し、機械が自律実行する」開発サイクルを駆動する。

品質の検証・強制は品質ハーネスパッケージに完全委譲する。本パッケージは「いつ・何を・どの順序で・どのモデルで実行するか」を制御する実行エンジンである。

### 1.2 Core Value

> **「品質ゲートの間を、最大速度で安全に駆け抜けること」**

品質ハーネスが「何を守るか」を定義し、オーケストレーションエンジンが「どう速く正しく実行するか」を制御する。品質の判断は一切行わない — ハーネスの検証結果を受け取り、それに基づいて実行を制御するだけである。

### 1.3 対象ユーザー

AIエージェント（Claude Code, Codex等）を活用してプロダクション品質のソフトウェアを構築するエンジニアリングチーム。特に以下のニーズを持つチーム:

- 複数ユーザーストーリーの並列実装で開発速度を最大化したい
- セッション中断・再開を安全に行いたい（コンテキスト喪失の回避）
- AIエージェントのトークンコストを可視化・制御したい
- 設計→実装→検証のライフサイクル全体を自動化したい

---

## 2. GSD-2との関係

### 2.1 参考にした概念

本パッケージの設計はGSD-2（Get Shit Done v2）の設計思想を大いに参考にしている。GSD-2はPi SDKベースのスタンドアロンCLIであり、AIエージェントセッションをプログラマティックに制御する先駆的な実装である。

以下の概念をGSD-2から学び、GSDLCの文脈に再設計して取り込む:

| # | GSD-2の概念 | GSDLCでの再設計 |
|---|------------|---------------|
| 1 | **成果物駆動の状態導出** — `deriveState()`がmilestoneディレクトリ配下のROADMAP/PLAN/SUMMARYファイルをスキャンして状態を純粋導出し、`.gsd/STATE.md`は導出結果のキャッシュとして書き出すパターン（`state.ts`） | `docs/inception/_shared/state.md`をキャッシュとし、`docs/`配下の成果物からphaseを導出。GSD-2の`deriveState()`を設計リファレンスとする |
| 2 | **Milestone → Slice → Task 3層階層** — 1 Taskが1コンテキストウィンドウに収まる鉄則 | Unit → UserStory → Wave構造に再マッピング。Waveは依存性分析による自動グルーピング |
| 3 | **クラッシュ回復** — Lock file + activity log + session forensics | Lock file + JSONLセッションログによるフォレンジック回復 |
| 4 | **Adaptive Replanning** — Slice完了後のロードマップ再評価 | Unit完了後の再評価。ただし設計変更は2-Phase承認ゲート必須（GSD-2にはこの制約なし） |
| 5 | **Fresh Context + Pre-inlined Dispatch** — 各Taskに新鮮な200Kコンテキストを割り当て、タスクプラン、先行タスクのサマリー、依存サマリー、ロードマップ抜粋、決定事項レジスターをdispatchプロンプトにインライン注入 | `context-priority.json`による優先度制御 + Fresh Context Protocol。GSDLCでは設計文書のインライン注入に再設計（GSD-2のタスクプラン中心のinliningとは対象が異なる） |
| 6 | **3段階タイムアウト** — Soft（警告）/ Idle（ストール検出）/ Hard（強制停止） | 同一パターンを採用。設定は`orchestration.config.json`に定義 |
| 7 | **Per-unit token/cost ledger** — Phase/Slice/Model別のトークン使用量・コスト追跡 | 同一パターン。コスト台帳はセッション管理に統合 |
| 8 | **Git branch-per-slice / atomic commit** — Slice単位ブランチ + squash merge | Unit/US単位のブランチ戦略 + TDDサイクル単位のatomic commit |

### 2.2 GSD-2との違い

| 観点 | GSD-2 | GSDLCオーケストレーター |
|------|-------|----------------------|
| **品質ガバナンス** | must-haves（Truths/Artifacts/Key Links）による軽量な機械的検証のみ。コードレベルのアーキテクチャ強制力はない | 品質ハーネスとの連携が前提。Pre-flight gate, Post-wave検証 |
| **ランタイム** | Pi SDK（スタンドアロンCLI） | Claude Code / Codex前提（エージェント内蔵スキル） |
| **成果物配置** | `.gsd/`ディレクトリ | `docs/`統一原則（`folder_management_rules.md`準拠） |
| **設計承認** | なし（自律実行のみ） | 2-Phase Execution（設計は人間承認必須） |
| **設定** | `~/.gsd/preferences.md` | `harness.config.json`（品質）+ `orchestration.config.json`（実行制御）に分離 |
| **品質検証** | must-haves（機械的チェック） | L1-L4バリデータ群による多層防御（品質ハーネスに委譲） |

### 2.3 なぜ自前実装か

GSD-2のnpmパッケージ（`gsd-pi`）には依存しない。理由:

1. **ランタイム非互換**: GSD-2はPi SDK前提。GSDLCはClaude Code/Codexのスキルシステム上で動作する
2. **品質ゲート統合**: GSD-2には品質ガバナンスの概念がなく、Wave実行とハーネス検証の連携を外付けで実現する設計は脆弱
3. **成果物配置の哲学**: `.gsd/`と`docs/`の二重管理は`folder_management_rules.md`に違反
4. **自己完結性**: 外部パッケージのバージョンアップに追従するリスクを回避

ただし、将来的にGSD-2自体が品質ゲート連携APIを提供した場合や、Pi SDKがClaude Code統合を実現した場合には、GSD-2をオーケストレーターとして採用する選択肢を排除しない。その判断基準はGo/No-Go Gate 8条件の充足である。

### 2.4 スキル帰属

以下のスキルはオーケストレーションパッケージに帰属する（品質ハーネス側のスキルとは分離）。

| スキル | 責務 |
|--------|------|
| **wave-orchestrator** | Wave並列実行エンジン。依存性分析・Wave分割・並列制御 |
| **session-manager** | セッションライフサイクル管理。pause/resume/クラッシュ回復 |
| **research-coordinator** | リサーチ並列化。4並列リサーチャーの統合管理 |
| **scope-manager** | 動的スコープ管理。フェーズのadd/insert/remove |

> **注記**: `quick-implementor`はQuality Harnessパッケージ所属（Quick Modeの品質ポリシー定義を含むため）。オーケストレーションの`/gsdlc:quick`コマンドはこのスキルの実行をトリガーするが、スキル自体はハーネスが管理する。

### 2.5 設定ファイル分離

品質設定とオーケストレーション設定は別ファイルに完全分離する。

| 設定ファイル | Owner | 内容 |
|------------|-------|------|
| `harness.config.json` | Quality Harness | L1-L4バリデータ設定、プリセット、Quick Mode条件、パス定義 |
| `orchestration.config.json` | Orchestration Engine | autoSupervisor（タイムアウト）、modelProfile、budgetCeiling、session設定、Wave並列設定 |

ownershipは完全に分離される。オーケストレーションはharness.config.jsonのプリセット値を**読み取る**が、**書き込まない**。ハーネスはorchestration.config.jsonに一切関与しない。

---

## 3. 設計哲学

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

品質ゲートの定義・実行は品質ハーネスの責務。オーケストレーターはゲートの呼び出しタイミングと結果に基づく制御フローを担う。

### 原則 2: Human Gate, Machine Execute（設計は人間承認、実行は機械自律）

> 2-Phase Executionの承認ポイントを尊重し、承認済み設計に基づいて自律実行する。

オーケストレーターは2-Phase Executionのプロトコルを理解し、承認マーカーが存在しない設計に基づく実行をディスパッチしない。承認プロトコル自体の実装は品質ハーネス側に存在する。

### 原則 3: Fresh Context = Quality（コンテキストの鮮度は品質である）

> 腐ったコンテキストで書かれたコードは、腐ったコードである。

GSD-2の`state.ts`が証明したパターン: 各executorに新鮮なコンテキストウィンドウを割り当て、必要な設計文書を毎回ロードする。オーケストレーターはコンテキストの15%のみ使用し、残りをexecutorに配分する。

### 原則 4: Artifact-Driven State（成果物駆動の状態管理）

> state.jsonは導出キャッシュであり、ディスク上の成果物が唯一の真実である。

GSD-2の`deriveState()`パターンに倣い、`docs/`配下の成果物（設計文書、テスト結果、コミット履歴）からプロジェクトの現在フェーズを純粋に導出する。

- **機械的真実**: `state.json`（JSON形式）— deriveState()の出力キャッシュ。プログラムが読み書きする。いつ削除しても再導出可能
- **人間向け表示**: `state.md`（Markdown形式）— state.jsonから生成される可読ビュー。人間が進捗を確認する用途

セッション固有の状態（中断位置、作業メモ等）は`.harness/session-state.json`に分離し、プロジェクト状態とは独立に管理する。

### 原則 5: Crash-Resilient Execution（クラッシュ耐性のある実行）

> セッションはいつ死んでも復元可能でなければならない。

GSD-2が確立したパターン — Lock file + activity log + session forensics — を採用する。セッション中断時には、最後のディスク書き込みまでの作業を復元し、次のアクションを診断的に提案する。

---

## 4. アーキテクチャ

### 4.1 状態機械

オーケストレーションエンジンの中核は、GSD-2の`deriveState()`に着想を得た成果物駆動の状態機械である。

```
┌──────────────────────────────────────────────────────────────┐
│  STATE MACHINE — Phase Derivation from Artifacts             │
│                                                              │
│  pre-planning                                                │
│      │ docs/product/ 基盤文書が存在しない                      │
│      ▼                                                       │
│  researching                                                 │
│      │ リサーチ実行中（research-coordinator）                  │
│      │ docs/inception/{unit}/research.md が完成               │
│      ▼                                                       │
│  designing                                                   │
│      │ docs/product/construction/{unit}/ 設計文書群が完成       │
│      │ + readiness-checker PASS                              │
│      ▼                                                       │
│  planning                                                    │
│      │ execution-waves.json が生成される                       │
│      ▼                                                       │
│  executing                                                   │
│      │ Wave単位で並列実行 → Post-wave検証                     │
│      │ 全Wave完了                                             │
│      ▼                                                       │
│  verifying                                                   │
│      │ consistency-checker + drift-detector PASS               │
│      ▼                                                       │
│  completing-unit                                              │
│      │ cascade-updater + state.json/roadmap.json更新           │
│      ▼                                                       │
│  advancing                                                   │
│      │ Adaptive Replanning → 次Unit選択                       │
│      └─→ designing (次Unit) or completing-milestone           │
│                                                              │
│  特殊状態:                                                    │
│  paused     — /gsdlc:pause で中断                            │
│  blocked    — 依存未解決 or ハーネス検証失敗                    │
│  replanning — Unit完了後のロードマップ再評価中                  │
└──────────────────────────────────────────────────────────────┘
```

> **注記**: GSD-2の`discussing`フェーズはGSDLCでは独立フェーズとしない。`/gsdlc:init-project`の内部処理（要件定義・スコープ合意）として統合される。

state.json（`docs/inception/_shared/state.json`）はこの状態機械の出力キャッシュであり、`docs/`配下の成果物から常に再導出可能である。GSD-2の`deriveState()`がマイルストーンディレクトリをスキャンしてROADMAP→PLAN→SUMMARYの存在からphaseを導出するのと同じパターンを、GSDLCの`docs/`構造に適用する。state.md（人間向けMarkdownビュー）はstate.jsonから生成される。

### 4.2 Wave実行エンジン

```
┌─────────────────────────────────────────────────────────────┐
│  WAVE EXECUTION ENGINE                                       │
│                                                              │
│  Input: UserStory群 + 依存性グラフ                            │
│                                                              │
│  Step 1: 依存性分析                                          │
│    US-001 ──→ (なし)                                         │
│    US-002 ──→ (なし)                                         │
│    US-003 ──→ US-001                                         │
│    US-004 ──→ US-001, US-002                                 │
│                                                              │
│  Step 2: Wave分割                                            │
│    Wave 1: [US-001, US-002]  ← 依存なし、並列実行可能         │
│    Wave 2: [US-003]          ← US-001完了待ち                 │
│    Wave 3: [US-004]          ← US-001, US-002完了待ち         │
│                                                              │
│  Step 3: 並列制御                                            │
│    ┌─── Wave 1 ───────────────────────────────────────┐      │
│    │ PRE-FLIGHT: harness:check-ready (全story)        │      │
│    │                                                   │      │
│    │ ┌─────────────────┐  ┌─────────────────┐         │      │
│    │ │ Executor A      │  │ Executor B      │         │      │
│    │ │ Fresh 200K ctx  │  │ Fresh 200K ctx  │         │      │
│    │ │ US-001          │  │ US-002          │         │      │
│    │ │ → Atomic commit │  │ → Atomic commit │         │      │
│    │ └─────────────────┘  └─────────────────┘         │      │
│    │                                                   │      │
│    │ POST-WAVE: L2 harness validators                  │      │
│    │ (品質検証はハーネスに委譲)                          │      │
│    └───────────────────────────────────────────────────┘      │
│                         │                                     │
│                    検証 PASS                                  │
│                         ▼                                     │
│    ┌─── Wave 2 ─────────────────────────────────────┐        │
│    │  ...                                            │        │
│    └─────────────────────────────────────────────────┘        │
│                                                              │
│  Output: execution-waves.json に実行記録を永続化              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 セッション管理

```
┌─────────────────────────────────────────────────────────────┐
│  SESSION MANAGEMENT                                          │
│                                                              │
│  ┌─ state.json (機械的キャッシュ) ──────────────────────┐     │
│  │  { "activeMilestone": "M001",                        │     │
│  │    "activeUnit": "Unit-AUTH",                         │     │
│  │    "activeWave": "Wave-2",                            │     │
│  │    "phase": "executing",                              │     │
│  │    "nextAction": "Execute US-003 in Wave 2",          │     │
│  │    "progress": { "units": {done:2,total:5} } }        │     │
│  └──────────────────────────────────────────────────────┘     │
│  → state.md (人間向けビュー) は state.json から生成            │
│                                                              │
│  ┌─ roadmap.json ──────────────────────────────────────┐     │
│  │  Unit-AUTH  [████████████████████] 100%               │     │
│  │  Unit-PAYMENT [████████░░░░░░░░░░] 40%                │     │
│  │  Unit-NOTIFY  [░░░░░░░░░░░░░░░░░░] 0% (blocked)      │     │
│  └──────────────────────────────────────────────────────┘     │
│  → roadmap.md (人間向けビュー) は roadmap.json から生成        │
│                                                              │
│  ┌─ Session Lifecycle ─────────────────────────────────┐     │
│  │  /gsdlc:pause  → state.json + session-state.json保存 + Lock解放 │
│  │  /gsdlc:resume → state.json + session-state.json読込 + 起動ルーチン │
│  │  crash         → Lock検出 + JSONL forensics + 回復    │     │
│  └──────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 コンテキスト管理

```
┌─────────────────────────────────────────────────────────────┐
│  CONTEXT MANAGEMENT                                          │
│                                                              │
│  context-priority.json                                       │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  priority 1 (必須): 対象USの設計文書                   │    │
│  │  priority 2 (必須): ドメインモデル定義                  │    │
│  │  priority 3 (推奨): 関連USの設計文書                   │    │
│  │  priority 4 (参考): アーキテクチャ概要                  │    │
│  │  exclude: テスト結果, 過去セッションログ                │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  Fresh Context Protocol                                      │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Orchestrator budget: 15% (30K tokens)                │    │
│  │  Executor budget:     85% (170K tokens)               │    │
│  │                                                       │    │
│  │  Pre-inlined Dispatch:                                │    │
│  │  設計文書をexecutorのプロンプトに事前インライン注入      │    │
│  │  → tool callによるファイル読み込みオーバーヘッドを排除   │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 品質ハーネスとの連携

### 5.1 依存関係

**オーケストレーションエンジンは品質ハーネスに依存する。逆方向の依存はない。**

```
┌─────────────────────────┐      ┌─────────────────────────┐
│  Orchestration Engine    │ ───→ │  Quality Harness         │
│  (本パッケージ)           │      │  (品質ハーネスパッケージ)  │
│                          │      │                          │
│  Wave実行                │      │  L1-L4バリデータ         │
│  セッション管理           │      │  Phase Gate              │
│  コンテキスト管理         │      │  2-Phase Execution       │
│  コスト管理              │      │  DDD設計スキル群          │
│  Git戦略                 │      │  @unit/@layerメタデータ   │
│  モデルルーティング       │      │  HarnessError定義        │
│  Auto Mode              │      │  Drift Detection         │
│  Adaptive Replanning    │      │  Cascade Updater         │
└─────────────────────────┘      └─────────────────────────┘
```

### 5.2 接点の設計

オーケストレーターと品質ハーネスの連携は、ファイルシステムとコマンド実行を介して行う。直接的なAPI結合は行わない。

| タイミング | オーケストレーターのアクション | ハーネスの役割 |
|-----------|---------------------------|-------------|
| **Pre-flight** | `harness:check-ready`を呼び出し | Phase Gateチェック、設計文書存在確認 |
| **Post-wave** | L2バリデータ群を呼び出し | Pre-commitレベルの品質検証 |
| **Git commit** | Atomic commitを実行 | git pre-commit hookでL2検証自動実行 |
| **Post-unit** | `harness:detect-drift`を呼び出し | 設計-実装乖離検出 |
| **Verification** | `/gsdlc:verify`で検証フェーズをディスパッチ | consistency-checker, drift-detector実行 |
| **Adaptive Replanning** | 設計変更が必要な場合、2-Phase承認を要求 | 承認マーカーの管理、Phase Gate強制 |

### 5.3 品質ゲート失敗時の制御フロー

```
Executor完了 → Post-wave検証呼び出し
                    │
              ┌─────┴─────┐
              │           │
           PASS        FAIL
              │           │
         次Wave      ┌────┴────┐
         へ進行      │         │
                  自動修正   人間介入
                  可能       必要
                  │         │
                  retry     paused状態
                  (max 3)   + 診断レポート
```

品質検証の実行ロジックは一切オーケストレーターに含まない。ハーネスが返す結果（PASS/FAIL + HarnessError）に基づいて制御フローを決定するだけである。

---

## 6. コマンド体系

### 6.1 オーケストレーションコマンド

| コマンド | 説明 | 品質ハーネスとの連携 |
|---------|------|-------------------|
| `/gsdlc:init-project` | プロジェクト初期化（リサーチ→要件→設計基盤→ロードマップ） | — |
| `/gsdlc:design <unit>` | Unit設計（DDD設計スキル群のディスパッチ） | 2-Phase Execution承認を待機 |
| `/gsdlc:plan <unit>` | 実装計画（依存性分析→Wave分割） | Nyquist Validation呼び出し |
| `/gsdlc:execute <unit>` | Wave並列実行 | Pre-flight + Post-wave検証呼び出し |
| `/gsdlc:verify <unit>` | 検証・整合フェーズのディスパッチ | consistency-checker, drift-detector呼び出し |

### 6.2 セッション管理コマンド

| コマンド | 説明 |
|---------|------|
| `/gsdlc:pause` | 作業中断。state.json + session-state.jsonに進捗保存。Lock解放 |
| `/gsdlc:resume` | 作業再開。state.json + session-state.json読込 + 起動ルーチン（Git状態確認→疎通テスト→次アクション提案→人間承認→再開） |
| `/gsdlc:progress` | 進捗表示（state.json/roadmap.jsonの可視化、コスト情報含む） |

### 6.3 ライフサイクル管理コマンド

| コマンド | 説明 |
|---------|------|
| `/gsdlc:milestone audit` | マイルストーン完了前の監査 |
| `/gsdlc:milestone complete` | マイルストーン完了（タグ + アーカイブ） |
| `/gsdlc:milestone new` | 新規マイルストーン作成 |

### 6.4 ユーティリティコマンド

| コマンド | 説明 |
|---------|------|
| `/gsdlc:quick <task>` | Quick Mode実行（品質ハーネスのQuick Modeルールに従う） |
| `/gsdlc:map-codebase` | Brownfield対応（既存コードベース分析） |
| `/gsdlc:settings` | 設定変更 |

### 6.5 スコープ管理コマンド

| コマンド | 説明 |
|---------|------|
| `/gsdlc:scope add <phase>` | フェーズを追加 |
| `/gsdlc:scope insert <phase> --after <target>` | 指定位置にフェーズを挿入 |
| `/gsdlc:scope remove <phase>` | フェーズを削除 |

---

## 7. セッション管理・クラッシュ回復

### 7.1 セッションライフサイクル

```
新規セッション開始
    │
    ▼
┌──────────────────────────────────────────────────┐
│  ACTIVE SESSION                                    │
│                                                    │
│  Lock file: docs/inception/_shared/.session.lock   │
│  Activity log: JSONL形式で全アクションを記録         │
│                                                    │
│  ┌─ 正常フロー ──────────────────────┐             │
│  │  /gsdlc:pause → STATE.md保存       │             │
│  │               → Lock解放           │             │
│  │               → paused状態         │             │
│  │                                    │             │
│  │  /gsdlc:resume → Lock取得          │             │
│  │                → STATE.md読込      │             │
│  │                → 起動ルーチン実行   │             │
│  │                → active状態        │             │
│  └────────────────────────────────────┘             │
│                                                    │
│  ┌─ クラッシュフロー ────────────────┐             │
│  │  セッション異常終了                 │             │
│  │  → Lock file残存                   │             │
│  │  → 次回起動時にLock検出             │             │
│  │  → JSONLログからフォレンジック復元   │             │
│  │  → 回復ブリーフィング生成           │             │
│  │  → 最後の安全な状態から再開          │             │
│  └────────────────────────────────────┘             │
└──────────────────────────────────────────────────┘
```

### 7.2 クラッシュ回復の仕組み

GSD-2の`crash-recovery.ts` + `session-forensics.ts`パターンに倣う:

1. **Lock file**: セッション開始時に`.session.lock`を作成。正常終了時に削除。残存していればクラッシュと判定
2. **Activity log**: 全ディスパッチ・完了・エラーをJSONL形式で記録。クラッシュ後のフォレンジック分析に使用
3. **回復ブリーフィング**: クラッシュ前の最後のアクション、ディスクに書き込まれた成果物、未完了タスクを要約し、次のセッションのコンテキストに注入

### 7.3 スタック検出

GSD-2の「同一unitが2回ディスパッチされたらスタック」パターンを採用:

1. 同一Unit/USが再ディスパッチされたことを検出
2. 1回目: 詳細診断付きでリトライ（期待される成果物、現在のディスク状態を分析）
3. 2回目: Auto Modeを停止し、人間に介入を要求。具体的に何が足りないかを診断レポートとして出力

### 7.4 3段階タイムアウト

| タイムアウト | デフォルト | 動作 |
|------------|-----------|------|
| **Soft** | 20分 | executorに「まとめに入れ」と警告 |
| **Idle** | 10分 | tool call無しの無反応を検出。回復操縦を試行 |
| **Hard** | 30分 | Auto Modeを一時停止。耐久的な出力を保存してから停止 |

設定は`orchestration.config.json`の`autoSupervisor`セクションで制御。

---

## 8. コスト管理

### 8.1 Per-unit Token/Cost Ledger

GSD-2の`metrics.ts`パターンに倣い、全ディスパッチ単位でトークン使用量とコストを記録する。

```
┌─────────────────────────────────────────────────────────────┐
│  COST LEDGER                                                 │
│                                                              │
│  Unit: AUTH                                                  │
│  ├─ Design phase:     12,000 tokens  ($0.18)                 │
│  ├─ Planning phase:    8,000 tokens  ($0.12)                 │
│  ├─ Wave 1:                                                  │
│  │  ├─ US-001:        45,000 tokens  ($0.67)                 │
│  │  └─ US-002:        38,000 tokens  ($0.57)                 │
│  ├─ Wave 2:                                                  │
│  │  └─ US-003:        52,000 tokens  ($0.78)                 │
│  └─ Verification:      5,000 tokens  ($0.08)                 │
│  Total:              160,000 tokens  ($2.40)                  │
│                                                              │
│  Project Total:      480,000 tokens  ($7.20)                 │
│  Budget Ceiling:     $50.00                                  │
│  Remaining:          $42.80                                  │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 モデルルーティング

| プロファイル | 設計フェーズ | 実装フェーズ | 検証フェーズ | リサーチ |
|------------|------------|------------|------------|---------|
| **quality** | Opus | Opus | Sonnet | Sonnet |
| **balanced** | Opus | Sonnet | Sonnet | Sonnet |
| **budget** | Sonnet | Sonnet | Haiku | Haiku |

`orchestration.config.json`の`modelProfile`で選択。各phaseでのモデル割り当てはオーバーライド可能。

### 8.3 予算制御

- `budget_ceiling`: 総コストがこの値に達するとAuto Modeを一時停止
- `/gsdlc:progress`で現在のコスト状況を表示
- Unit単位のコスト予測（完了Unitの平均コストから算出）

---

## 9. ワークフロー（全体フロー）

```
/gsdlc:init-project
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 0: PROJECT FOUNDATION                             │
│  research-coordinator (4並列リサーチャー)                  │
│  → product-architect [2P] → story-writer [2P]            │
│  → unit-designer [2P] → story-mapper                     │
│  Output: docs/product/ 基盤文書群 + roadmap.json + state.json │
└────────────────────────┬────────────────────────────────┘
                         │
  ┌──────────────────────▼──────────────────────┐
  │            FOR EACH UNIT IN ROADMAP          │
  └──────────────────────┬──────────────────────┘
                         │
     /gsdlc:design       ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 1: UNIT DESIGN  (2-Phase Execution — ハーネス管理) │
│  設計スキル群をディスパッチ                                │
│  Gate: implementation-readiness-checker                   │
└────────────────────────┬────────────────────────────────┘
                         │
     /gsdlc:plan         ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 2: IMPLEMENTATION PLANNING                        │
│  依存性分析 → Wave分割 → execution-waves.json生成         │
│  Plan-Check Loop (max 3): planner → checker → retry      │
└────────────────────────┬────────────────────────────────┘
                         │
     /gsdlc:execute      ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 3: WAVE EXECUTION                                 │
│  PRE-FLIGHT: harness:check-ready (ハーネスに委譲)         │
│  Wave N: Fresh Context → 並列実行 → Atomic commit         │
│  POST-WAVE: L2 validators (ハーネスに委譲)                │
└────────────────────────┬────────────────────────────────┘
                         │
     /gsdlc:verify       ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 4: VERIFICATION & RECONCILIATION                  │
│  consistency-checker / drift-detector (ハーネスに委譲)     │
│  cascade-updater (ハーネスに委譲)                         │
│  state.json / roadmap.json 進捗反映                        │
└────────────────────────┬────────────────────────────────┘
                         │
                    Adaptive Replanning
                    (設計変更は2-Phase承認必須)
                         │
                    次Unit? ── Yes → PHASE 1
                         │ No
     /gsdlc:milestone    ▼
┌─────────────────────────────────────────────────────────┐
│  MILESTONE COMPLETION                                    │
│  audit → complete (タグ+アーカイブ) → new                 │
└─────────────────────────────────────────────────────────┘
```

### 9.1 Auto Mode

GSD-2の`auto.ts`に着想を得た自律実行モード。状態機械がディスク上の成果物を読み取り、次のunitを判定し、Fresh Contextで新しいセッションをディスパッチする。

```
/gsdlc:execute <unit> --auto
     │
     ▼
┌──────────────────────────────────────────────────┐
│  AUTO MODE STATE MACHINE                           │
│                                                    │
│  loop:                                             │
│    1. deriveState() — ディスク成果物からphase導出    │
│    2. 次unitを決定                                  │
│    3. スタック検出（同一unit再dispatch?）             │
│    4. Lock file書き込み                             │
│    5. Fresh Session生成（200K context）              │
│    6. Pre-inlined dispatch prompt構築               │
│    7. Executor起動                                  │
│    8. タイムアウト監視（Soft/Idle/Hard）              │
│    9. 完了 → Lock解放 → メトリクス記録               │
│   10. Post-wave検証（ハーネスに委譲）                │
│   11. goto loop                                     │
│                                                    │
│  停止条件:                                          │
│    - 全Wave完了                                     │
│    - 品質ゲート失敗（自動修正不可）                   │
│    - スタック検出（2回連続）                          │
│    - Hard timeout                                   │
│    - Budget ceiling到達                             │
│    - 人間による/gsdlc:pause                         │
└──────────────────────────────────────────────────┘
```

### 9.2 リサーチ並列化

```
/gsdlc:init-project 内部:

  research-coordinator
       │
       ├─→ Researcher A: 技術スタック調査
       ├─→ Researcher B: 既存コードベース分析
       ├─→ Researcher C: アーキテクチャパターン調査
       └─→ Researcher D: リスク・落とし穴調査
       │
       ▼
  研究結果統合 → docs/inception/{unit}/research.md
```

4並列リサーチャーはそれぞれ独立したコンテキストウィンドウで動作し、結果をresearch-coordinatorが統合する。

### 9.3 Git戦略

| 粒度 | ブランチ | コミット |
|------|---------|---------|
| Unit | `feat/{unit-name}` | — |
| UserStory | `feat/{unit-name}/{US-id}` | TDDサイクル単位のatomic commit |
| Wave | — | Wave完了時にPost-wave検証後マージ |

コミットメッセージ形式: `feat(unit/US): <description>`

---

## 10. スコープ（実装フェーズ）

### Phase 1: Core Orchestration（v1 MVH）

| 機能 | 説明 |
|------|------|
| コンテキスト管理 | context-priority.json + Fresh Context Protocol |
| セッション管理 | session-manager + state.json + session-state.json + pause/resume + 起動ルーチン |
| ライフサイクル管理 | milestone-manager + roadmap.json + progress tracking |
| オーケストレーションコマンド | init-project/design/plan/execute/verify SKILL.md定義 |
| コスト台帳 | Per-unit token/cost ledger（表示のみ、予算制御はPhase 2） |
| Git戦略 | Atomic commits + ブランチ戦略定義 |
| orchestration.config.json | オーケストレーション設定ファイル定義（harness.config.jsonとは完全分離） |

### Phase 2: Advanced Execution

| 機能 | 説明 |
|------|------|
| Wave並列実行エンジン | wave-orchestrator + 依存性分析 + 並列制御 |
| Auto Mode | 状態機械 + 自律実行ループ |
| クラッシュ回復 | Lock file + JSONL session forensics |
| スタック検出 | 同一unit再dispatch検出 + 診断 |
| 3段階タイムアウト | Soft/Idle/Hard |
| モデルルーティング | quality/balanced/budget プロファイル |
| リサーチ並列化 | 4並列リサーチャー（research-coordinator） |
| 予算制御 | Budget ceiling + Auto Mode自動停止 |

### Phase 3: Refinement

| 機能 | 説明 |
|------|------|
| Adaptive Replanning | Unit完了後のロードマップ再評価（2-Phase承認ゲート付き） |
| 動的スコープ管理 | scope-manager（add/insert/remove phase） |
| モデルプロファイル自動選択 | タスク特性に基づく動的モデル選択 |

---

## 11. リスク

| リスク | 深刻度 | 確率 | 軽減策 |
|--------|--------|------|--------|
| 品質ハーネスとの連携の複雑化 | 高 | 中 | ファイルシステム + コマンド実行による疎結合。直接API結合を避ける |
| Auto Modeの暴走（品質ゲート迂回） | 高 | 低 | 品質ゲート失敗時は必ず停止。yolo/skip-permissions不採用 |
| セッション状態の不整合 | 中 | 中 | 成果物駆動の状態導出。STATE.mdはキャッシュであり、いつでも再導出可能 |
| Wave並列実行時のリソース競合 | 中 | 中 | ファイルレベルの排他制御。同一ファイルを触るUSは同一Waveに入れない |
| コスト予測の精度 | 低 | 高 | 完了Unit実績からの推定であり、正確な予測は保証しない旨を明示 |
| GSD-2との概念的乖離 | 中 | 中 | GSD-2の設計文書を定期的に参照し、コンセプトの互換性を維持 |

---

## 12. Key Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| GSD-2 npmパッケージ非依存 | ランタイム非互換（Pi SDK vs Claude Code）、品質ゲート統合の設計上の理由 | Decided |
| 品質ハーネスへの一方向依存 | オーケストレーターは品質判断を行わない。ハーネスの検証結果を受け取るだけ | Decided |
| 成果物駆動の状態導出（GSD-2 `deriveState()`パターン） | STATE.mdをキャッシュとし、ディスク成果物からphaseを純粋導出。信頼性とクラッシュ耐性の両立 | Decided |
| `docs/`統一原則（`.gsd/`不使用） | folder_management_rules.md準拠。`.planning/`や`.gsd/`との二重管理を防止 | Decided |
| 設定ファイル分離（harness.config.json + orchestration.config.json） | 品質設定とオーケストレーション設定を別ファイルに完全分離。GSD-2の`preferences.md`パターンは採用しない | Decided |
| ファイルシステム+コマンド実行による疎結合 | オーケストレーターとハーネスの直接API結合を避け、交換可能性を維持 | Decided |
| GSD-2をオーケストレーターとして採用する選択肢を排除しない | Pi SDKのClaude Code統合やGSD-2の品質ゲートAPI提供があれば再検討 | Decided |
| Wave並列実行をPhase 2に延期 | 設計複雑度が高く、Phase 1ではセッション管理・コンテキスト管理を優先 | Decided |
| Adaptive Replanningに2-Phase承認ゲートを付与 | GSD-2との最大の差異。設計変更の自律実行は品質リスクが高い | Decided |
| FUSE Hooks Engineは本パッケージでは扱わない | FUSE Hooks Engineは品質ハーネス側の将来構想であり、オーケストレーションパッケージの責務外 | Decided |

---

## 13. 成果物配置

| 成果物 | 配置先 | 備考 |
|--------|--------|------|
| state.json | `docs/inception/_shared/state.json` | プロジェクト状態キャッシュ（機械的真実、成果物から再導出可能） |
| state.md | `docs/inception/_shared/state.md` | state.jsonから生成される人間向けビュー |
| roadmap.json | `docs/inception/_shared/roadmap.json` | 進捗追跡（機械的真実） |
| roadmap.md | `docs/inception/_shared/roadmap.md` | roadmap.jsonから生成される人間向けビュー |
| session-state.json | `.harness/session-state.json` | セッション固有状態（中断位置、作業メモ。プロジェクト状態とは独立） |
| orchestration.config.json | プロジェクトルート | オーケストレーション設定（タイムアウト、モデル、予算等） |
| execution-waves.json | `docs/inception/{unit}/execution-waves.json` | Wave実行計画 |
| milestones.json | `docs/inception/_shared/milestones.json` | マイルストーン定義 |
| context-priority.json | `.harness/context-priority.json` | コンテキスト優先度 |
| session activity log | `docs/inception/_shared/session-log.jsonl` | セッションフォレンジック用 |
| .session.lock | `docs/inception/_shared/.session.lock` | クラッシュ検出用Lock file |

**原則**: `.gsd/`ディレクトリは使用しない。全てのアーティファクトは`docs/`配下に統一する（`.harness/`は設定ファイルのみ例外）。

---

*Last updated: 2026-03-11 — Initial draft: Orchestration Engine package separation*
