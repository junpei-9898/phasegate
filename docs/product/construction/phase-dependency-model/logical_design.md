# 論理設計: phase-dependency-model

@story-id H02-01
@story-id H02-02
@story-id H02-03
@story-id H02-04
@story-id H02-05
@story-id H02-06
@story-id H02-07
> **作成日**: 2026-03-13
> **対応ストーリー**: H02-01, H02-02, H02-03, H02-04, H02-05, H02-06, H02-07
> **モード**: Unit横断設計（Phase 2）
> **前提ドキュメント**: `domain_model.md`（同ディレクトリ）, `docs/inception/phase-dependency-model/logical_design_plan.md`, `docs/product/units/phase_dependency_model_unit.md`, `docs/product/units/integration_contract.md`

---

## 1. アーキテクチャ概要

### 1.1 層構成と責務

| 層 | 責務 | 依存先 |
|----|------|--------|
| domain | 3層フェーズ構造の正規定義、Level間依存、Planning Mode意味論、カスタマイズ緩和不可制約の保持 | なし |
| application | 証跡収集、設定取得、`PhaseStructure` 実行、DTO変換、override監査の調整 | domain |
| infrastructure | ファイルシステム読取、Markdown plan解析、`HarnessConfigV2` 読取、監査ログ永続化 | application, domain |
| presentation | `phasegate:check-phase` / `phasegate:check-ready` / `phase-gate` 呼び出し向けの入力パース・出力整形 | application, domain |

### 1.2 依存方向

```text
                        ┌───────────────────────────────┐
                        │ scripts/harness/cli/*.ts      │
                        │ scripts/harness/validators/*  │
                        └───────────────┬───────────────┘
                                        │
                                        ▼
                           presentation (adapter)
                                        │
                                        ▼
                                 application
                                        │
                                        ▼
                                    domain
                                        ▲
                                        │
                                infrastructure
```

- 正規依存方向は `domain ← application ← infrastructure`, `domain ← application ← presentation`
- `domain` は外部I/Oに依存しない
- `presentation` は `domain` を参照できるが、ドメイン操作は必ず `application` 経由で行う
- `infrastructure` は `scripts/harness/shared-kernel/harness-config.ts` を通じて `HarnessConfigV2` を取得する
- H02-05以降、story reflection の filesystem adapter は `docs/inception/{unit}/{id}` に加えて `docs/inception/_cross/WI-*` を列挙する。port 名は互換維持のため `listStoryDirectories` のままだが、返却値は reflection対象ID（legacy story ID または WI ID）として扱う
- H02-06以降、`_cross/WI-*` の実在パスは `docs/inception/_cross/{storyId}/...` として解決し、frontmatter `affects` に対象Unitが含まれる場合だけreflection対象にする
- H02-07以降、`_cross/WI-*` の `legacy_id` は product 文書の旧 `@issue-id` annotation と照合され、WI反映の移行互換として扱う

### 1.3 ディレクトリ構成（全ファイル一覧）

```text
scripts/harness/
├── phase-dependency-model/
│   ├── domain/
│   │   ├── definitions/
│   │   │   ├── default-phase-dependencies.ts
│   │   │   └── default-phase-nodes.ts
│   │   ├── models/
│   │   │   └── phase-structure.ts
│   │   ├── ports/
│   │   │   ├── artifact-existence-checker-port.ts
│   │   │   ├── phase-audit-logger-port.ts
│   │   │   ├── phase-config-provider-port.ts
│   │   │   └── plan-document-reader-port.ts
│   │   └── values/
│   │       ├── artifact.ts
│   │       ├── custom-rule.ts
│   │       ├── phase-customization-policy.ts
│   │       ├── phase-dependency.ts
│   │       ├── phase-gate-result.ts
│   │       ├── phase-level.ts
│   │       ├── phase-node.ts
│   │       ├── plan-evidence.ts
│   │       └── planning-mode.ts
│   ├── application/
│   │   ├── dto/
│   │   │   ├── customization-validation-result-dto.ts
│   │   │   ├── phase-dependency-graph-dto.ts
│   │   │   ├── phase-gate-result-dto.ts
│   │   │   └── phase-info-dto.ts
│   │   ├── services/
│   │   │   ├── evidence-bundle-assembler.ts
│   │   │   ├── phase-gate-result-mapper.ts
│   │   │   └── phase-info-resolver.ts
│   │   └── usecases/
│   │       ├── build-phase-dependency-graph-usecase.ts
│   │       ├── check-phase-gate-usecase.ts
│   │       ├── get-phase-info-usecase.ts
│   │       ├── record-phase-override-audit-usecase.ts
│   │       └── validate-customization-policy-usecase.ts
│   ├── infrastructure/
│   │   ├── config/
│   │   │   └── harness-config-phase-config-provider.ts
│   │   ├── filesystem/
│   │   │   ├── file-system-artifact-existence-checker.ts
│   │   │   └── markdown-plan-document-reader.ts
│   │   └── logging/
│   │       └── phase-override-audit-logger.ts
│   └── presentation/
│       ├── cli/
│       │   ├── check-phase-command-handler.ts
│       │   └── check-ready-command-handler.ts
│       ├── presenters/
│       │   ├── phase-gate-result-presenter.ts
│       │   └── phase-info-presenter.ts
│       └── validator/
│           └── phase-gate-validator-facade.ts
├── shared-kernel/
│   └── harness-config.ts
├── cli/
│   ├── check-phase.ts
│   └── check-ready.ts
├── validators/
│   └── phase-gate.ts
└── __tests__/
    └── phase-dependency-model/
        ├── domain/
        │   ├── phase-structure.test.ts
        │   ├── phase-customization-policy.test.ts
        │   └── planning-mode.test.ts
        ├── application/
        │   ├── check-phase-gate-usecase.test.ts
        │   ├── get-phase-info-usecase.test.ts
        │   └── validate-customization-policy-usecase.test.ts
        ├── infrastructure/
        │   ├── file-system-artifact-existence-checker.test.ts
        │   ├── harness-config-phase-config-provider.test.ts
        │   ├── markdown-plan-document-reader.test.ts
        │   └── phase-override-audit-logger.test.ts
        └── presentation/
            ├── check-phase-command-handler.test.ts
            ├── check-ready-command-handler.test.ts
            └── phase-gate-validator-facade.test.ts
```

### 1.4 フェーズ構造の保持方針

- 3層フェーズ構造のノード一覧と既定依存関係は `domain/definitions/` に静的定義として保持する
- `HarnessConfigV2.phaseDependencies` は構造差し替えではなく「追加依存」と「override意図の明示」だけを扱う
- Level間依存と `story-implementor` 前のTDD最低保証は `PhaseStructure` 側のハードコード不変条件として保持する
- `PlanningMode` の正規型は本Unitが所有し、config-foundation は構造のみを所有する

