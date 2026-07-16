# Phasegate — Product Overview

> **Version**: v1.0 (Draft)
> **作成日**: 2026-03-11
> **前身**: AIDLC Harness v0（ALIDL_HARNESS）
> **ステータス**: Inception — パッケージ分離設計確定
> **スコープ**: 品質ハーネス（Quality Harness）パッケージのみ。オーケストレーションパッケージは別文書。

---

## 1. プロダクト定義

### 1.1 What This Is

**Phasegateは、AIエージェントが生成するコードと設計の構造的整合性を、エージェント非依存で機械的に保証し続けるポータブルな品質防御ツールキットである。**

どのAIエージェント — Claude Code, GSD-2, Codex, Cursor, あるいは将来登場する任意のエージェント — で開発しても、このハーネスをプロジェクトに導入すれば、設計意図とコードの構造的整合性が壊れない。これがQuality Harnessの唯一かつ最大の約束である。

### 1.2 Core Value

> **「設計意図とコードの構造的整合性を、機械的に保証し続けること」**

全てのオーケストレーションが止まっても、全てのセッションが失われても、このCore Valueだけは機能しなければならない。設計文書に書かれた構造（ドメインモデル、レイヤー境界、テスト仕様）と、実際のコードが乖離していないことを、人間の注意力に頼らず検出し続ける能力。

Quality Harnessに追加される全ての機能は、このCore Valueを侵害しない限りにおいてのみ存在が許される。

### 1.3 対象ユーザー

AIエージェントを活用してプロダクション品質のソフトウェアを構築するエンジニアリングチーム。具体的には：

- **「AIにコードを書かせたいが、品質を妥協したくない」チーム** — ハーネスが品質の最後の砦となる
- **複数のAIエージェントを使い分けるチーム** — エージェントが変わっても品質基準は不変
- **既存プロジェクトに段階的に品質ゲートを導入したいチーム** — プリセット（minimal → standard → strict）で段階的採用

### 1.4 品質ハーネスの責務境界

Quality Harnessは**「何を守るか（WHAT to enforce）」**に責任を持つ。**「どう実行するか（HOW to orchestrate）」**はオーケストレーションパッケージの責務であり、本パッケージには含まない。

| Quality Harnessの責務 | オーケストレーションの責務（本パッケージ外） |
|---|---|
| L1-L4バリデータ群 | Wave並列実行エンジン |
| DDD設計スキル群（29スキル） | セッション管理（pause/resume/STATE.md） |
| 2-Phase Execution / Phase Gate | コンテキスト管理（context-priority.json） |
| @unit/@layerメタデータ | Milestone/ロードマップ管理 |
| HarnessError定義 | Auto Mode / モデルルーティング |
| phasegate.config.json（品質設定） | コスト台帳 / クラッシュ回復 |
| Quick Mode（ハーネス緩和ルール） | タイムアウト監視 |
| Drift Detection / Consistency Check | FUSE Hooks Engine（横断基盤として別途検討） |
| Cascade Updater / Agent-Lesson System | |
| Nyquist Validation | |

> **注記**: 旧product_overviewでv1必須とされていた以下の機能はオーケストレーションパッケージに移管: コンテキスト腐敗防止、セッション継続性、ライフサイクル管理、起動ルーチン標準化、オーケストレーションコマンド定義

---

## 2. ポジショニング — 品質ハーネスとしての唯一性

### 2.1 競合比較

```
                品質強制力の深さ（コードレベル）
                ▲
                │
    Phasegate       │
    Quality  ■  │
    Harness     │         AIDLC v0 ●
                │
                │              BMAD ●
                │                        （プロンプトベース）
                │    Speckit ●
                │
                │         Taskmaster ●     GSD2.0 ●
                │
                └──────────────────────────────► エージェント非依存性
```

**Quality Harnessのユニークポジション**: 「コードレベルのアーキテクチャ強制力を持つ、エージェント非依存の唯一の品質防御ツールキット」

| 比較対象 | 品質アプローチ | Quality Harnessとの違い |
|---------|-------------|----------------------|
| **GSD-2** | 品質ガバナンス皆無。Truths/Artifacts検証はあるがコードレベルの強制力なし | Harnessは4層防御でコードレベルの品質を物理的に強制 |
| **BMAD** | プロンプトでロールベースの品質指示 | Harnessは「プロンプトで願う」のではなく「コードで強制する」 |
| **Speckit** | 仕様駆動だがASTレベルの構造検証なし | Harnessはimportグラフ解析+レイヤー違反検出をASTで実行 |
| **Taskmaster** | タスク分解に特化。品質保証は範囲外 | Harnessは品質保証そのものが存在理由 |
| **ESLint/Biome単体** | 汎用的なLintルール | Harnessはドメイン設計⇔コードの構造的整合性を検証する設計認知型ルール |

### 2.2 なぜエージェント非依存が重要か

AIエージェントのエコシステムは急速に変化している。今日のClaude Codeが明日はCodexに、来月は未知のエージェントに置き換わる可能性がある。品質保証がエージェント固有の仕組み（プロンプト遵守、特定のHook API）に依存していれば、エージェント変更のたびに品質基盤が崩壊する。

Quality Harnessはエージェントの上に乗るのではなく、エージェントの下に敷かれる。Biome ASTルール、Pre-commitフック、CIバリデータ — いずれもエージェントが何であるかを知らない。ファイルシステムに書き込まれたコードだけを見て、ルールに照らして判定する。

---

## 3. v0からの進化 — AIDLC v0 → Phasegate

### 3.1 進化のナラティブ

**AIDLC Harness v0**は「AI駆動開発に品質保証の鎧を着せる」ことに成功した。24のAgentSkills、4層防御モデル（L1-L4）、2-Phase Execution、@unit/@layerメタデータによるコード-設計トレーサビリティは、AIエージェントが生成するコードの品質を人間の設計意図に従わせる強力な仕組みを確立した。

v1では、この品質保証の核心を**ポータブルなハーネスとして再構築**する。v0はClaude Code専用の統合環境だったが、v1 Quality Harnessはどのエージェントにも接続可能な独立パッケージとなる。

```
v0 (AIDLC)                    v1 (Phasegate)
──────────────────────────    ─────────────────────────────────
品質 ████████████              品質 ████████████  ← 維持（K1-K13全保持）
移植性 ██                      移植性 █████████   ← エージェント非依存化
柔軟性 ██                      柔軟性 ████████    ← Quick Mode追加
エラー自己修正 ███             エラー自己修正 ████████  ← HarnessError拡充
トレーサビリティ ██████        トレーサビリティ █████████  ← Nyquist追加
```

### 3.2 GSD-2から取り込む品質関連概念

GSD-2の分析により、品質ハーネスに統合すべき概念が判明した。

