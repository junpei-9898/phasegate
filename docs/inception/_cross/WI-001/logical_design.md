# ISSUE-001 論理設計: inception側フェーズゲート整備

## 1. 問題の本質

現在のフェーズゲートは Level 3 成果物（story固有のinception docs）を `required: false` として定義している。これは storyId が未指定の場合にプレースホルダー `{storyId}` を解決できないための措置だが、**storyId が指定されている場合でも成果物の存在チェックをスキップしてしまう**。

結果として、inception 内の設計プロセス順序（`logical_design.md` → `scenario_test_design.md` → `tdd_implementation_plan.md`）が物理的に強制されず、設計をスキップして実装計画を作成できる。

## 2. 対策の方針

### 2.1 product docs ハブモデルの維持

ソースファイルのフェーズゲートは **product docs（Unit単位）との紐付けのみ** で判定する。ソースファイルに US/issue ID を紐付けない。

```
docs/inception/{unit}/{work-item}/   一時設計（作業単位ごと）
        ↓ 設計成果物の反映
docs/product/construction/{unit}/    正式設計（Unitの真実のソース、累積更新）
        ↕ フェーズゲート（現行通り）
scripts/harness/{unit}/*.ts          実装ファイル
```

### 2.2 inception 内部の設計順序強制

inception 内で work-item（US or issue）の設計文書を作成する際、同一 work-item 内の前提文書が存在するかをフェーズゲートでチェックする。

**例**: `docs/inception/agent-integration/H11-05/tdd_implementation_plan.md` を書こうとした場合:
- `docs/inception/agent-integration/H11-05/logical_design.md` が存在するか → **チェック**
- `docs/inception/agent-integration/H11-05/scenario_test_design.md` が存在するか → **チェック**
- これらが存在しなければ → **ブロック**

### 2.3 issue の管理構造追加

US と同等の設計プロセスを issue にも適用する。

## 3. 変更対象と設計

### 3.1 phase-dependency-model: 成果物のコンテキスト依存 required 化

**対象ファイル**: `scripts/harness/phase-dependency-model/domain/models/phase-structure.ts`

**現状の問題**:
```typescript
// default-phase-nodes.ts — Level 3 成果物は全て required: false
createNode(3, 'logical-designer', [
  { name: 'story-logical-design-plan', path: 'docs/inception/{unit}/{storyId}/logical_design_plan.md', required: false },
  { name: 'story-logical-design', path: 'docs/inception/{unit}/{storyId}/logical_design.md', required: false },
]);
```

`collectMissingArtifactBlockers()` は `node.requiredArtifacts()` のみチェックするため、`required: false` の Level 3 成果物は常にスキップされる。

**変更方針**: `checkPhaseGate()` メソッドに「スコープ解決済み成果物の存在チェック」を追加する。

```
IF storyId が提供されている:
  Level 3 ノードの全成果物に対して:
    artifact.resolve({ unitId, storyId }) でパスを解決
    解決済みパスの存在をチェック
    存在しない場合 → そのノードを「未完了」と判定
    未完了ノードに依存するノードの成果物を書こうとしている場合 → ブロック
```

**重要な設計判断**: `Artifact.required` フィールドの意味を変えない。`required: false` は「storyId 未指定時にチェック不要」という意味を維持する。新たに「スコープ解決可能な場合のコンテキスト依存チェック」を追加する。

#### 3.1.1 checkPhaseGate の変更

`checkPhaseGate()` のシグネチャに `scope` 情報を追加:

```typescript
checkPhaseGate(
  targetLevel: PhaseLevel,
  evidence: {
    artifactStatuses: ReadonlyMap<string, boolean>;  // 既存
    planEvidences: ReadonlyMap<string, PlanEvidence>; // 既存
    planningMode: PlanningMode;                       // 既存
  },
  scope?: {                                           // 新規追加
    unitId?: string;
    storyId?: string;
  },
): PhaseGateResult
```

`scope.storyId` が提供されている場合、Level 3 ノードの成果物を `resolve(scope)` でパス解決し、`artifactStatuses` から存在を確認する。

#### 3.1.2 EvidenceBundleAssembler の変更