---

## 2. Domain層設計

### 2.1 集約ルート: PhaseStructure

#### 2.1.1 属性一覧

| 属性 | 型 | 説明 | 必須 |
|------|-----|------|------|
| levels | `ReadonlyMap<1 \| 2 \| 3, readonly PhaseNode[]>` | Level単位に束ねたフェーズノード一覧 | Yes |
| nodeIndex | `ReadonlyMap<string, PhaseNode>` | `"{level}:{skillName}"` をキーにしたノード参照用インデックス | Yes |
| defaultDependencies | `readonly PhaseDependency[]` | 正規の3層フェーズ構造を表す既定依存 | Yes |
| effectiveDependencies | `readonly PhaseDependency[]` | `defaultDependencies` に許可済み追加依存を反映した有効DAG | Yes |
| customizationPolicy | `PhaseCustomizationPolicy` | `HarnessConfigV2.phaseDependencies` を意味論付きに昇格したポリシー | Yes |
| nonRelaxableDependencies | `readonly PhaseDependency[]` | Level間依存とTDD最低保証を表す、削除不可の依存集合 | Yes |

#### 2.1.2 PhaseNodeカタログ

各 `PhaseNode` は plan成果物と実行成果物の両方を `artifacts[]` に保持する。plan証跡の判定対象は `*_plan.md`、実行証跡の判定対象は設計文書または累積更新文書である。

**Level 1: Product全体設計**

| ノードキー | skillName | artifacts |
|-----------|-----------|-----------|
| `1:product-architect` | `product-architect` | `docs/inception/_shared/product_overview_plan.md`, `docs/product/product_overview.md` |
| `1:story-writer` | `story-writer` | `docs/inception/_shared/story_writer_plan.md`, `docs/product/user_stories.md` |
| `1:story-mapper` | `story-mapper` | `docs/inception/_shared/story_mapping_plan.md`, `docs/product/user_story_mapping.md` |
| `1:unit-designer` | `unit-designer` | `docs/inception/_shared/unit_design_plan.md`, `docs/product/units/{unit}_unit.md`, `docs/product/units/integration_contract.md` |

**Level 2: Unit横断設計**

| ノードキー | skillName | artifacts |
|-----------|-----------|-----------|
| `2:domain-designer` | `domain-designer` | `docs/inception/{unit}/domain_model_plan.md`, `docs/product/construction/{unit}/domain_model.md` |
| `2:logical-designer` | `logical-designer` | `docs/inception/{unit}/logical_design_plan.md`, `docs/product/construction/{unit}/logical_design.md` |
| `2:it-test-designer` | `it-test-designer` | `docs/inception/{unit}/it_test_design_plan.md`, `docs/product/construction/{unit}/it_test_design.md` |
| `2:unit-test-designer` | `unit-test-designer` | `docs/inception/{unit}/unit_test_design_plan.md`, `docs/product/construction/{unit}/unit_test_design.md` |
| `2:it-test-logic-designer` | `it-test-logic-designer` | `docs/inception/{unit}/it_test_logic_plan.md`, `docs/product/construction/{unit}/it_test_logic.md` |
| `2:unit-test-logic-designer` | `unit-test-logic-designer` | `docs/inception/{unit}/unit_test_logic_plan.md`, `docs/product/construction/{unit}/unit_test_logic.md` |

**Level 3: ストーリー実装**

| ノードキー | skillName | artifacts |
|-----------|-----------|-----------|
| `3:logical-designer` | `logical-designer` | `docs/inception/{unit}/{storyId}/logical_design_plan.md`, `docs/inception/{unit}/{storyId}/logical_design.md` |
| `3:scenario-test-designer` | `scenario-test-designer` | `docs/inception/{unit}/{storyId}/scenario_test_plan.md`, `docs/inception/{unit}/{storyId}/scenario_test_design.md` |
| `3:scenario-test-logic-designer` | `scenario-test-logic-designer` | `docs/inception/{unit}/{storyId}/scenario_test_logic_plan.md`, `docs/inception/{unit}/{storyId}/scenario_test_logic.md` |
| `3:implementation-readiness-checker` | `implementation-readiness-checker` | なし（前提成果物の充足で判定） |
| `3:story-implementor` | `story-implementor` | `docs/inception/{unit}/{storyId}/tdd_implementation_plan.md` |

#### 2.1.3 既定依存関係

| from | to | type | 説明 |
|------|----|------|------|
| `1:product-architect` | `1:story-writer` | requires | Product概要確定後にストーリー定義へ進む |
| `1:story-writer` | `1:story-mapper` | requires | ストーリー一覧確定後にマッピングを作る |
| `1:story-mapper` | `1:unit-designer` | requires | マッピング確定後にUnit分割を行う |
| `1:unit-designer` | `2:domain-designer` | requires | Level 2開始の非緩和依存 |
| `2:domain-designer` | `2:logical-designer` | requires | 論理設計はドメインモデルを前提とする |
| `2:domain-designer` | `2:it-test-designer` | requires | ITテスト設計はドメイン理解を前提とする |
| `2:domain-designer` | `2:unit-test-designer` | requires | 単体テスト設計はドメイン理解を前提とする |
| `2:it-test-designer` | `2:it-test-logic-designer` | requires | テストロジックはテスト設計を前提とする |
| `2:unit-test-designer` | `2:unit-test-logic-designer` | requires | テストロジックはテスト設計を前提とする |
| `2:logical-designer` | `3:logical-designer` | requires | Level 3開始の非緩和依存 |
| `2:domain-designer` | `3:logical-designer` | requires | Story固有設計もUnitドメインを前提とする |
| `3:logical-designer` | `3:scenario-test-designer` | requires | シナリオテスト設計はUS固有論理設計を前提とする |
| `3:scenario-test-designer` | `3:scenario-test-logic-designer` | requires | シナリオテストロジックは設計を前提とする |
| `2:it-test-designer` | `3:implementation-readiness-checker` | requires | UnitレベルITテスト設計が必要 |
| `2:unit-test-designer` | `3:implementation-readiness-checker` | requires | Unitレベル単体テスト設計が必要 |
| `3:scenario-test-logic-designer` | `3:implementation-readiness-checker` | requires | Storyレベルのテストロジックが必要 |
| `3:implementation-readiness-checker` | `3:story-implementor` | requires | 実装開始はreadiness pass後のみ |

#### 2.1.4 ファクトリメソッド

##### `static createDefault(policy: PhaseCustomizationPolicy): PhaseStructure`

- **入力**: `policy`
- **出力**: `PhaseStructure`
- **例外**: `InvalidCustomRuleError`, `NonRelaxableDependencyOverrideError`, `CyclicPhaseDependencyError`
- **不変条件**: INV-1, INV-2, INV-3, INV-6, INV-7