| GSD-2概念 | ハーネスへの統合方法 |
|-----------|-------------------|
| **成果物駆動の状態導出** | バリデータの検査状態管理に応用。ファイルシステム上の成果物（設計文書、テストファイル、メタデータ）の存在からハーネス検査状態を導出する |
| **Truths/Artifacts検証パターン** | Nyquist Validationと統合。要件（Truths）→テスト（Artifacts）のトレーサビリティを体系的に検証 |
| **スタック検出** | バリデータ無限ループ防止に応用。同一エラーの繰り返し検出時に自動エスカレーション |

---

## 4. 設計哲学 — 品質に関する原則

### 原則 1: Executable Governance（検証は実行可能コードで表現する）

> ドキュメントに書かれたルールは破られる。コードに書かれたルールは実行される。

- 「ドメイン層は外部フレームワークに依存しない」→ `no-layer-violation` Biomeルール
- 「全ソースファイルにUnit/Layer帰属を明示する」→ `require-unit-comment` / `require-layer-comment` Biomeルール
- 「フォルダ構造はアーキテクチャに従う」→ `enforce-folder-structure` Biomeルール
- 「テストはAAAパターンで書く」→ `test-quality` Pre-commitバリデータ
- 「設計文書なしに実装コードを変更しない」→ `phase-gate` Pre-commitバリデータ
- 「上流設計なしに下流設計を開始しない」→ `phase-gate` Phase Dependency Model検証
- 「設計文書の累積更新時にはUS起源を記録する」→ `metadata` Traceability Model検証

プロンプトで「レイヤー違反しないでください」と願うのではなく、Biome ASTルールがimportグラフを解析して違反を検出する。エージェントのプロンプト遵守度に品質が依存しない。

### 原則 2: Human Gate, Machine Execute（設計は人間承認、実行は機械自律）

> 2-Phase Executionは設計フェーズの聖域。

設計スキル（domain-designer, logical-designer等）の出力には必ず人間の承認を求め、承認済み設計に基づいてバリデータが自律的に検証する。Quick Modeであっても、新規ドメインモデルの追加には人間承認が必須。

### 原則 3: Gated Velocity（品質ゲート付き速度最適化）

> ゲートは通過必須。ゲート間は最大速度。

品質ゲートは速度の敵ではない。ゲートを明確に定義することで、ゲート間では安心して最大速度で進める。Quick Modeはこの原則の極端な適用 — 軽微な変更ではゲートを最小限に絞り、速度を最大化する。

### 原則 4: Progressive Disclosure（段階的開示で複雑さを隠蔽する）

> 入口は簡素に。奥行きは深く。

- **minimal**: L1 + L2のみ。学習・プロトタイプ向け
- **standard**: L1 + L2 + L3。通常開発
- **strict**: L1-L4全層。本番・エンタープライズ

### 原則 5: Error as Teacher（エラーは教師である）

> HarnessErrorは「何が悪いか」だけでなく「どう直すか」を伝える。

全てのHarnessErrorにADR参照と修正コード例を付与する。AIエージェントがエラーメッセージだけで自己修正できることを目指す。人間がエラーを読み解く必要がない品質自動修復ループの基盤。

---

## 5. アーキテクチャ — 4層防御モデル

### 5.1 レイヤー構成

```
╔═══════════════════════════════════════════════════════════════════════╗
║  L1 EDITOR TIME: Biome AST Rules                                     ║
║  ─────────────────────────────────────────────────────────────────── ║
║  [コア4ルール]                      [AI Antipattern検出]             ║
║  require-unit-comment               any乱用検出                      ║
║  require-layer-comment              コード重複検出                    ║
║  no-layer-violation                 ゴーストファイル検出              ║
║  enforce-folder-structure           コメント洪水検出                  ║
║                                                                      ║
║  実行タイミング: エディタ保存時 + CI（Claude Code使用時はPostToolUse Hookも利用可） ║
║  特性: Rust製Biomeによる高速AST解析。importグラフ+循環依存検出      ║
╠═══════════════════════════════════════════════════════════════════════╣
║  L2 PRE-COMMIT: Validators                                           ║
║  ─────────────────────────────────────────────────────────────────── ║
║  phase-gate          設計→実装の順序強制（設計文書なしの実装を拒否）  ║
║  metadata            @unit/@layer/@US-XXX/@storyメタデータの完全性検証 ║
║  test-quality        AAA / actual命名 / single-act / no-domain-mock  ║
║                      E2E seed pattern / Page UI MSW /                ║
║                      describe-it命名規約                              ║
║                                                                      ║
║  実行タイミング: git commit前                                        ║
╠═══════════════════════════════════════════════════════════════════════╣
║  L3 CI/CD: Validators                                                ║
║  ─────────────────────────────────────────────────────────────────── ║
║  security            ハードコード秘密 / SQLインジェクション検出       ║
║  performance         ループ内await / N+1クエリ / bundleSizeLimit     ║
║  coverage            カバレッジ閾値検証（standard: 90%, strict: 95%） ║
║  nyquist             要件→テスト双方向トレーサビリティ検証           ║
║                      requirement-test-matrix.json生成                 ║
║                                                                      ║
║  実行タイミング: Pull Request / CI パイプライン                       ║
╠═══════════════════════════════════════════════════════════════════════╣
║  L4 SCHEDULED: Validators                                            ║
║  ─────────────────────────────────────────────────────────────────── ║
║  drift-detect        設計にあるがコードにない /                       ║
║                      コードにあるが設計にない — 双方向検出            ║
║  consistency-check   文書間レイヤー整合性チェック                     ║
║  dead-code           未使用エクスポート / 到達不能コード検出          ║
║                                                                      ║
║  実行タイミング: 週次スケジュール / 手動トリガー                     ║
╚═══════════════════════════════════════════════════════════════════════╝
```

### 5.2 HarnessError定義

全バリデータは統一された`HarnessError`フォーマットでエラーを報告する。

```typescript
interface HarnessError {
  code: string;          // e.g., "L1-001", "L2-PHASE-GATE"
  severity: "error" | "warning";
  message: string;       // 人間可読な説明
  suggestion: string;    // 修正方法の提案
  adr_ref?: string;      // 関連ADRへの参照 e.g., "ADR-003"
  fix_example?: string;  // 修正コード例（AIエージェントの自己修正用）
}
```

**設計意図**: `fix_example`の存在がQuality Harnessの差別化要因。AIエージェントはエラーメッセージと修正コード例を読んで、人間の介入なしに自己修正できる。これにより「エラー発生→人間がエラーを読む→人間がAIに修正指示→AI修正」のループが「エラー発生→AI自己修正」に短縮される。

### 5.3 Traceability Model（トレーサビリティモデル）

Quality Harnessのコアドメインの一つ。実装コードから設計意図、さらにはどのユーザーストーリーの判断がその設計に注入されたかを、メタデータの逆引きチェーンで決定論的に導出できる仕組み。

#### 逆引きチェーン