`assembleForLevel()` で、`storyId` が提供されている場合に Level 3 成果物の解決済みパスも `ArtifactExistenceCheckerPort` でチェック対象に含める。

### 3.2 phase-dependency-model: 依存グラフの活用

**現行の依存グラフ**（default-phase-dependencies.ts）:

```
2:logical-designer → 3:logical-designer
3:logical-designer → 3:scenario-test-designer
3:scenario-test-designer → 3:scenario-test-logic-designer
3:scenario-test-logic-designer → 3:implementation-readiness-checker
3:implementation-readiness-checker → 3:story-implementor
```

この依存グラフはすでに正しい順序を定義している。問題は Level 3 成果物が `required: false` のためチェックされないこと。3.1 の変更で Level 3 成果物がコンテキスト依存でチェックされるようになれば、この依存グラフが実効的に機能する。

**追加変更不要** — 既存の依存グラフ定義をそのまま活用。

### 3.3 agent-integration: issue パスの認識

**対象ファイル**: `scripts/harness/agent-integration/domain/value-objects/write-target-scope.ts`

**現状**: `STORY_ID_PATTERN = /^[A-Z]+\d+-\d+$/` — US ID（例: `H11-01`, `HF1-06`）のみマッチ。issue ID（例: `ISSUE-001`）はマッチしない。

**変更方針**:

```typescript
// 現行（US のみ）
const STORY_ID_PATTERN = /^[A-Z]+\d+-\d+$/;

// 変更後（US + issue の work-item パターン）
const WORK_ITEM_ID_PATTERN = /^[A-Z][\w]+-\d+$/;
```

ただし、issue は `docs/inception/{unit}/issues/{ISSUE-XXX}/` のようにパス内に `issues/` セグメントが入る。`fromPath()` のマッチロジックを以下のように拡張:

```
docs/inception/{unit}/{storyId}/...              → level=3, unitId, storyId  （現行通り）
docs/inception/{unit}/issues/{issueId}/...       → level=3, unitId, storyId=issueId  （新規）
```

**設計判断**: `issueId` は内部的には `storyId` と同じフィールドで扱う。フェーズゲートの観点では US も issue も同一の work-item として扱い、同じ依存グラフ・成果物チェックを適用する。

#### 3.3.1 fromPath() の変更

inception パスマッチのロジックに `issues/` セグメントの検出を追加:

```
inceptionMatch の結果が [unitId, "issues", issueId, ...] の場合:
  → WriteTargetScope.create({ level: 3, unitId, storyId: issueId })

inceptionMatch の結果が [unitId, storyId, ...] の場合（現行通り）:
  STORY_ID_PATTERN にマッチすれば:
    → WriteTargetScope.create({ level: 3, unitId, storyId })
```

### 3.4 phase-dependency-model: CLI の変更

**対象ファイル**: `scripts/harness/main.ts` の `check-phase-gate` コマンド

**現行**: `--story` フラグで storyId を受け取り、成果物パスのプレースホルダー解決に使用。

**変更**: `scope` 情報を `CheckPhaseGateUseCase` に渡す。`--story` フラグは US ID でも issue ID でも受け付ける（work-item ID として統一）。

CLI インターフェースの変更は不要。`--story ISSUE-001` で issue のフェーズゲートチェックが実行できる。

### 3.5 folder_management_rules.md の更新

inception のディレクトリ構造に issue パスを追加:

```
inception/
├── _shared/                # 横断的な計画
├── {Unit名}/               # Unit毎の階層
│   ├── *_plan.md           # Unit全体の計画
│   ├── {US-XXX}/           # ストーリー単位の計画・設計
│   │   └── ...
│   └── issues/             # バグ・不整合の計画・設計（新規）
│       └── {ISSUE-XXX}/
│           ├── issue_description.md   # 問題の記述（起票時）
│           ├── logical_design.md      # 論理設計
│           ├── scenario_test_design.md
│           └── tdd_implementation_plan.md
└── issues/                 # 横断的な issue（複数Unitにまたがるもの）
    └── {ISSUE-XXX}/
        ├── issue_description.md
        └── logical_design.md
```

## 4. 変更しないもの