**処理フロー**:

1. `default-phase-nodes.ts` から全 `PhaseNode` をロードする
2. `default-phase-dependencies.ts` から既定依存をロードする
3. Level間依存とTDD最低保証に相当する依存を `nonRelaxableDependencies` として抽出する
4. `policy` を `applyCustomization(policy)` で適用し、有効依存集合を構築する
5. `PhaseStructure` を返却する

#### 2.1.5 メソッド一覧

##### `checkPhaseGate(targetLevel: PhaseLevel, evidence: { artifactStatuses: ReadonlyMap<string, boolean>; planEvidences: ReadonlyMap<string, PlanEvidence>; }): PhaseGateResult`

- **入力**:
  - `targetLevel`: 検証対象レベル
  - `artifactStatuses`: `artifact.path` → 存在可否
  - `planEvidences`: `nodeKey` → `PlanEvidence`
- **出力**: `PhaseGateResult`
- **例外**: `InvalidPhaseLevelError`
- **不変条件**: INV-1, INV-2, INV-4, INV-5, INV-6, INV-7

**処理フロー**:

1. `targetLevel` 未満の全ノードを列挙し、前提ノード集合を確定する
2. 各前提ノードの必須 `Artifact.required === true` を `artifactStatuses` で検証する
3. `*_plan.md` を持つノードについて `PlanEvidence.exists` を確認する
4. `PlanEvidence.qaComplete` と `PlanEvidence.planningModeMatch` を確認し、Planning Mode要件違反を収集する
5. `effectiveDependencies` に基づき、未完了ノードから対象Levelへ到達する依存違反を集計する
6. 違反があれば `passed: false` の `PhaseGateResult` を返す
7. `customizationPolicy.overrideEnabled === true` かつ追加依存が適用されている場合は `auditPayload` を組み立てる
8. 警告のみ、または違反なしなら `passed: true` の `PhaseGateResult` を返す

##### `getPhaseNodes(level: PhaseLevel): readonly PhaseNode[]`

- **入力**: `level`
- **出力**: 指定Levelの `PhaseNode[]`
- **例外**: `InvalidPhaseLevelError`

**処理フロー**:

1. `levels.get(level.value)` を取得する
2. 未登録のLevelなら `InvalidPhaseLevelError` をスローする
3. 不変配列として返却する

##### `buildDependencyGraph(): { nodes: readonly PhaseNode[]; dependencies: readonly PhaseDependency[] }`

- **入力**: なし
- **出力**: ノード一覧と有効依存の組
- **例外**: なし

**処理フロー**:

1. `nodeIndex.values()` を順序付き配列へ展開する
2. `effectiveDependencies` をそのまま返却用に束ねる
3. Application層がDTOへ変換できる最小情報のみを返す

##### `applyCustomization(policy: PhaseCustomizationPolicy): PhaseStructure`

- **入力**: `policy`
- **出力**: `policy` を反映した新しい `PhaseStructure`
- **例外**: `InvalidCustomRuleError`, `NonRelaxableDependencyOverrideError`, `CyclicPhaseDependencyError`
- **不変条件**: INV-3, INV-6, INV-7

**処理フロー**:

1. `policy.rules` の各 `CustomRule` について `targetPhase` と追加依存先が `nodeIndex` に存在するか確認する
2. 既定依存の削除要求がある場合、`overrideEnabled` の有無を確認する
3. 削除要求が `nonRelaxableDependencies` に触れる場合は `NonRelaxableDependencyOverrideError` をスローする
4. 許可された追加依存だけを `defaultDependencies` に加算する
5. 有効依存集合がDAGを維持するか巡回検査する
6. 巡回がある場合は `CyclicPhaseDependencyError` をスローする
7. 新しい `effectiveDependencies` を持つ `PhaseStructure` を返す

### 2.2 値オブジェクト群

#### 2.2.1 PhaseLevel

| 属性 | 型 | 説明 |
|------|-----|------|
| value | `1 \| 2 \| 3` | Level識別子 |

**生成ルール**:

- `1`, `2`, `3` のみ許可
- それ以外は `InvalidPhaseLevelError`

**メソッド**:

- `isHigherThan(other: PhaseLevel): boolean`
- `isPrerequisiteOf(other: PhaseLevel): boolean`
- `equals(other: PhaseLevel): boolean`

**バリデーションルール**:

- Level 1は起点、Level 3は終点である

#### 2.2.2 Artifact

| 属性 | 型 | 説明 |
|------|-----|------|
| name | string | 論理名 |
| path | string | プロジェクト相対パス。`{unit}` / `{storyId}` プレースホルダを許可 |
| required | boolean | `true` の場合のみ phase-gate 失敗要因になる |

**生成ルール**:

- `path` は `docs/` で始まるプロジェクト相対パスのみ許可
- 空文字は `InvalidArtifactPathError`

**メソッド**:

- `isPlanArtifact(): boolean`
- `resolve(scope: { unitId?: string; storyId?: string }): string`
- `equals(other: Artifact): boolean`

**バリデーションルール**:

- `required === true` の成果物は `resolve()` 後に未解決プレースホルダを残してはいけない

#### 2.2.3 PhaseNode

| 属性 | 型 | 説明 |
|------|-----|------|
| skillName | string | スキル名 |
| level | PhaseLevel | 所属Level |
| artifacts | `readonly Artifact[]` | 完了証跡となる成果物一覧 |

**生成ルール**:

- `skillName` は空文字不可
- 同一Levelで `skillName` が重複してはならない

**メソッド**:

- `nodeKey(): string`
- `planArtifacts(): readonly Artifact[]`
- `requiredArtifacts(): readonly Artifact[]`
- `equals(other: PhaseNode): boolean`

**バリデーションルール**:

- Level 3ノードで story scope が必要な成果物は `{storyId}` を含まなければならない

#### 2.2.4 PhaseDependency

| 属性 | 型 | 説明 |
|------|-----|------|
| from | PhaseNode | 前提ノード |
| to | PhaseNode | 依存先ノード |
| type | `"requires" \| "recommends"` | 依存種別 |

**生成ルール**:

- `from` と `to` が同一ノードなら `InvalidPhaseDependencyError`

**メソッド**:

- `isCrossLevel(): boolean`
- `isLevelTransition(): boolean`
- `equals(other: PhaseDependency): boolean`

**バリデーションルール**:

- `requires` 依存のみが phase-gate 失敗要因になる

#### 2.2.5 PlanningMode

| 属性 | 型 | 説明 |
|------|-----|------|
| value | `"interactive" \| "embedded-qa"` | 正規Planning Mode |

**生成ルール**:

- configからの入力は `fromConfig(value: string)` で昇格する
- 不正値は `InvalidPlanningModeError`

**メソッド**:

- `requiresAnsweredQa(): boolean`
- `requiresQaSection(): boolean`
- `equals(other: PlanningMode): boolean`

**バリデーションルール**:

- `interactive` は QAセクション存在を要求
- `embedded-qa` は QAの全回答済みを要求

#### 2.2.6 PlanEvidence

| 属性 | 型 | 説明 |
|------|-----|------|
| exists | boolean | planファイルが存在するか |
| qaComplete | boolean | QA節があり、全Qに回答が入っているか |
| planningModeMatch | boolean | 期待された `PlanningMode` 要件を満たすか |

**生成ルール**:

- `exists === false` の場合、残り2属性は `false`

**メソッド**:

- `blocksPhaseTransition(): boolean`
- `equals(other: PlanEvidence): boolean`

**バリデーションルール**:

- `planningModeMatch === true` なら `exists === true` が必要

#### 2.2.7 CustomRule

| 属性 | 型 | 説明 |
|------|-----|------|
| targetPhase | string | 追加依存を付与する対象ノードキー |
| condition | `"requires-all"` | Wave 1では固定 |
| action | `readonly string[]` | 追加要求する前提ノードキー一覧 |

**生成ルール**:

- `targetPhase` は空文字不可
- `action` は1件以上必須

**メソッド**:

- `requiredNodeKeys(): readonly string[]`
- `equals(other: CustomRule): boolean`

**バリデーションルール**:

- 削除ではなく追加依存のみを表す

#### 2.2.8 PhaseCustomizationPolicy

| 属性 | 型 | 説明 |
|------|-----|------|
| preset | `"default" \| "custom"` | config由来のプリセット識別子 |
| rules | `readonly CustomRule[]` | 追加依存ルール一覧 |
| overrideEnabled | boolean | 緩和要求を許可したい意思表示 |

**生成ルール**:

- `overrideEnabled === true` でも削除可能なのは緩和可能依存だけ

**メソッド**:

- `hasRules(): boolean`
- `requestsOverride(): boolean`
- `equals(other: PhaseCustomizationPolicy): boolean`

**バリデーションルール**:

- `preset === "default"` かつ `rules.length > 0` は許容するが、意味論上は追加依存として扱う

#### 2.2.9 PhaseGateResult

| 属性 | 型 | 説明 |
|------|-----|------|
| passed | boolean | phase-gate通過可否 |
| blockers | `readonly string[]` | 通過阻害理由 |
| warnings | `readonly string[]` | 警告一覧 |
| auditPayload | `Record<string, unknown> \| undefined` | override適用時の監査ペイロード |

**生成ルール**:

- `passed === true` でも `warnings` は保持可能
- `auditPayload` は `overrideEnabled === true` かつ追加依存適用時のみ付与

**メソッド**:

- `isBlocked(): boolean`
- `hasAuditTrail(): boolean`
- `equals(other: PhaseGateResult): boolean`

**バリデーションルール**:

- `passed === false` の場合 `blockers.length >= 1`

### 2.3 ドメインサービス

なし。

- 設計理由: `PhaseStructure` 自体が整合性境界であり、依存検証ロジックを外へ逃がすと貧血モデルになるため
- 静的定義の組み立ては `PhaseStructure.createDefault()` と `domain/definitions/` に閉じ込める

### 2.4 ドメインイベント

Wave 1ではドメインイベントは導入しない。

| 代替手段 | 保持場所 | 内容 |
|---------|---------|------|
| `auditPayload` | `PhaseGateResult` | override適用時の監査情報（scope, appliedRules, generatedAt, requestedOverride） |

### 2.5 ドメインエラー

| エラー型 | 発生条件 |
|---------|---------|
| `InvalidPhaseLevelError` | Levelが `1/2/3` 以外 |
| `InvalidPlanningModeError` | `interactive/embedded-qa` 以外のモード |
| `InvalidArtifactPathError` | 成果物パスが空、または `docs/` 配下でない |
| `InvalidPhaseDependencyError` | 自己依存または不正な依存定義 |
| `InvalidCustomRuleError` | 未知ノード参照、空の `action`、重複ルール |
| `NonRelaxableDependencyOverrideError` | Level間依存またはTDD最低保証の削除要求 |
| `CyclicPhaseDependencyError` | custom rule適用後に巡回依存が生じる |

---

## 3. Domain層ポート設計

全ポートは `domain/ports/` に配置する。`HarnessConfigV2` 全体をDomainへ露出せず、意味論に必要な最小情報だけを返す。

### 3.1 ArtifactExistenceCheckerPort

```typescript
interface ArtifactExistenceCheckerPort {
  checkAll(
    artifacts: readonly Artifact[],
    scope: { unitId?: string; storyId?: string },
  ): Promise<ReadonlyMap<string, boolean>>;
}
```

| メソッド | 入力 | 出力 | 目的 |
|---------|------|------|------|
| `checkAll` | `artifacts`, `scope` | `artifact.path -> exists` | 成果物ファイルの存在判定 |

### 3.2 PlanDocumentReaderPort

```typescript
interface PlanDocumentReaderPort {
  readEvidence(
    node: PhaseNode,
    scope: { unitId?: string; storyId?: string },
    expectedMode: PlanningMode,
  ): Promise<PlanEvidence>;
}
```

| メソッド | 入力 | 出力 | 目的 |
|---------|------|------|------|
| `readEvidence` | `node`, `scope`, `expectedMode` | `PlanEvidence` | plan文書の存在・QA充足・Planning Mode一致を返す |

### 3.3 PhaseConfigProviderPort

```typescript
interface PhaseConfigProviderPort {
  getPlanningMode(scope: { unitId?: string; storyId?: string }): Promise<PlanningMode>;
  getCustomizationPolicy(): Promise<PhaseCustomizationPolicy>;
  getReportingOutputDir(): Promise<string>;
}
```

| メソッド | 入力 | 出力 | 目的 |
|---------|------|------|------|
| `getPlanningMode` | `scope` | `PlanningMode` | default/perPhase を解決した正規モード取得 |
| `getCustomizationPolicy` | なし | `PhaseCustomizationPolicy` | `phaseDependencies` の意味論付き取得 |
| `getReportingOutputDir` | なし | `string` | 監査ログ出力先の取得 |

### 3.4 PhaseAuditLoggerPort

```typescript
interface PhaseAuditLoggerPort {
  record(payload: {
    scope: { unitId?: string; storyId?: string };
    targetLevel: 1 | 2 | 3;
    appliedRules: readonly string[];
    generatedAt: string;
    requestedOverride: boolean;
  }): Promise<void>;
}
```