```
実装ファイル                設計文書                        計画文書
─────────────            ──────────────                ─────────────
// @unit config_foundation
// @layer domain          product/construction/          inception/
                          config_foundation/             config_foundation/
src/domain/               domain_model.md                US-001/
  ConfigSchema.ts ──────→   @US-001: スキーマ定義追加  ──→  domain_model_plan.md
                             @US-003: バリデーション拡張      (QAセクション)
                          logical_design.md
                             @US-001: Port定義
```

**逆引きの方向**:
1. **実装 → Unit**: `// @unit {unit_name}` により、そのファイルがどのUnitの実装かを特定
2. **Unit → 設計**: `product/construction/{unit}/` 配下の設計文書群を参照
3. **設計 → US**: 設計文書内の`@US-XXX`アノテーションにより、どのUSの意図が注入されたかを特定
4. **US → 計画**: `inception/{unit}/{US-XXX}/`配下のplan文書で設計判断の根拠（QAセクション）を参照

#### メタデータ仕様

**実装ファイル（ソースコード）のメタデータ**:

```typescript
// @unit config_foundation
// @layer domain
```

- `@unit`: 必須。そのファイルが帰属するUnit名。`product/units/{unit_name}.md`に定義されたUnit名と一致すること
- `@layer`: 必須。そのファイルが帰属するアーキテクチャレイヤー（domain / application / infrastructure / presentation）

**設計文書（product/construction/{unit}/）のメタデータ**:

累積更新時に、更新内容の起源となったUSを`@US-XXX`で記録する。

```markdown
## エンティティ: ConfigSchema

@US-001

- name: string（必須）
- version: SemVer

@US-003

- validationRules: ValidationRule[]（バリデーション拡張）
```

`@US-XXX`の記載ルール:
- `product/construction/{unit}/`配下のドキュメントを`inception/{unit}/{US-XXX}/`の内容に基づき更新する際、更新箇所に`@US-XXX`を付与する
- 1つの設計要素に複数USが関与する場合、関与した全USを時系列順に記載する
- 初回のUnit横断設計（Level 2）で作成された内容にはUS注釈は不要（Level 2はUS単位ではないため）
- `@US-XXX`は設計要素の直前に独立行として記載する（インラインではなくブロック単位）

**テストファイルのメタデータ**:

```typescript
// @unit config_foundation
// @layer domain
// @story US-001
```

- `@story`: テストファイルでは追加で、そのテストが検証するUSを記載。Nyquist Validationの入力として使用される

#### バリデータによる検証

| バリデータ | 検証内容 | タイミング |
|---|---|---|
| `require-unit-comment` (L1) | `@unit`の存在チェック | エディタ保存時 |
| `require-layer-comment` (L1) | `@layer`の存在チェック | エディタ保存時 |
| `metadata` (L2) | `@unit`値が`product/units/`に定義されたUnit名と一致するか。`@layer`値が有効なレイヤー名か | Pre-commit |
| `metadata` (L2) | `product/construction/{unit}/`の更新時、対応する`@US-XXX`が付与されているか | Pre-commit |
| `nyquist` (L3) | `@story`とテストケースのマッピングが要件を網羅しているか | CI |
| `drift-detect` (L4) | `@unit`で参照されるUnitが設計文書に存在するか。設計文書の`@US-XXX`に対応するinception文書が存在するか | Scheduled |

#### トレーサビリティの保証レベル

| チェーン | 検証手段 | 保証レベル |
|---|---|---|
| 実装 → Unit | L1 `require-unit-comment` + L2 `metadata`整合性チェック | **機械的に強制** |
| 実装 → Layer | L1 `require-layer-comment` + L1 `no-layer-violation` | **機械的に強制** |
| 設計 → US | L2 `metadata`（累積更新時の`@US-XXX`付与チェック） | **機械的に強制** |
| テスト → US | L3 `nyquist`（`@story`と要件の双方向マッピング） | **機械的に強制** |
| US → 計画 | L4 `drift-detect`（`@US-XXX`に対応するinception文書の存在チェック） | **定期検証** |

### 5.4 Quick Mode

軽微な変更（バグ修正、ドキュメント修正、テスト追加、設定変更）に対して、ハーネスの一部を緩和するモード。

| 項目 | 通常モード | Quick Mode |
|------|----------|-----------|
| L1 Biome | 有効 | **有効**（維持） |
| L2 Pre-commit | 有効 | **有効**（維持） |
| L3 CI | 有効 | **部分有効**（securityのみ） |
| L4 Scheduled | 有効 | **スキップ** |
| Phase Gate | **必須** | **緩和** |
| 2-Phase Execution | **必須** | **緩和** |
| Atomic commit | **必須** | **有効**（維持） |

**Quick Mode実行バリデータマッピング**:
- **L1 全ルール維持**: `no-layer-violation`（アーキテクチャ検証）、`enforce-folder-structure`（依存性検証）を含む全8ルールが実行される
- **L2 選択実行**: `metadata`、`test-quality`は維持。`phase-gate`は緩和（スキップ可能）
- **L3 securityのみ**: `security`バリデータのみ実行。`performance`、`coverage`、`nyquist`はスキップ
- **2-Phase Execution**: 緩和（Quick Mode対象の軽微変更では不要）

**Quick Mode適用条件**:
- 適用: バグ修正、ドキュメント修正、テスト追加、設定変更
- 除外（フルハーネス必須）: 新機能追加、API契約変更、新ドメインモデル追加

### 5.5 phasegate.config.json（品質設定）

```jsonc
{
  "project": {
    "name": "my-project",
    "preset": "standard"       // "minimal" | "standard" | "strict"
  },
  "layers": {
    "L1": {
      "enabled": true,
      "rules": {
        "require-unit-comment": "error",
        "require-layer-comment": "error",
        "no-layer-violation": "error",
        "enforce-folder-structure": "error"
      }
    },
    "L2": {
      "enabled": true,
      "validators": ["phase-gate", "metadata", "test-quality"]
    },
    "L3": {
      "enabled": true,          // minimal preset: false
      "validators": ["security", "performance", "coverage", "nyquist"],
      "coverageThreshold": 90
    },
    "L4": {
      "enabled": false,         // strict preset: true
      "validators": ["drift-detect", "consistency-check", "dead-code"],
      "schedule": "weekly"
    }
  },
  "quickMode": {
    "allowedCategories": ["bugfix", "docs", "test", "config"],
    "maintainedLayers": ["L1", "L2"],
    "relaxedGates": ["phase-gate", "2-phase-execution"]
  },
  "phaseDependencies": {
    "preset": "default",          // "default" | "custom"
    "override": false,            // trueで依存の緩和を許可
    "customRules": [              // preset: "custom" 時のみ有効
      // { "phase": "domain-designer", "requires": ["unit-spec.md"] }
    ]
  },
  "planningMode": {
    "default": "interactive",     // "interactive" | "embedded-qa"
    "perPhase": {                 // フェーズ毎にモードを上書き可能
      // "domain-designer": "embedded-qa"
    }
  },
  "harnesses": {
    "agentLessonCollection": true,
    "cascadeUpdate": true,
    "bundleSizeLimit": 500      // KB, strict preset only
  },
  "paths": {
    "designDocs": "docs/product/construction",
    "inceptionDocs": "docs/inception"
  },
  "reporting": {
    "format": "json",
    "outputDir": ".harness/reports"
  }
}
```

