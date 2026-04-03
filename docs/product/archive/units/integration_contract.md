# 統合契約（Integration Contract）

> **作成日**: 2026-03-10
> **Unit数**: 13
> **ストーリー数**: 55

---

## 1. 技術スタック概要

| 層 | 技術 | 備考 |
|----|------|------|
| 言語 | TypeScript | v0継承 |
| リンター/フォーマッター | Biome | v0 ESLintから移行（E-11） |
| テストフレームワーク | Vitest | v0継承 |
| パッケージマネージャ | pnpm | v0継承 |
| CI/CD | GitHub Actions | v0継承（aidlc-gate.yml） |
| ファイルシステム | FUSE-T (macOS) / libfuse (Linux) | v1新規（E-12、オプショナル） |
| 設定ファイル | phasegate.config.json (JSON) | Single Source of Truth（K13） |
| フック定義 | .harness-hooks.yml (YAML) | v1新規（E-12） |
| Git Hooks | Claude Code Hooks / Husky | v0継承 + v1拡張 |

---

## 2. 依存関係図

```
Wave 1（基盤構築）─── 依存先なし
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌───────────────────┐  ┌──────────────────┐  ┌──────────┐ │
│  │ config-foundation │  │ adr-documentation│  │  biome-  │ │
│  │  US-027~030       │  │  US-020~022      │  │toolchain │ │
│  │  (4 stories)      │  │  (3 stories)     │  │US-036~039│ │
│  └────────┬──────────┘  └────────┬─────────┘  │(4 stories│ │
│           │                      │             └────┬─────┘ │
└───────────┼──────────────────────┼──────────────────┼───────┘
            │                      │                  │
Wave 2（コア品質機構）             │                  │
┌───────────┼──────────────────────┼──────────────────┼───────┐
│           ▼                      │                  │       │
│  ┌───────────────────┐           │    ┌─────────────┘       │
│  │ context-           │           │    │                     │
│  │ engineering        │           │    │  ┌──────────────┐   │
│  │ US-001~004         │           │    │  │ nyquist-     │   │
│  │ (4 stories)        │           │    │  │ validation   │   │
│  └───────────────────┘           │    │  │ US-005~009   │   │
│                                  │    │  │ (5 stories)  │   │
│  ┌───────────────────┐           │    │  └──────┬───────┘   │
│  │ quality-hooks     │           │    │         │           │
│  │ US-016~019        │           │    │         │           │
│  │ (4 stories)       │           │    │         │           │
│  └────────┬──────────┘           │    │         │           │
│           │                      │    │         │           │
└───────────┼──────────────────────┼────┼─────────┼───────────┘
            │                      │    │         │
Wave 3（拡張機能）                 │    │         │
┌───────────┼──────────────────────┼────┼─────────┼───────────┐
│           │                      ▼    │         ▼           │
│  ┌────────────────┐  ┌──────────────┐ │ ┌──────────────┐   │
│  │ session-       │  │ harness-dx   │ │ │ skill-       │   │
│  │ lifecycle      │  │ US-034~035   │ │ │ enhancement  │   │
│  │ US-013~015,    │  │ (2 stories)  │ │ │ US-045~047   │   │
│  │ US-023~026     │  └──────────────┘ │ │ (3 stories)  │   │
│  │ (7 stories)    │                   │ │              │   │
│  └────────────────┘                   │ └──────────────┘   │
│  ┌────────────────┐                   │                     │
│  │ quick-mode     │                   │                     │
│  │ US-010~012     │                   │                     │
│  │ (3 stories)    │                   │                     │
│  └────────────────┘                   │                     │
│  ┌────────────────────┐               │                     │
│  │ orchestration-     │◀──────────────┘                     │
│  │ commands           │  (skill-enhancement完了後)           │
│  │ US-050~054         │                                     │
│  │ (5 stories)        │                                     │
│  └────────────────────┘                                     │
└─────────────────────────────────────────────────────────────┘
                                        │
Wave 4（高度機能）                      │
┌───────────────────────────────────────┼─────────────────────┐
│           ▼                           ▼                     │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ fuse-hooks-      │  │ regression-      │                 │
│  │ engine           │  │ suite            │                 │
│  │ US-040~044       │  │ US-031~033,      │                 │
│  │ (5 stories)      │  │ US-048~049,055   │                 │
│  └──────────────────┘  │ (6 stories)      │                 │
│                        └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘

※ orchestration-commands (US-050~054, Wave 3) は skill-enhancement
  完了後に着手。依存関係図は unit_design_plan.md を参照。
```

---

## 3. 公開APIエンドポイント（CLIコマンド）

### 3.1 ハーネスCLIコマンド

| コマンド | 提供Unit | 説明 |
|---------|---------|------|
| `phasegate:enable` / `phasegate:disable` | config-foundation | GSD由来機能の個別有効/無効化 |
| `phasegate:migrate-config` | config-foundation | v1→v2設定マイグレーション |
| `phasegate:impact-analysis US-XXX` | nyquist-validation | 変更影響テストケース特定 |
| `harness:quick-check` | quick-mode | Quick Mode用最小バリデーション |
| `harness:resume` | session-lifecycle | セッション状態復元 |
| `harness:pause` | session-lifecycle | セッション状態保存 |
| `harness:progress` | session-lifecycle | 進捗可視化 |
| `harness:audit-milestone` | session-lifecycle | マイルストーン完了時監査 |
| `harness:complete` | fuse-hooks-engine | 完了ゲート（FUSE利用時） |