| メソッド | 入力 | 出力 | 目的 |
|---------|------|------|------|
| `record` | `payload` | `Promise<void>` | override適用の監査記録 |

---

## 4. Application層設計

### 4.1 Applicationサービス

#### 4.1.1 EvidenceBundleAssembler

**責務**: scopeに応じた成果物存在結果、plan証跡、Planning Modeを収集し、`PhaseStructure.checkPhaseGate()` に渡せる束へ整形する。

**コンストラクタ依存**:

- `artifactExistenceChecker: ArtifactExistenceCheckerPort`
- `planDocumentReader: PlanDocumentReaderPort`
- `phaseConfigProvider: PhaseConfigProviderPort`

**主要メソッド**:

- `assembleForLevel(level: PhaseLevel, nodes: readonly PhaseNode[], scope: { unitId?: string; storyId?: string }): Promise<{ artifactStatuses: ReadonlyMap<string, boolean>; planEvidences: ReadonlyMap<string, PlanEvidence>; planningMode: PlanningMode; }>`

#### 4.1.2 PhaseInfoResolver

**責務**: 全ノードの証跡から current level / completed nodes / next nodes を導出する。

**コンストラクタ依存**:

- なし（純粋計算）

**主要メソッド**:

- `resolve(graph: { nodes: readonly PhaseNode[]; dependencies: readonly PhaseDependency[] }, artifactStatuses: ReadonlyMap<string, boolean>, planEvidences: ReadonlyMap<string, PlanEvidence>): PhaseInfoDto`

### 4.2 UseCase一覧

| UseCase | 対応ストーリー | 役割 |
|---------|-------------|------|
| `CheckPhaseGateUseCase` | H02-01, H02-02, H02-03 | phase-gate本体。Level前提、plan文書、Planning Mode、カスタマイズを統合判定 |
| `BuildPhaseDependencyGraphUseCase` | H02-01 | validator-system / regression-suite 向けに依存グラフを公開 |
| `GetPhaseInfoUseCase` | H02-01, H02-02 | `phasegate:check-phase` 用の現在フェーズ情報を返す |
| `ValidateCustomizationPolicyUseCase` | H02-03 | config側の phaseDependencies を意味論検証する |
| `RecordPhaseOverrideAuditUseCase` | H02-03 | override適用の監査記録を永続化する |

### 4.3 CheckPhaseGateUseCase

**責務**: 指定scopeが target level へ進めるかを判定する。

**コンストラクタ依存**:

- `phaseConfigProvider: PhaseConfigProviderPort`
- `evidenceBundleAssembler: EvidenceBundleAssembler`
- `auditLogger: PhaseAuditLoggerPort`

**入力**:

```typescript
interface CheckPhaseGateInput {
  targetLevel: 1 | 2 | 3;
  unitId?: string;
  storyId?: string;
}
```

**出力**:

```typescript
interface PhaseGateResultDto {
  passed: boolean;
  targetLevel: 1 | 2 | 3;
  blockers: string[];
  warnings: string[];
  auditRecorded: boolean;
}
```

**例外**:

- `InvalidPhaseLevelError`
- `InvalidPlanningModeError`
- `NonRelaxableDependencyOverrideError`
- `CyclicPhaseDependencyError`
- `PlanDocumentParseError`

**処理フロー**:

1. `phaseConfigProvider.getCustomizationPolicy()` を呼び出す
2. `PhaseStructure.createDefault(policy)` で集約を生成する
3. `phaseStructure.getPhaseNodes(targetLevel)` で対象Levelノードを得る
4. `evidenceBundleAssembler.assembleForLevel(...)` で証跡束を組み立てる
5. `phaseStructure.checkPhaseGate(...)` を実行する
6. `auditPayload` があれば `auditLogger.record(...)` を呼び出す
7. `PhaseGateResultDto` へ写像して返す

### 4.4 BuildPhaseDependencyGraphUseCase

**責務**: phase-dependency-model が所有する正規DAGをDTOで返す。

**コンストラクタ依存**:

- `phaseConfigProvider: PhaseConfigProviderPort`

**入力**:

```typescript
interface BuildPhaseDependencyGraphInput {
  includeArtifacts?: boolean;
}
```

**出力**:

```typescript
interface PhaseDependencyGraphDto {
  nodes: Array<{
    key: string;
    level: 1 | 2 | 3;
    skillName: string;
    artifacts?: string[];
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: "requires" | "recommends";
  }>;
}
```

**例外**:

- `NonRelaxableDependencyOverrideError`
- `CyclicPhaseDependencyError`

**処理フロー**:

1. `phaseConfigProvider.getCustomizationPolicy()` を取得する
2. `PhaseStructure.createDefault(policy)` を構築する
3. `phaseStructure.buildDependencyGraph()` を実行する
4. `includeArtifacts` 指定に応じてノードDTOへ成果物パスを載せる
5. DTOを返す

### 4.5 GetPhaseInfoUseCase

**責務**: 指定UnitまたはStoryの現在位置と次に着手可能なノードを返す。

**コンストラクタ依存**:

- `phaseConfigProvider: PhaseConfigProviderPort`
- `evidenceBundleAssembler: EvidenceBundleAssembler`
- `phaseInfoResolver: PhaseInfoResolver`

**入力**:

```typescript
interface GetPhaseInfoInput {
  unitId: string;
  storyId?: string;
}
```

**出力**:

```typescript
interface PhaseInfoDto {
  unitId: string;
  storyId?: string;
  currentLevel: 1 | 2 | 3;
  completedNodes: string[];
  nextNodes: string[];
  blockers: string[];
}
```

**例外**:

- `InvalidPlanningModeError`
- `PlanDocumentParseError`

**処理フロー**:

1. `phaseConfigProvider.getCustomizationPolicy()` を取得する
2. `PhaseStructure.createDefault(policy)` を構築する
3. 全Levelノードを対象に `evidenceBundleAssembler` で証跡を収集する
4. `phaseStructure.buildDependencyGraph()` を取得する
5. `phaseInfoResolver.resolve(...)` で `currentLevel`, `completedNodes`, `nextNodes`, `blockers` を算出する
6. `PhaseInfoDto` を返す

### 4.6 ValidateCustomizationPolicyUseCase

**責務**: `HarnessConfigV2.phaseDependencies` の意味論チェックだけを先行実行する。

**コンストラクタ依存**:

- `phaseConfigProvider: PhaseConfigProviderPort`

**入力**:

```typescript
interface ValidateCustomizationPolicyInput {}
```

**出力**:

```typescript
interface CustomizationValidationResultDto {
  valid: boolean;
  errors: string[];
  warnings: string[];
  effectiveRules: string[];
}
```

**例外**:

- `InvalidCustomRuleError`
- `NonRelaxableDependencyOverrideError`
- `CyclicPhaseDependencyError`