**設定ファイル分離**: phasegate.config.jsonは品質設定のみを管理する。オーケストレーションパッケージは独自の`orchestration.config.json`を使用し、phasegate.config.jsonにはオーケストレーション設定を一切含まない。ownershipは完全に分離される。

### 5.6 Phase Dependency Model（フェーズ依存モデル）

Quality Harnessのコアドメインの一つ。設計フェーズ間の前提条件を定義し、**設計→設計**および**設計→実装**の両方の順序を機械的に強制する。

#### 3層フェーズ構造

Phase Dependency Modelは3つのスコープレベルで構成される。各レベルのフェーズは下位レベルの前提条件となり、スコープに応じて`inception/`配下の配置階層が決まる。

```
┌─────────────────────────────────────────────────────────────────────┐
│ Level 1: Product全体設計（横断的・初回）                              │
│ plan配置: inception/_shared/                                        │
│                                                                     │
│ product-architect ─→ story-writer ─→ story-mapper ─→ unit-designer │
│                                                                     │
│ 成果物: product/product_overview.md, user_stories.md,               │
│         user_story_mapping.md, units/{unit_name}.md                 │
├─────────────────────────────────────────────────────────────────────┤
│ Level 2: Unit横断設計（Unit単位）                                    │
│ plan配置: inception/{unit}/                                         │
│ 前提: Level 1のunit-designerが該当Unitを定義済み                    │
│                                                                     │
│ domain-designer ─→ logical-designer（横断）                         │
│       │                    │                                        │
│       ▼                    ▼                                        │
│ mock-designer        environment-designer                           │
│       │                                                             │
│       ▼                                                             │
│ it-test-designer     unit-test-designer                             │
│       │                    │                                        │
│       ▼                    ▼                                        │
│ it-test-logic-       unit-test-logic-                               │
│ designer             designer                                       │
│                                                                     │
│ 成果物: product/construction/{unit}/domain_model.md,                │
│         logical_design.md, it_test_design.md, etc.                  │
├─────────────────────────────────────────────────────────────────────┤
│ Level 3: ストーリー実装（US単位）                                    │
│ plan配置: inception/{unit}/{US-XXX}/                                │
│ 前提: Level 2の該当Unit設計が完了済み                                │
│                                                                     │
│ logical-designer（US固有） ─→ scenario-test-designer                │
│                                      │                              │
│                                      ▼                              │
│                               scenario-test-logic-designer          │
│                                      │                              │
│                                      ▼                              │
│                               uiux-designer                         │
│                                      │                              │
│                                      ▼                              │
│                        implementation-readiness-checker              │
│                                      │                              │
│                                      ▼                              │
│                              story-implementor                      │
│                                      │                              │
│                                      ▼                              │
│                      product/construction/{unit}/ を累積更新         │
└─────────────────────────────────────────────────────────────────────┘
```

**レベル間の依存ルール**:
- Level 2はLevel 1の完了が前提。unit-designerが該当Unitを定義していなければdomain-designerは起動不可
- Level 3はLevel 2の該当Unit設計完了が前提。Unit横断のdomain-model.md、logical-design.md等が存在しなければUS単位の設計に入れない
- 各レベル内のノードは、上流ノードの成果物（設計文書）がファイルシステム上に存在し、かつ2-Phase Executionで人間承認済みであることを前提条件とする

#### Planning Mode（計画モード）

各フェーズの2-Phase Executionにおいて、Phase 1（計画）の進め方を2つのモードから選択できる。**どちらのモードでも最終成果物として`inception/`配下の適切な階層に`*_plan.md`が生成されることは不変**であり、phase-gateバリデータはplan文書のファイル存在で検証する。

| モード | Phase 1の進め方 | 最終成果物 |
|---|---|---|
| **interactive** | AIが対話的にヒアリングを行い、情報を収集・整理した上で`*_plan.md`を生成 | 3層構造に応じた`inception/`配下の`*_plan.md` |
| **embedded-qa** | `*_plan.md`テンプレート内のQAセクションに人間が質問と回答を記入し、AIがそれを元に計画を完成 | 3層構造に応じた`inception/`配下の`*_plan.md` |

**plan配置先と3層構造の対応**:
- Level 1（Product全体設計）: `inception/_shared/*_plan.md`
- Level 2（Unit横断設計）: `inception/{unit}/*_plan.md`
- Level 3（ストーリー実装）: `inception/{unit}/{US-XXX}/*_plan.md`

**interactiveモード**:
1. AIがフェーズの目的・必要情報に基づいて質問を生成
2. 人間との対話を通じて設計判断に必要な情報を収集
3. 収集した情報を構造化し、`*_plan.md`としてファイルに書き出す
4. 人間がplan文書を承認 → Phase 2（設計文書の実行・生成）へ

**embedded-qaモード**:
1. AIがフェーズのテンプレートを`*_plan.md`として生成（QAセクション付き）
2. QAセクションに設計判断に必要な質問が埋め込まれている
3. 人間がQAセクションに回答を記入
4. AIが回答を元にplan文書の残りを完成
5. 人間がplan文書を承認 → Phase 2へ

**plan文書の構造**（両モード共通の最終形）:
```markdown
# {Phase名} Plan

## QA（設計判断の根拠）
- Q: {質問1}
  A: {回答1}
- Q: {質問2}
  A: {回答2}

## 計画内容
{AIが整理した計画}

## 承認
- [ ] 人間承認済み
```

**設計意図**: QAセクションは単なるプロセス記録ではなく、**設計判断の根拠をトレーサブルにする仕組み**である。なぜその設計判断に至ったかを、対話ログではなくplan文書内に構造化して保持することで、セッションが失われても設計意図が残る。これはCore Value（設計意図とコードの構造的整合性の保証）を計画段階から適用するものである。

#### 前提条件の定義

**Level 1: Product全体設計**

| フェーズ（スキル） | 必須の前提成果物 | plan配置先 |
|---|---|---|
| `product-architect` | （起点） | `inception/_shared/product_overview_plan.md` |
| `story-writer` | `product/product_overview.md` | `inception/_shared/story_writer_plan.md` |
| `story-mapper` | `product/user_stories.md` | `inception/_shared/story_mapping_plan.md` |
| `unit-designer` | `product/user_stories.md` + `product/user_story_mapping.md` | `inception/_shared/unit_design_plan.md` |

**Level 2: Unit横断設計**