| 項目 | 理由 |
|------|------|
| ソースファイルのフェーズゲート判定ロジック | product docs ハブモデルを維持。Unit単位のチェックで十分 |
| `Artifact.required` フィールドの意味 | 既存の `required: false` は storyId 未指定時のスキップ用として維持 |
| Level 1/2 の依存グラフ | 変更不要。既に正しく機能している |
| `quick-implementor` のフェーズゲート緩和 | バグ修正等の軽微変更はフェーズゲート緩和を維持 |

## 5. 影響範囲

### 5.1 変更が必要なUnit

| Unit | 変更内容 |
|------|---------|
| phase-dependency-model | `checkPhaseGate()` にスコープ依存チェック追加、`EvidenceBundleAssembler` の拡張 |
| agent-integration | `WriteTargetScope.fromPath()` に issue パス認識を追加 |

### 5.2 変更が必要なドキュメント

| ファイル | 変更内容 |
|---------|---------|
| `docs/folder_management_rules.md` | inception に issues パスを追加 |
| `docs/product/construction/phase-dependency-model/domain_model.md` | コンテキスト依存チェックの仕様を追記 |
| `docs/product/construction/agent-integration/domain_model.md` | issue パスサポートを追記 |

## 6. 期待される動作変更

### 6.1 inception 内でのフェーズゲート

| 操作 | 変更前 | 変更後 |
|------|--------|--------|
| 新US の `tdd_implementation_plan.md` を書く（`logical_design.md` 未作成） | パス | **ブロック** |
| 新US の `logical_design.md` を書く（Level 2 product docs 存在） | パス | パス（変更なし） |
| 新US の `scenario_test_design.md` を書く（`logical_design.md` 未作成） | パス | **ブロック** |
| issue の `tdd_implementation_plan.md` を書く（`logical_design.md` 未作成） | 認識外 | **ブロック** |

### 6.2 ソースファイルのフェーズゲート（変更なし）

| 操作 | 変更前 | 変更後 |
|------|--------|--------|
| 既存Unit のソースファイル書き込み（product docs 存在） | パス | パス（変更なし） |
| 新Unit のソースファイル書き込み（product docs 不在） | ブロック | ブロック（変更なし） |

## 7. QA

### [Question] Q1: issue の設計プロセスは US と完全に同一か？

issue（バグ修正・不整合対応）でも US と同じ設計文書セット（logical_design, scenario_test_design, scenario_test_logic, tdd_implementation_plan）を要求するか？

- issue は US より軽量なケースが多い
- 全文書を必須にすると過剰な場合がある

**推奨案**: issue も US と同じフェーズゲート（依存グラフ）を適用する。ただし Level 3 成果物は既に `required: false` なので、作成しなくても直接の前提となるもの以外はブロックされない。`logical_design.md` → `tdd_implementation_plan.md` の最小パスは強制されるが、scenario_test は書かなければ依存関係に入らない。

[Answer] 推奨案を採用。issue も US と同一の依存グラフを適用する。


### [Question] Q2: 横断的 issue（`docs/inception/issues/`）のフェーズゲート

ISSUE-001 のように複数Unitにまたがる横断的 issue は `docs/inception/issues/{ISSUE-XXX}/` に配置する。この場合、unitId が不明なため、現行の WriteTargetScope では Level 2（unit 必須）にマッピングできない。

**推奨案**: `docs/inception/issues/` 配下への書き込みは `inception/_shared/` と同様に Level 1 として扱い、フェーズゲートは適用しない（横断的 issue は設計者の判断に委ねる）。Unit固有の issue のみ inception フェーズゲートを適用する。

[Answer] 推奨案を採用。横断的 issue は Level 1、Unit固有 issue のみフェーズゲート適用。


### [Question] Q3: storyId フィールドの命名

内部的に issue ID も `storyId` フィールドで扱う設計としたが、`workItemId` に改名すべきか？

**推奨案**: 既存コード・テスト・CLIフラグ（`--story`）への影響が大きいため、内部フィールド名は `storyId` のまま維持する。ドキュメントで「storyId は US ID または issue ID を格納する」と明記する。将来的に改名する場合は別issueで対応。

[Answer] 推奨案を採用。storyId のまま維持、ドキュメントで明記済み。