**処理フロー**:

1. `phaseConfigProvider.getCustomizationPolicy()` を取得する
2. `PhaseStructure.createDefault(policy)` を実行する
3. 例外が発生しなければ `valid: true` で返す
4. 緩和要求や無効ノード参照があれば `errors` / `warnings` に変換して返す

### 4.7 RecordPhaseOverrideAuditUseCase

**責務**: override適用時だけ監査記録を保存する。

**コンストラクタ依存**:

- `auditLogger: PhaseAuditLoggerPort`

**入力**:

```typescript
interface RecordPhaseOverrideAuditInput {
  scope: { unitId?: string; storyId?: string };
  targetLevel: 1 | 2 | 3;
  appliedRules: string[];
  requestedOverride: boolean;
}
```

**出力**: `void`

**例外**:

- `AuditLogWriteError`

**処理フロー**:

1. `generatedAt` をISO8601で生成する
2. `auditLogger.record(...)` を呼び出す
3. 失敗時は `AuditLogWriteError` として上位へ送出する

---

## 5. Infrastructure層設計

### 5.1 FileSystemArtifactExistenceChecker

**実装ポート**: `ArtifactExistenceCheckerPort`

**利用ライブラリ**: `node:fs/promises`, `node:path`

**実装方針**:

- `Artifact.resolve(scope)` でプレースホルダを実パスへ置換する
- プロジェクトルート基準で絶対パスへ解決し、`fs.access()` で存在判定する
- 返却Mapのキーは元の `artifact.path` ではなく解決済みパス文字列とする
- キャッシュは持たず、実行時点のファイルシステムをそのまま見る

**設計上の注意点**:

- `storyId` が必要な成果物で未指定なら `false` を返し、Application層で blocker 化する
- `required === false` の成果物は Map に含めるが、Domain側で blocker 判定対象から外す

### 5.2 MarkdownPlanDocumentReader

**実装ポート**: `PlanDocumentReaderPort`

**利用ライブラリ**: `node:fs/promises`

**実装方針**:

- `node.planArtifacts()` の先頭を対象 plan とみなし、存在しなければ `PlanEvidence(false, false, false)` を返す
- Markdown全文を軽量に読み、`## QA` または `## QA（設計判断の根拠）` 見出しを検索する
- QA節内の `- Q:` / `A:` ペア数を数える
- `qaComplete` は `questionCount >= 1` かつ全ての `A:` が非空である場合のみ `true`
- `planningModeMatch` は `interactive` なら `qaSectionExists`、`embedded-qa` なら `qaComplete`

**設計上の注意点**:

- Markdown ASTライブラリは導入しない。Wave 1では見出しとQ/A対抽出だけを扱う
- `## 承認` は読み飛ばす。承認そのものの意味論はWave 1では本Unitの判定対象外
- 見出しが壊れていても例外ではなく `PlanEvidence(exists=true, qaComplete=false, planningModeMatch=false)` を返す

### 5.3 HarnessConfigPhaseConfigProvider

**実装ポート**: `PhaseConfigProviderPort`

**依存**:

- `scripts/harness/shared-kernel/harness-config.ts` が公開する `HarnessConfigV2` ローダ

**実装方針**:

- 設定取得は必ず `shared-kernel/harness-config.ts` を経由し、旧 `core/config-loader.ts` を直接参照しない
- `planningMode.default` と `planningMode.perPhase` を読んで scopeごとの有効モードを解決する
- `phaseDependencies.customRules[]` を `CustomRule` に正規化する
- `reporting.outputDir` を監査ログ出力先として返す

**マッピング規則**:

| `HarnessConfigV2` | Domain型 |
|------------------|---------|
| `planningMode.default` | `PlanningMode` |
| `planningMode.perPhase["{level}:{skillName}"]` | `PlanningMode` |
| `phaseDependencies.preset` | `PhaseCustomizationPolicy.preset` |
| `phaseDependencies.override` | `PhaseCustomizationPolicy.overrideEnabled` |
| `phaseDependencies.customRules[].phase` | `CustomRule.targetPhase` |
| `phaseDependencies.customRules[].requires[]` | `CustomRule.action` |

**設計上の注意点**:

- unknown phase名の検証はDomain側で実施する
- Quick Modeの `relaxedGates` は読むが、Level間依存とTDD最低保証を緩和する情報としては解釈しない

### 5.4 PhaseOverrideAuditLogger

**実装ポート**: `PhaseAuditLoggerPort`

**利用ライブラリ**: `node:fs/promises`, `node:path`

**実装方針**:

- 出力先は `${reporting.outputDir}/phase-override-audit.jsonl`
- 1行1JSONで append する
- payloadには `scope`, `targetLevel`, `appliedRules`, `generatedAt`, `requestedOverride` をそのまま保存する

**設計上の注意点**:

- 監査ログ書込失敗は黙殺しない。Application層へ例外送出する
- CLI表示用の人間可読メッセージ生成はPresentation層が担う

---

## 6. Presentation層設計

本UnitはCLIコマンドの所有者ではない。`scripts/harness/cli/check-phase.ts`、`scripts/harness/cli/check-ready.ts`、`scripts/harness/validators/phase-gate.ts` から呼ばれる「ハンドラ中核」を `presentation/` に持つ。

### 6.1 CheckPhaseCommandHandler

**責務**: `phasegate:check-phase` 向けに `GetPhaseInfoUseCase` を呼び出し、CLI/JSON応答を組み立てる。

**想定引数**:

| 引数 | 必須 | 説明 |
|------|------|------|
| `<unit>` | Yes | Unit名 |
| `--story <HXX-XX>` | No | Story単位で現在位置を絞り込む |
| `--json` | No | `HarnessApiResponse<PhaseInfoDto>` 形式で出力 |

**処理**:

1. 引数を parse して `GetPhaseInfoInput` を構築する
2. `GetPhaseInfoUseCase.execute()` を呼び出す
3. `PhaseInfoPresenter` で text / JSON のどちらかへ整形する
4. stdout へ出力する

**終了コード**:

| コード | 条件 |
|--------|------|
| 0 | 正常に `PhaseInfoDto` を返却 |
| 1 | 指定UnitまたはStoryが存在しない |
| 2 | 設定取得失敗、plan解析失敗、予期しない例外 |

### 6.2 CheckReadyCommandHandler

**責務**: `phasegate:check-ready` 向けに target level 3 の readiness を返す。

**想定引数**:

| 引数 | 必須 | 説明 |
|------|------|------|
| `--unit <unit>` | No | Unit単位で絞り込み |
| `--story <HXX-XX>` | No | Story単位で絞り込み |
| `--json` | No | `HarnessApiResponse<PhaseGateResultDto[]>` 形式で出力 |

**処理**:

1. 対象scope一覧を構築する
2. 各scopeに対して `CheckPhaseGateUseCase.execute({ targetLevel: 3, ...scope })` を実行する
3. 1件でも `passed === false` があれば fail 扱いにする
4. `PhaseGateResultPresenter` で出力整形する

**終了コード**:

| コード | 条件 |
|--------|------|
| 0 | 対象scopeがすべて ready |
| 1 | 対象scopeに未充足がある、または対象未検出 |
| 2 | 設定取得失敗、監査ログ失敗、予期しない例外 |

### 6.3 PhaseGateValidatorFacade

**責務**: validator-system の `phase-gate` 実行口から `CheckPhaseGateUseCase` を利用しやすくする。

**入力**:

- `changedFiles: string[]`
- `unitId?: string`
- `storyId?: string`

**処理**:

1. metadata解析済みの scope を受け取る
2. `targetLevel` を `storyId` の有無で `3` または `2` に決定する
3. `CheckPhaseGateUseCase` を実行する
4. 失敗時のみ `HarnessError[]` へ変換する

---

## 7. テスト方針

### 7.1 テスト対象 × レイヤー

| テスト対象 | ユニットテスト | インテグレーションテスト |
|-----------|:--------------:|:------------------------:|
| `PhaseStructure` | ○ | — |
| 値オブジェクト群 | ○ | — |
| `CheckPhaseGateUseCase` | ○ | — |
| `BuildPhaseDependencyGraphUseCase` | ○ | — |
| `GetPhaseInfoUseCase` | ○ | — |
| `ValidateCustomizationPolicyUseCase` | ○ | — |
| `FileSystemArtifactExistenceChecker` | ○ | ○ |
| `MarkdownPlanDocumentReader` | ○ | ○ |
| `HarnessConfigPhaseConfigProvider` | ○ | ○ |
| `PhaseOverrideAuditLogger` | ○ | ○ |
| `CheckPhaseCommandHandler` | ○ | — |
| `CheckReadyCommandHandler` | ○ | — |
| `PhaseGateValidatorFacade` | ○ | — |

### 7.2 Domain層テスト方針

- `PhaseStructure` の不変条件を最優先で検証する
- Level間依存の削除要求、TDD最低保証の削除要求、巡回依存生成をすべて拒否することを確認する
- `PlanningMode` ごとに `PlanEvidence` の判定が変わることを検証する
- Domain層ではモックを使わず、値オブジェクトと集約は実体で検証する

**主なテストケース**:

- `interactive` で QA節が欠落している場合に gate が失敗する
- `embedded-qa` で未回答Qがある場合に gate が失敗する
- Level 1未完了の状態で Level 2 を開始しようとすると失敗する
- `story-implementor` 前の readiness 依存を緩和しようとすると失敗する
- custom rule による追加依存は許可される

### 7.3 Application層テスト方針

- PortのみFake/Stub化し、Domainは実体を使用する
- `CheckPhaseGateUseCase` で Port呼び出し順序、監査ログ分離、DTO変換を検証する
- `GetPhaseInfoUseCase` で completed / next / blockers 算出を検証する
- `ValidateCustomizationPolicyUseCase` で Domain例外がDTOへ正しく変換されることを検証する

### 7.4 Infrastructure層テスト方針

- `MarkdownPlanDocumentReader` は実ファイルを使って QA節検出、Q/A抽出、モード別判定を検証する
- `HarnessConfigPhaseConfigProvider` は `HarnessConfigV2` fixture から `PlanningMode` と `PhaseCustomizationPolicy` への変換を検証する
- `PhaseOverrideAuditLogger` は一時ディレクトリに JSONL が正しく追記されることを検証する

### 7.5 Presentation層テスト方針

- `process.argv` 相当の引数配列を渡して parse 結果を検証する
- text / JSON の両出力形式を検証する
- `check-ready` が1件でも未充足なら exit code `1` を返すことを検証する
- `phase-gate` facade が failure 時のみ `HarnessError[]` を返すことを検証する

### 7.6 テスト規約適用

- テストケース名は全て日本語
- AAAパターンで記述する
- 実行結果は `actual` に代入する
- `target` / `describe` / `context` / `it` の構造を使う
- Domain層の概念はモックしない。Portのみテストダブル化する

---

## 8. ストーリー対応

### H02-01: フェーズ依存グラフ定義

| 要素 | 設計反映箇所 |
|------|-------------|
| 3層フェーズ構造の静的定義 | `domain/definitions/default-phase-nodes.ts`, `default-phase-dependencies.ts` |
| phase-gate判定 | `PhaseStructure.checkPhaseGate()` |
| graph公開 | `BuildPhaseDependencyGraphUseCase` |
| current phase算出 | `GetPhaseInfoUseCase`, `PhaseInfoResolver` |

### H02-02: 依存検証サービス

| 要素 | 設計反映箇所 |
|------|-------------|
| Planning Mode正規型 | `PlanningMode` |
| plan文書必須 | `Artifact` による `*_plan.md` 定義 |
| QA充足判定 | `PlanEvidence`, `MarkdownPlanDocumentReader` |
| phase-gateへの統合 | `EvidenceBundleAssembler`, `CheckPhaseGateUseCase` |

### H02-03: フェーズ遷移制御

| 要素 | 設計反映箇所 |
|------|-------------|
| `phaseDependencies` 解釈 | `PhaseCustomizationPolicy`, `CustomRule` |
| 緩和不可制約 | `nonRelaxableDependencies`, `applyCustomization()` |
| override監査 | `PhaseGateResult.auditPayload`, `RecordPhaseOverrideAuditUseCase`, `PhaseOverrideAuditLogger` |

---

## 9. 実装変更記録（Wave 2A）

### 9.1 Composition Root `defaultPhaseConfig` の planningMode 修正

**変更日**: 2026-03-22
**変更理由**: `createPhaseDependencyModelModule()` の `defaultPhaseConfig.planningMode` が `'standard'`（無効値）にハードコードされていた。有効値は `'interactive' | 'embedded-qa'` のみであり、デフォルト呼び出し時に `InvalidPlanningModeError` がスローされ、`phasegate:check-phase` / `phasegate:check-ready` が全件エラーになっていた。

**変更内容**: `planningMode: 'standard'` → `planningMode: 'interactive'` に修正（`phasegate.config.json` の `planningMode.default: 'interactive'` と一致させた）

**影響ファイル**: `scripts/harness/phase-dependency-model/composition-root.ts`

---

## 10. Phase B 拡張: Configurable Gates（configurable_phase_gate_plan）

> **追加日**: 2026-04-05
> **対応計画書**: `docs/inception/_shared/configurable_phase_gate_plan.md` §5 / B-2〜B-4
> **前提**: `domain_model.md` §11