| フェーズ（スキル） | 必須の前提成果物 | plan配置先 |
|---|---|---|
| `domain-designer` | `product/units/{unit_name}.md` | `inception/{unit}/domain_model_plan.md` |
| `logical-designer`（横断） | `product/construction/{unit}/domain_model.md` | `inception/{unit}/logical_design_plan.md` |
| `mock-designer` | `product/construction/{unit}/domain_model.md` | `inception/{unit}/mock_design_plan.md` |
| `environment-designer` | `product/construction/{unit}/logical_design.md` | `inception/{unit}/environment_design_plan.md` |
| `it-test-designer` | `logical_design.md` + `domain_model.md` | `inception/{unit}/it_test_design_plan.md` |
| `unit-test-designer` | `domain_model.md` | `inception/{unit}/unit_test_design_plan.md` |
| `it-test-logic-designer` | `it_test_design.md` | `inception/{unit}/it_test_logic_plan.md` |
| `unit-test-logic-designer` | `unit_test_design.md` | `inception/{unit}/unit_test_logic_plan.md` |

**Level 3: ストーリー実装**

| フェーズ（スキル） | 必須の前提成果物 | plan配置先 |
|---|---|---|
| `logical-designer`（US固有） | Level 2の`logical_design.md` + `domain_model.md` | `inception/{unit}/{US-XXX}/logical_design_plan.md` |
| `scenario-test-designer` | US固有`logical_design.md` + Level 2の`uiux_design.md`（存在時） | `inception/{unit}/{US-XXX}/scenario_test_plan.md` |
| `scenario-test-logic-designer` | `scenario_test_design.md` | `inception/{unit}/{US-XXX}/scenario_test_logic_plan.md` |
| `uiux-designer` | `scenario_test_design.md` + `mock_design.md`（存在時） | `inception/{unit}/{US-XXX}/uiux_design_plan.md` |
| `implementation-readiness-checker` | US固有の全テストロジック設計 + Level 2のテスト設計 | — |
| `story-implementor` | `implementation-readiness-checker`のPass判定 | `inception/{unit}/{US-XXX}/tdd_implementation_plan.md` |

> **累積更新ルール**: Level 3のstory-implementor完了後、US単位の設計で確定した仕様は`product/construction/{unit}/`の対応ドキュメント（domain_model.md, logical_design.md, uiux_design.md等）に累積更新される。これにより`product/`配下は常にUnit全体の最新確定仕様を反映する。

#### PJカスタマイズ

デフォルトフローは全プロジェクト共通だが、PJ固有の事情（既存システムへの段階導入、特定フェーズの省略等）に対応するため、`phasegate.config.json`の`phaseDependencies`でカスタマイズできる。

**カスタマイズの制約**:
- デフォルトフローへの**追加**（依存の強化）は自由
- デフォルトフローからの**削除**（依存の緩和）は`override: true`の明示が必要
- `story-implementor`の前に少なくとも1つのテスト設計フェーズが存在することは**緩和不可**（TDDの最低保証）
- Level間の依存（Level 2→Level 1、Level 3→Level 2）は**緩和不可**

### 5.7 FUSE Hooks Engineとの関係（将来構想）

FUSE Hooks Engineはv1スコープ外の横断基盤として別途検討される。Quality Harnessの観点では、FUSE Hooks Engineが提供するL0（Pre-write enforcement）はL1-L4の強制力を物理レベルに引き上げるものであり、ルール自体は変わらない。

**Fallback原則**: FUSE未使用時でもL1-L4の4層防御でCore Valueは完全に維持される。FUSEは強制力の物理レベルを上げるオプショナルな増強であり、FUSEの有無によって検証されるルールセットに差異は生じない。

### 5.8 Design Dependency Graph & Impact Analysis（将来構想）

> **ステータス**: 将来拡張予定。v1スコープ外。現時点ではPhase Gate（K2/K14）+ drift-detect（K11）の組み合わせで設計-実装間の整合性は確保されている。本機能はプロジェクト規模の拡大や横断的要件変更の頻度増加に応じて実装を検討する。

設計文書間の依存関係を明示的にグラフ化し、変更が発生した際の影響範囲を**事前に予測**する仕組み。既存のPhase Gate（順序強制）・drift-detect（事後検出）が「縦方向」の品質を守るのに対し、本機能は「横方向」の変更波及を予測する。

> **着想元**: CoDD（Coherence-Driven Development）の依存グラフベース変更影響分析。CoDDの`codd impact`が持つ「変更時にどこが壊れるか」の事前予測能力を、Quality Harnessの既存トレーサビリティモデル上に構築する。

#### 設計意図

既存の `drift-detect`（L4）は「設計とコードの乖離」を**事後検出**する。しかし、「要件や設計が変わった時にどの設計書が影響を受けるか」を**事前に知る**仕組みが欠けている。Impact Analysisはこのギャップを埋める。

| 機能 | 性質 | 役割 |
|---|---|---|
| `drift-detect` (L4) | 事後検出 | 「壊れた」を見つける |
| `impact-analyzer` (新設) | 事前予測 | 「壊れそう」を教える |
| `cascade-updater` | 自動更新 | Green帯域の設計書を自動更新する |
| `consistency-checker` (L4) | 整合性検証 | cascade-updater実行後の整合性を検証 |

4つは補完関係であり、既存機能を置き換えるものではない。

#### 依存グラフの構築

`product/construction/{unit}/`配下の設計文書に、フロントマターで依存関係を宣言する。

```yaml
---
harness:
  node_id: "{unit}:{doc_type}"           # e.g., "config_foundation:domain_model"
  depends_on:
    - id: "{unit}:logical_design"
      relation: "derives_from"            # derives_from | implements | verifies | constrains
    - id: "_shared:user_stories"
      relation: "implements"
---
```

**依存関係の種類（relation）**:

| relation | 意味 | 影響伝播の方向 | 重み |
|---|---|---|---|
| `derives_from` | 上流の設計から導出される | 上流変更時に下流が影響 | 0.9 |
| `implements` | 要件・仕様を実装する | 要件変更時に実装が影響 | 0.85 |
| `verifies` | テスト設計が検証対象を参照 | 検証対象変更時にテストが影響 | 0.8 |
| `constrains` | 制約として参照される | 制約変更時にすべての参照先が影響 | 0.5 |

**node_idの命名規則**:
- `{unit名}:{doc_type}` の形式（例: `config_foundation:domain_model`）
- `doc_type`はファイル名から拡張子を除いたもの（例: `domain_model.md` → `domain_model`）
- 横断的ドキュメントは `_shared:{doc_type}` を使用（例: `_shared:user_stories`）

**Phase Dependency Modelとの関係**:
- Phase Dependency Modelは「フェーズの実行順序」を強制する（Phase Gate）
- Design Dependency Graphは「設計文書間の意味的依存」を追跡する（Impact Analysis）
- 両者は相互補完。Phase Dependency Modelの3層構造が依存グラフの骨格を提供する
- 依存宣言はPhase Dependency Modelに従う方向でのみ許可される（Level 2→Level 1、Level内の上流→下流）

**フロントマターの適用範囲**:
- `product/construction/{unit}/`配下の累積設計文書にのみ付与する
- `inception/`配下の一時的計画文書には付与**しない**（Document Split原則の維持）
- `product/units/`配下のUnit定義にはオプショナルで付与可能