### 3.2 オーケストレーションコマンド（SKILL.md定義）

| コマンド | 提供Unit | 説明 |
|---------|---------|------|
| `/gsdlc:init-project` | orchestration-commands | Phase 0: product-architect→story-writer→unit-designer→story-mapper逐次実行 |
| `/gsdlc:design <unit>` | orchestration-commands | Phase 1: domain-designer→logical-designer→test-designers→uiux-designer→readiness-checker |
| `/gsdlc:plan <unit>` | orchestration-commands | Phase 2: implementation-planner→Plan-Check Loop→Nyquist Validation |
| `/gsdlc:execute <unit>` | orchestration-commands | Phase 3: pre-flight→story-implementor→post-wave（v1単一executor） |
| `/gsdlc:verify <unit>` | orchestration-commands | Phase 4: consistency→drift→coverage→cascade→lesson→状態更新 |

### 3.3 既存CLIコマンド（変更なし）

```
phasegate:status, phasegate:init, phasegate:check-phase, phasegate:check-ready,
phasegate:ci-check, phasegate:detect-drift, phasegate:collect-lessons,
phasegate:detect-dead-code
```

---

## 4. 共通データフォーマット

### 4.1 HarnessError（統一エラーフォーマット）

```typescript
interface HarnessError {
  code: string;           // e.g., "PHASE_GATE_VIOLATION"
  severity: "error" | "warning";
  suggestion: string;     // 修正方法の提案
  adr_ref: string;        // e.g., "docs/ADR/001-phase-gate.md"
  fix_example: string;    // 修正コード例
}
```

**提供Unit**: harness-dx
**利用Unit**: 全Unit（バリデータ出力）

### 4.2 phasegate.config.json v2

```typescript
interface HarnessConfigV2 {
  // v1既存（継承）
  project: ProjectConfig;
  layers: LayerConfig;
  harnesses: HarnessConfig;
  paths: PathsConfig;
  reporting: ReportingConfig;

  // v2新規（GSD統合）
  orchestration: {
    mode: string;
    parallelization: ParallelizationConfig;
    modelProfile: ModelProfileConfig;
    contextStrategy: ContextStrategyConfig;
    commitStrategy: CommitStrategyConfig;
    workflow: WorkflowConfig;
  };
  session: {
    stateFile: string;    // default: ".harness/session-state.json"
    roadmapFile: string;
  };
  quick_mode: {
    targetConditions: string[];
    excludeConditions: string[];
    validators: string[];
  };
}
```

**提供Unit**: config-foundation
**利用Unit**: 全Unit

### 4.3 requirement-test-matrix.json

```typescript
interface RequirementTestMatrix {
  stories: {
    storyId: string;      // e.g., "US-001"
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

**提供Unit**: nyquist-validation
**利用Unit**: skill-enhancement（test-coverage-checker、implementation-readiness-checker）

### 4.4 session-state.json

```typescript
interface SessionState {
  currentSkill: string;
  targetUnit: string;
  targetStory: string;
  completedSteps: string[];
  nextAction: string;
  memo: string;
  updatedAt: string;      // ISO 8601
}
```

**提供Unit**: session-lifecycle
**利用Unit**: quality-hooks（Stop Hook連携）

### 4.5 milestones.json / state.json

```typescript
interface Milestones {
  milestones: {
    name: string;
    storyIds: string[];
    completionCriteria: string;
  }[];
}

interface ProjectState {
  currentPhase: string;
  completedStories: string[];
  inProgressStories: string[];
  remainingWork: string[];
}
```

**提供Unit**: session-lifecycle

### 4.6 context-priority.json

**配置先**: `.harness/context-priority.json`

```typescript
interface ContextPriority {
  files: {
    path: string;
    priority: "critical" | "important" | "reference" | "archive";
  }[];
}
```

**提供Unit**: context-engineering
**利用Unit**: skill-enhancement、fuse-hooks-engine

### 4.7 .harness-hooks.yml

```yaml
hooks:
  - type: PreWrite | PostWrite | PreRead | PreBash | OnComplete
    pattern: "glob pattern"
    action: block | allow | run
    command: "optional command to run"
    message: "optional block message"
```

**提供Unit**: fuse-hooks-engine

### 4.8 ADRフロントマター

```yaml
---
title: "ADR title"
status: Proposed | Accepted | Deprecated | Superseded
date: "YYYY-MM-DD"
superseded_by: "optional ADR reference"
---
```

**提供Unit**: adr-documentation
**利用Unit**: harness-dx（adr_ref参照先）

---

## 5. 認証認可

Phasegateはローカル開発ツールキットであり、認証認可機構は持たない。

- **ファイルアクセス制御**: FUSE Hooks Engineによる物理的なファイルI/Oインターセプション（L0）
- **コマンド制御**: Claude Code deny-check.sh / シェルラッパーによる破壊的コマンドブロック
- **設定変更制御**: PreToolUse Hookによるリンター設定ファイル保護
- **プロジェクトローカル**: `~/.claude/`へのグローバルインストール不可（Go/No-Go Gate #6）

---

## 6. マッピング・Wave計画・進捗管理

ストーリー→Unit所属マッピング、Wave実行順序と依存制約、設計ステップ進捗、非交渉要件（K1-K13）との整合は以下を参照:

→ **[user_story_mapping.md](../user_story_mapping.md)**