### 10.1 ディレクトリ追加

```text
scripts/harness/phase-dependency-model/
├── domain/
│   ├── values/
│   │   ├── gate-definition.ts            # GateDefinition VO（INV-10 検証）
│   │   ├── gate-name.ts                  # GateName VO（^[a-z][a-z0-9-]*$ 検証）
│   │   └── gate-story-annotation.ts      # GateStoryAnnotation VO
│   ├── services/
│   │   └── gate-graph.ts                 # GateGraph ドメインサービス（INV-11〜14 検証）
│   └── ports/
│       └── glob-matcher-port.ts          # GlobMatcherPort インターフェース
├── application/
│   └── usecases/
│       └── resolve-gate-usecase.ts       # ResolveGateUseCase（B-3-1）
└── infrastructure/
    ├── adapters/
    │   └── picomatch-glob-matcher.ts     # GlobMatcherPort の picomatch 実装
    └── config/
        └── custom-gates-config-parser.ts # gates[] パース + JSON Schema 検証
```

### 10.2 Domain層拡張

**GateDefinition**（`domain/values/gate-definition.ts`）:
- コンストラクタで INV-10 を検証: `storyAnnotation` を持つ場合 `level === 3` を強制、違反時 `InvalidGateDefinitionError` をスロー
- `requires`/`blocks`/`dependsOn` は `readonly` 配列として凍結
- ファクトリ: `GateDefinition.fromRaw(raw: unknown): GateDefinition`（infrastructure の生 JSON を受け入れる）

**GateGraph**（`domain/services/gate-graph.ts`）:
- `GateGraph.build(gates: GateDefinition[]): GateGraph` — 構築時に INV-11〜14 を検証し、失敗時 `GateGraphValidationError` をスロー（詳細に全違反を集約）
- `detectCycles(): GateName[][]` — Tarjan の強連結成分アルゴリズムで循環検出
- `validateLevelOrder()` — `dependsOn` 参照先の `level <= self.level` を保証
- `resolveAncestors(name): GateName[]` — トポロジカル順で先祖ゲートを返す（`ResolveGateUseCase` から使用）

**PhaseStructure 拡張**:
- 新ファクトリ `PhaseStructure.fromGates(gates: GateDefinition[], policy: PhaseCustomizationPolicy): PhaseStructure`
- 既存の `fromPresetRules()` 経路は維持し、`policy.preset === 'custom'` のときのみ新経路を使う
- 既存 INV-1〜9 は新経路でも同じく適用（`GateDefinition → PhaseNode` 変換後の検証は従来通り）

### 10.3 Application層拡張

**ResolveGateUseCase**（`application/usecases/resolve-gate-usecase.ts`）:

入力:
- `targetPath: string` — Write 対象ファイルパス
- `gates: GateDefinition[]` — custom プリセットの全ゲート
- `scope?: Scope` — storyId/unitId

出力:
- `ResolveGateResult { matchedGates: GateDefinition[], missingRequirements: Requirement[], auditPayload }`

フロー:
1. `GlobMatcherPort.match(gate.blocks[i], targetPath)` で該当ゲートを抽出
2. 該当ゲートに対し `GateGraph.resolveAncestors()` で先行ゲートを取得
3. 先行ゲート + 該当ゲートの `requires[]` を `ArtifactExistenceCheckerPort.exists()` でチェック
4. 未充足項目を `missingRequirements[]` に集約して返す

**HandlePreToolUseUseCase 統合**:
- `config.phaseDependencies.preset === 'custom'` の分岐で `ResolveGateUseCase` を呼び出す
- 既存プリセット時は従来の `CheckPhaseGateUseCase` 経路を維持（後方互換）
- ブロック判定結果は既存の `HarnessError` メッセージフォーマットに統合（ユーザー体験の一貫性）

### 10.4 Infrastructure層拡張

**PicomatchGlobMatcher**（`infrastructure/adapters/picomatch-glob-matcher.ts`）:
- `GlobMatcherPort` の実装。`picomatch(pattern, { dot: true })(path)` で判定
- `picomatch` はモジュールロード時に 1 回だけコンパイル、LRU キャッシュで再利用
- `dependencies`（devDependencies ではなく）に `"picomatch": "^4.0.0"` を追加

**CustomGatesConfigParser**（`infrastructure/config/custom-gates-config-parser.ts`）:
- `HarnessConfigV2.phaseDependencies.gates[]` を AJV（draft-07）で検証
- JSON Schema は `scripts/harness/config-foundation/infrastructure/schemas/harness-config-v2.schema.json` の `gates` 定義を参照（config-foundation と協調）
- 検証通過後 `GateDefinition.fromRaw()` で VO 化、`GateGraph.build()` で DAG 検証
- 検証失敗時は `InvalidCustomGatesConfigError` を throw し、起動時エラーとしてユーザーに提示

**L2-002 統合**（B-4-3）:
- `ValidateDesignStoryAnnotationsUseCase` は `GateDefinition.storyAnnotation` を新規入力として受け取る
- 従来のハードコード `level-3-story-annotation.rule.ts` ロジックは、`custom` プリセット時は `gate.storyAnnotation.tag` でオーバーライド可能
- `required: false` の annotation は警告のみ（既存の緩和ルール準拠）

### 10.5 テスト方針（B-5）

| テスト | 層 | 観点 |
|--------|-----|------|
| `gate-definition.test.ts` | Domain | INV-10（storyAnnotation + level !== 3 で throw）、kebab-case 検証、空 blocks 許容 |
| `gate-graph.test.ts` | Domain | 循環検出（自己ループ / 2ノード循環 / 長鎖循環）、レベル逆行検出、未知 dependsOn 検出、重複 name 検出、正常系 DAG |
| `resolve-gate-usecase.test.ts` | Application | 単一 glob マッチ、複数 glob マッチ、dependsOn 解決、requires 欠損時の missingRequirements、scope プレースホルダ解決 |
| `picomatch-glob-matcher.test.ts` | Infrastructure | `**/*.ts` / `scripts/harness/**/*.ts` / 否定パターンなど代表的パターン |
| `custom-gates-config-parser.test.ts` | Infrastructure | JSON Schema 違反、DAG 違反、正常系 |
| `custom-preset.e2e.test.ts` | E2E | config 定義 → ファイル書き込み要求 → ブロック/許可の end-to-end |

### 10.6 バックワード互換性

- 既存の `full` / `standard` / `minimal` プリセット利用者は `gates[]` を定義しないため、新経路は発火しない
- `PhaseStructure.fromPresetRules()` は既存テストと同じ挙動を維持
- `custom` プリセット利用者のみ `gates[]` を定義する必要がある（スキーマで `custom` 時 `gates[]` を required にするかは B-4-1 で決定）