#### `harness:impact` コマンド

```bash
# 最新のgit diffから影響範囲を分析
pnpm harness:impact

# 特定ファイルの変更による影響範囲を分析
pnpm harness:impact --file docs/product/construction/config_foundation/domain_model.md

# 特定コミットとの差分から影響範囲を分析
pnpm harness:impact --diff HEAD~1
```

出力は3帯域（信頼度帯域）で分類される:

| 帯域 | 信頼度 | アクション | 人間の関与 |
|---|---|---|---|
| **Green** | 高（≥0.8） | cascade-updaterによる自動更新候補 | `autoUpdateOnGreen: true`時は不要 |
| **Amber** | 中（0.4-0.8） | HarnessImpactReportに表示。人間のレビューが必要 | 必須 |
| **Gray** | 低（<0.4） | 参考情報。間接的な影響の可能性 | 任意 |

**信頼度の計算**:
- 直接依存（depth=1）: `confidence = 基本スコア × relation重み`
- 間接依存（depth≥2）: `confidence = 基本スコア × relation重み × 減衰率^(depth-1)`
- 減衰率はデフォルト0.7。`phasegate.config.json`で調整可能
- `depthLimit`（デフォルト5）を超える間接依存はGray帯域として報告

#### HarnessImpactReport

```typescript
interface HarnessImpactReport {
  changedFiles: string[];
  timestamp: string;
  bands: {
    green: ImpactEntry[];
    amber: ImpactEntry[];
    gray: ImpactEntry[];
  };
  summary: {
    totalAffected: number;
    autoUpdatable: number;    // Green帯域の数
    reviewRequired: number;   // Amber帯域の数
    informational: number;    // Gray帯域の数
  };
}

interface ImpactEntry {
  nodeId: string;           // e.g., "config_foundation:logical_design"
  filePath: string;         // e.g., "docs/product/construction/config_foundation/logical_design.md"
  depth: number;            // 依存グラフ上の距離
  confidence: number;       // 0.0 - 1.0
  relation: string;         // derives_from | implements | verifies | constrains
  action: "auto-update" | "review-required" | "informational";
}
```

**設計意図**: HarnessImpactReportはHarnessErrorと同様に、AIエージェントが自律的に読み取って行動できるフォーマットを目指す。Green帯域のエントリにはcascade-updaterへの引き渡しが、Amber帯域にはconsistency-checkerとの照合が自動で行える。

#### 既存バリデータとの統合パイプライン

```
変更発生
  │
  ▼
harness:impact（事前予測）
  │
  ├──→ Green帯域 → cascade-updater（自動更新）→ consistency-checker（整合性検証）
  │
  ├──→ Amber帯域 → 人間レビュー → 手動更新 → consistency-checker
  │
  └──→ Gray帯域 → ログ記録（参考情報）
  
定期実行
  │
  ▼
drift-detect（事後検出）
  │
  └──→ impact-analyzerが予測した影響と実際の乖離を照合（精度フィードバック）
```

---

## 6. バリデータ一覧

### 6.1 L1 — Biome ASTルール

<!-- @work-item-id WI-265 — L1-006/L1-007/L1-008 の対応を canonical レジストリ（biome-ast-engine の rule-definition-registry.ts）に整合させた -->

| ルール | 検出対象 | HarnessError Code |
|--------|---------|------------------|
| `require-unit-comment` | `// @unit` コメントのないソースファイル | L1-001 |
| `require-layer-comment` | `// @layer` コメントのないソースファイル | L1-002 |
| `no-layer-violation` | レイヤー境界を越えるimport（domain→infrastructure等） | L1-003 |
| `enforce-folder-structure` | アーキテクチャに違反するファイル配置 | L1-004 |
| `no-any-abuse` | `any`型の過剰使用（AI生成コードの典型的アンチパターン） | L1-005 |
| `no-code-duplication` | 構造的に重複するコードブロック | L1-006 |
| `no-ghost-file` | importされないが存在するファイル | L1-007 |
| `no-comment-flood` | 過剰なコメント（AIが生成しがちな冗長コメント） | L1-008 |

### 6.2 L2 — Pre-commitバリデータ

| バリデータ | 検出対象 | HarnessError Code |
|-----------|---------|------------------|
| `phase-gate` | Phase Dependency Modelの3層構造に基づく前提条件違反の検出。(a) Level間の依存違反（Level 2の前提なしにLevel 3開始等）、(b) Level内の上流設計なしの下流設計生成、(c) 設計文書・plan文書なしの実装コード変更を拒否 | L2-001 |
| `metadata` | Traceability Modelのメタデータ検証。(a) `@unit`/`@layer`の欠落・不整合（実装ファイル）、(b) `@US-XXX`の欠落（設計文書の累積更新時）、(c) `@story`の欠落（テストファイル） | L2-002 |
| `test-quality` | テスト品質ルール違反（AAA, actual命名, single-act, no-domain-mock, E2E seed, describe-it規約） | L2-003 |

### 6.3 L3 — CIバリデータ

| バリデータ | 検出対象 | HarnessError Code |
|-----------|---------|------------------|
| `security` | ハードコードされた秘密情報、SQLインジェクションパターン | L3-001 |
| `performance` | ループ内await、N+1クエリ、バンドルサイズ超過 | L3-002 |
| `coverage` | テストカバレッジが閾値未満（standard: 90%, strict: 95%） | L3-003 |
| `nyquist` | 要件→テストの双方向トレーサビリティ欠落（requirement-test-matrix.json生成） | L3-004 |

### 6.4 L4 — Scheduledバリデータ

| バリデータ | 検出対象 | HarnessError Code |
|-----------|---------|------------------|
| `drift-detect` | 設計にあるがコードにない/コードにあるが設計にない双方向乖離 | L4-001 |
| `consistency-check` | 文書間のレイヤー整合性の破綻 | L4-002 |
| `dead-code` | 未使用エクスポート、到達不能コード | L4-003 |
| `impact-analyzer`（将来構想） | 設計文書の変更による影響範囲の事前予測。Design Dependency Graphを辿り、Green/Amber/Gray帯域で分類したHarnessImpactReportを生成。v1スコープ外 | L4-004 |

---

## 7. スキルシステム（29スキル）

### 7.1 スキルマップ

Quality Harnessの設計方法論を実現する29スキル。全スキルは2-Phase Executionに従い、設計文書のみを出力する（コード生成はstory-implementor等の実行スキルが担う）。

| カテゴリ | スキル | 数 |
|---------|--------|---|
| **Foundation** | product-architect, story-writer, unit-designer, story-mapper | 4 |
| **Design** | domain-designer, logical-designer, mock-designer, uiux-designer, environment-designer | 5 |
| **Test Engineering** | scenario-test-designer, it-test-designer, unit-test-designer, scenario-test-logic-designer, it-test-logic-designer, unit-test-logic-designer, test-coverage-checker | 7 |
| **Implementation** | story-implementor, implementation-readiness-checker, quick-implementor | 3 |
| **Verification** | consistency-checker, cascade-updater, codex-delegator, codebase-mapper, doc-health-checker | 5 |
| **Meta** | skill-creator, engineering-perspective | 2 |

### 7.2 品質ハーネス直属のスキル群

以下のスキルは品質ハーネスの核心であり、オーケストレーションパッケージなしでも単独で機能する。

| スキル | 責務 | 品質への貢献 |
|--------|------|------------|
| **domain-designer** | DDDドメインモデル設計（Entity/VO/Aggregate） | @unitの構造的基盤を定義 |
| **logical-designer** | Hexagonal Architecture設計（Port & Adapter） | @layerの構造的基盤を定義 |
| **test-designers** (6スキル) | 3レベル×2段階のテスト設計 | Nyquist Validationの入力を生成 |
| **test-coverage-checker** | テストカバレッジ検証 + Nyquist Validation | 要件→テストトレーサビリティ保証 |
| **implementation-readiness-checker** | 実装開始前のPlan-Checkループ | Phase Gate通過の最終確認 |
| **consistency-checker** | 文書間整合性検証 | L4 consistency-checkバリデータの設計時版 |
| **cascade-updater** | 下位変更→上位設計への影響伝播 | 設計-実装乖離の事前防止 |
| **story-implementor** | TDDサイクルでの実装 + Atomic commit | 品質ゲート遵守下での実装 |
| **quick-implementor** | Quick Mode下でのad-hoc実装（ポリシーはハーネスが定義。実行トリガーはオーケストレーターの`/gsdlc:quick`） | 緩和されたゲートでも最低限の品質を維持 |

### 7.3 プリセット体系

段階的採用を支援する3プリセット。

| プリセット | 用途 | 有効レイヤー | カバレッジ閾値 | 主要差分 |
|-----------|------|------------|-------------|---------|
| **minimal** | 学習・プロトタイプ | L1, L2 | — | phase-gateのみ。最速で導入可能 |
| **standard** | 通常開発 | L1, L2, L3 | 90% | 全L3バリデータ有効。Nyquist検証あり |
| **strict** | 本番・エンタープライズ | L1-L4 | 95% | L4スケジュール検証 + bundleSizeLimit + agentLessonCollection + deadCodeGC |

### 7.4 CI/CDテンプレート

| テンプレート | 用途 | トリガー | 配置先（テンプレート） |
|------------|------|---------|---------------------|
| `aidlc-gate.yml` | PR検証ワークフロー（全バリデータ実行、失敗時PRコメント） | Pull Request | `docs/templates/ci/aidlc-gate.yml` |
| `consistency-check.yml` | 週次設計-実装整合性チェック（乖離検出時Issue自動作成） | Scheduled (weekly) | `docs/templates/ci/consistency-check.yml` |
| `.husky/pre-commit` | Pre-commitフックテンプレート | git commit | `docs/templates/hooks/pre-commit` |

**導入手順**:
1. `docs/templates/ci/aidlc-gate.yml` → `.github/workflows/aidlc-gate.yml` にコピー
2. `docs/templates/ci/consistency-check.yml` → `.github/workflows/consistency-check.yml` にコピー
3. `docs/templates/hooks/pre-commit` → `.husky/pre-commit` にコピーし `chmod +x` を実行

---

## 8. 非交渉要件（K1-K15）

以下はQuality Harness v1においていかなる統合・最適化・簡素化の圧力にも屈してはならない要件である。K1-K13はv0から引き継がれ、K14-K15はv1で追加された。全て品質ハーネスパッケージに帰属する。

| # | 要件 | 根拠 |
|---|------|------|
| K1 | **4層防御モデル（L1-L4）。将来L0（FUSE）追加時は5層に拡張** | Quality Harnessの差別化要因そのもの |
| K2 | **Phase Gate** | Phase Dependency Modelに基づき、設計→設計および設計→実装の順序をコードレベルで強制 |
| K3 | **Biome AST解析** | importグラフ解析+循環依存検出。プロンプトでは代替不可能 |
| K3.5 | **@unit/@layer/@US-XXXメタデータ** | 実装ファイルに`@unit`/`@layer`、設計文書に`@US-XXX`、テストに`@story`を強制。実装→Unit→設計→US→計画の逆引きチェーンを決定論的に保証 |
| K4 | **テスト品質ルール** | AAA, actual命名, single-act, no-domain-mocking, E2E seed pattern, describe/it命名規約 |
| K5 | **DDD設計スキル群** | domain-designer等。設計方法論の核心 |
| K6 | **2-Phase Execution** | AI安全メカニズム。人間承認ゲート |
| K7 | **Document Split**（inception/product） | 一時的vs累積的の明確な分離 |
| K8 | **Cascade Updater** | 下位変更→上位設計への影響伝播 |
| K9 | **Agent-Lesson System** | 主流フレームワークに同等機能なし。独自の革新 |
| K10 | **Security/Performance検出** | ハードコード秘密、SQLインジェクション、ループ内await、N+1検出、bundleSizeLimit |
| K11 | **Drift Detection** | 設計にあるがコードにない / コードにあるが設計にない双方向検出 |
| K12 | **Consistency Checker** | 文書間レイヤー整合性チェック |
| K13 | **phasegate.config.json** | 品質設定のSingle Source of Truth（オーケストレーション設定は`orchestration.config.json`に分離） |
| K14 | **Phase Dependency Model** | 設計フェーズ間の前提条件を機械的に強制。Unit設計なしのDomain設計、テスト設計なしの実装を物理的に拒否。デフォルトフローは全PJ共通、カスタマイズは明示的override必須 |
| K15 | **Plan文書の必須生成** | Planning Modeがinteractiveであれembedded-qaであれ、全フェーズのPhase 1は`inception/`配下に`*_plan.md`を生成して完了する。plan文書なしのPhase 2移行は不可。設計判断の根拠（QAセクション）のトレーサビリティを保証 |

---

## 9. オーケストレーターとの連携接点

Quality Harnessは単独で機能するが、オーケストレーションパッケージと連携することで効果が最大化される。以下はその接点の定義。

### 9.1 インターフェース

| 接点 | Harnessが提供 | オーケストレーターが利用 |
|------|-------------|----------------------|
| **phasegate:check-ready** | 全storyのPhase Gate通過状態を返却 | Wave実行のPre-flight条件として使用 |
| **phasegate:check-phase** | 指定Unitの現在フェーズを返却 | オーケストレーターのフェーズ遷移判定に使用 |
| **phasegate:ci-check** | 全L3バリデータの実行結果を返却 | CIパイプラインのPass/Fail判定に使用 |
| **phasegate:detect-drift** | 設計-実装乖離レポートを返却 | 検証フェーズの自動実行トリガーに使用 |
| **harness:impact** | 変更影響分析レポート（Green/Amber/Gray信頼度帯域付きHarnessImpactReport）を返却 | cascade-updaterの自動更新トリガー、human reviewの要否判定に使用 |
| **phasegate:status** | ハーネス全体の健全性サマリを返却 | ダッシュボード表示・進捗判定に使用 |
| **HarnessError** | 統一エラーフォーマット（ADR参照+修正コード例付き） | エージェントの自動リトライ時のコンテキストとして注入 |
| **phasegate.config.json** | 品質設定スキーマ（品質設定のみ） | オーケストレーターがプリセット（minimal/standard/strict）を読み取り |

### 9.2 GSD-2統合ポイント

GSD-2がオーケストレーターとして動作する場合、Quality Harnessとの連携は以下のパターンとなる。

| GSD-2のパターン | Harnessが提供する品質ゲート |
|---------------|--------------------------|
| Truths/Artifacts検証 | Nyquist Validationと統合。Truthsを要件として、Artifactsをテスト成果物として検証 |
| 成果物駆動の状態導出 | `phasegate:status`が成果物の存在からハーネス検査状態を導出 |
| タスク実行前チェック | `phasegate:check-ready`がPhase Gate通過を確認 |

### 9.3 連携の原則

- **Quality Harnessはオーケストレーターに依存しない**: ハーネスコマンド群は単独で実行可能
- **オーケストレーターはQuality Harnessを迂回できない**: `phasegate:check-ready`がfalseを返す限り、実行フェーズに進めない
- **エラーの権限**: HarnessErrorの`severity: "error"`はオーケストレーターによって警告に格下げできない

---

## 10. スコープ — v1 MVH（Minimum Viable Harness）

### 10.1 v1必須機能

| 機能 | 根拠 |
|------|------|
| **ESLint→Biome全面移行**（v0 4ルール移植 + AI Antipattern検出） | Rust製で50-100倍高速。PostToolUse Hookの速度ボトルネック解消 |
| **Nyquist検証層**（requirement-test-matrix.json + test-coverage-checker拡張） | 要件→テストトレーサビリティの体系的保証 |
| **Quick Mode**（quick-implementor + ハーネス緩和ルール） | ユーザビリティ。1行修正にフルハーネスは過剰 |
| **HarnessErrorフォーマット拡充**（全バリデータにADR参照+修正コード例） | エージェント自己修正率の飛躍的向上 |
| **phasegate.config.json v2**（品質設定の整理・スキーマ確定） | 品質設定のSingle Source of Truth |
| **ADR初期作成**（10件以上）+ archgateパターン | 設計判断の根拠を機械可読に |
| **K1-K15非交渉要件の完全維持** | Core Value |
| **Go/No-Go Gate 8条件の回帰テスト整備** | リリース判定の絶対条件 |
| **リンター設定保護Hook**（.biome.json, tsconfig.json変更阻止） | 品質基盤の防衛 |
| **Stopフックテストゲート**（全テストグリーン必須） | 品質最終関門 |

**Go/No-Go Gate条件の帰属**:

旧8条件のうち、品質ハーネス側に帰属する条件:
- #4: yolo/skip-permissions不採用
- #5: 2-Phase Execution維持
- #8: デフォルトOFF

オーケストレーション側に帰属する条件:
- #1: npm非依存
- #2: .planning/不使用
- #3: 設定統一
- #6: プロジェクトローカル
- #7: /gsd:*非露出

### 10.2 将来フェーズ

| フェーズ | 機能 |
|---------|------|
| Phase 2 | AI生成コードアンチパターン検出（L1拡張）、doc-freshness-checker（L4拡張）、pointer-validator（L4拡張） |
| Phase 3 | E2Eテスト戦略テンプレート（Playwright統合） |

---

## 11. リスク

| リスク | 深刻度 | 確率 | 軽減策 |
|--------|--------|------|--------|
| Biome移行時のv0ルール互換性破損 | 高 | 中 | v0 ESLintルールの出力を回帰テストとして保存。Biome版で同一結果を保証 |
| Quick Modeの適用範囲拡大圧力（「これもQuickでいいのでは」） | 高 | 高 | Quick Mode適用条件をphasegate.config.jsonに明示。新ドメインモデル・API変更は自動拒否 |
| HarnessError fix_exampleの品質劣化 | 中 | 中 | fix_example自体をテスト資産としてバリデーション。不正な修正例はCI検出 |
| K要件の意図しない破壊（パッケージ分離時） | 高 | 中 | K要件チェックリスト必須。各機能変更時にK1-K13影響評価 |
| エージェント非依存性の形骸化（特定エージェントの機能に依存する実装） | 中 | 中 | バリデータはファイルシステムのみを見る原則を徹底。エージェント固有APIへの依存を禁止 |
| 学習曲線の増大（29スキルの理解コスト） | 中 | 高 | minimalプリセットを入口に。段階的にスキル利用を拡大 |

---

## 12. Key Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| **パッケージ分離（Quality Harness / Orchestration）** | 品質ハーネスはエージェント非依存であるべき。オーケストレーションとの結合は品質の移植性を損なう | Decided |
| **ESLint→Biome全面移行** | Rust製で50-100倍高速。v0の4カスタムルールをBiomeプラグインとして移植 | Decided |
| **K1-K13全てを品質ハーネス側に帰属** | 非交渉要件は全て品質に関するもの。オーケストレーション側に分散させない | Decided |
| **FUSE Hooks Engineはv1スコープ外** | 横断基盤として別途検討。L1-L4でCore Valueは維持可能 | Decided |
| **HarnessErrorにfix_example必須化** | AIエージェントの自己修正率がエラーメッセージの質に直結する | Decided |
| **Quick Mode適用条件の厳格な定義** | 「便利だから」で品質ゲートを緩和する圧力への防波堤 | Decided |
| **設定ファイル分離（phasegate.config.json / orchestration.config.json）** | パッケージ分離に伴い、品質設定とオーケストレーション設定を別ファイルに完全分離。ownershipの曖昧さを排除 | Decided |
| **GSD-2 Truths/Artifacts検証パターンのNyquist統合** | 概念的に同一の検証（要件→成果物トレーサビリティ）を二重実装しない | Decided |
| **成果物駆動の状態導出をハーネス検査状態管理に応用** | GSD-2の優れたパターンを品質ハーネスの文脈で再利用 | Decided |
| **バリデータ無限ループ防止（GSD-2スタック検出の応用）** | 同一HarnessErrorの繰り返し検出時に自動エスカレーション | Decided |
| **L0（FUSE）をv1スコープ外としたためK1を一時的に4層として定義。FUSE導入時にL0を追加し5層に復帰する** | K1の4層→5層拡張パスを明示し、将来のFUSE統合を阻害しない | Decided |

---

*Last updated: 2026-03-11 — パッケージ分離に伴うQuality Harness専用Product Overview初版*
*2026-07-05 — #10 スタック検出を実装反映で Decided に更新（ci-governance H13-02 実装済み）*
