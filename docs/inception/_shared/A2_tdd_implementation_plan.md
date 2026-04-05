# TDD実装計画: A-2 ドメイン層の実装

## 1. スコープ

configurable_phase_gate_plan.md の A-2 タスク群。4 Unit にまたがるドメイン層変更。

**対象 Unit:**
- `phase-dependency-model` — プリセット拡張、StoryReflection、PhaseStructure
- `biome-ast-engine` — `@unit` 複数ユニットパーサー
- `traceability-model` — メタデータパーサー・バリデーター
- `agent-integration` — WriteTargetScope 複数 unit 対応

**受け入れ基準:**
- 4 種プリセット（full/standard/minimal/custom）でフェーズ構造を生成できる
- `"default"` → `"full"` フォールバックが動作する
- StoryReflectionMapping/Config 値オブジェクトが定義されている
- StoryReflectionChecker ドメインサービスが inception → product 反映を検証する
- `@unit order, payment` / 複数行 `@unit` が正しくパースされる
- 複数 `@unit` の全件バリデーションが動作する
- 全テストがグリーン

## 2. 前提条件検証

- `implementation-readiness-checker` 相当の確認: 2026-04-04
- 各 Unit の `logical_design.md` / `domain_model.md`: ✅ 全 4 Unit に存在
- `environment_contract.md`: ✅ 存在
- 判定結果: ✅ 実装準備完了

## 3. TDD実装順序（テストピラミッド準拠）

### グループ 1: 値オブジェクト拡張（独立性が高く並列可能）

#### 1-A: PhaseCustomizationPolicy プリセット拡張（A-2-1）

**対象:** `scripts/harness/phase-dependency-model/domain/values/phase-customization-policy.ts`

**現状:**
```typescript
preset: 'default' | 'custom'
```

**変更:**
```typescript
type PresetName = 'full' | 'standard' | 'minimal' | 'custom';
preset: PresetName
// 'default' は create() 内で 'full' にフォールバック
```

**テストケース:**
| # | テスト名 | 内容 |
|---|---------|------|
| 1 | `'default' プリセットは 'full' にフォールバックされる` | `create({ preset: 'default', ... })` → `policy.preset === 'full'` |
| 2 | `'full' プリセットが生成できる` | `create({ preset: 'full', ... })` → `policy.preset === 'full'` |
| 3 | `'standard' プリセットが生成できる` | 同上 |
| 4 | `'minimal' プリセットが生成できる` | 同上 |
| 5 | `'custom' プリセットが生成できる` | 同上 |
| 6 | `preset 省略 + ルールなしは 'full' になる` | 現行 `'default'` → `'full'` に変わる |
| 7 | `preset 省略 + ルールありは 'custom' になる` | 現行動作維持 |
| 8 | `equals で異なるプリセットは false` | `'full' !== 'standard'` |

**実装内容:**
- `PresetName` 型を export
- `create()` で `'default'` → `'full'` マッピング
- preset 省略時のデフォルトを `'default'` → `'full'` に変更

---

#### 1-B: StoryReflectionMapping 値オブジェクト新設（A-2-2）

**新規ファイル:** `scripts/harness/phase-dependency-model/domain/values/story-reflection-mapping.ts`

**設計:**
```typescript
interface StoryReflectionMappingCreateArgs {
  readonly inception: string;  // e.g. "docs/inception/{unit}/{storyId}/logical_design.md"
  readonly product: string;    // e.g. "docs/product/construction/{unit}/logical_design.md"
  readonly required: boolean;
}

class StoryReflectionMapping {
  readonly inception: string;
  readonly product: string;
  readonly required: boolean;
  
  static create(args): StoryReflectionMapping;
  resolve(scope: { unitId: string; storyId: string }): { inception: string; product: string };
  equals(other): boolean;
}
```

**不変条件:**
- `inception` は `docs/inception/` で始まる
- `product` は `docs/product/` で始まる
- `inception` は `{unit}` と `{storyId}` プレースホルダを含む
- `product` は `{unit}` プレースホルダを含む

**テストケース:**
| # | テスト名 |
|---|---------|
| 1 | `正常な mapping を生成できる` |
| 2 | `resolve で {unit} と {storyId} が置換される` |
| 3 | `inception が docs/inception/ で始まらない場合エラー` |
| 4 | `product が docs/product/ で始まらない場合エラー` |
| 5 | `inception に {storyId} がない場合エラー` |
| 6 | `required: true と false で equals が false` |
| 7 | `同一パスの mapping は equals が true` |

---

#### 1-C: StoryReflectionConfig 値オブジェクト新設（A-2-3）

**新規ファイル:** `scripts/harness/phase-dependency-model/domain/values/story-reflection-config.ts`

**設計:**
```typescript
class StoryReflectionConfig {
  readonly enabled: boolean;
  readonly mappings: readonly StoryReflectionMapping[];
  
  static create(args): StoryReflectionConfig;
  static disabled(): StoryReflectionConfig;  // enabled: false, mappings: []
  requiredMappings(): readonly StoryReflectionMapping[];
  optionalMappings(): readonly StoryReflectionMapping[];
  equals(other): boolean;
}
```

**テストケース:**
| # | テスト名 |
|---|---------|
| 1 | `有効な config を生成できる` |
| 2 | `disabled() は enabled: false で空 mappings` |
| 3 | `requiredMappings は required: true のみ返す` |
| 4 | `optionalMappings は required: false のみ返す` |
| 5 | `enabled: false + mappings ありは許容される（設定保持のため）` |

---

#### 1-D: unit-comment-parser 複数ユニット対応（A-2-13）

**対象:** `scripts/harness/biome-ast-engine/infrastructure/parsers/unit-comment-parser.ts`

**現状:**
```typescript
type UnitCommentResult = { readonly unitName: string | null; };
// 正規表現: /^\s*(?:\/\/|\/\*\*?\s*|\*)\s*@unit\s+(\S+)/m  ← 単一マッチ
```

**変更:**
```typescript
type UnitCommentResult = { readonly unitNames: readonly string[]; };
// 全行マッチ + カンマ分割
```

**テストケース:**
| # | テスト名 | 入力 | 期待値 |
|---|---------|------|-------|
| 1 | `単一 @unit をパースできる` | `// @unit order` | `["order"]` |
| 2 | `カンマ区切りの複数 @unit をパースできる` | `// @unit order, payment` | `["order", "payment"]` |
| 3 | `複数行の @unit をパースできる` | `// @unit order\n// @unit payment` | `["order", "payment"]` |
| 4 | `カンマ区切りと複数行の混在をパースできる` | `// @unit order, payment\n// @unit shared` | `["order", "payment", "shared"]` |
| 5 | `JSDoc 形式をパースできる` | `/** @unit order */` | `["order"]` |
| 6 | `@unit がない場合は空配列` | `const x = 1;` | `[]` |
| 7 | `重複は除去される` | `// @unit order\n// @unit order` | `["order"]` |
| 8 | `カンマ周囲の空白は無視される` | `// @unit order , payment` | `["order", "payment"]` |
| 9 | `後方互換: 単一 unitName の既存コードが動作する`（型変更の影響確認） | — | — |

---

#### 1-E: source-metadata-parser カンマ区切り展開（A-2-14）

**対象:** `scripts/harness/traceability-model/infrastructure/parsers/source-metadata-parser.ts`

**現状:** `@unit order, payment` → `{ type: '@unit', value: 'order, payment' }` (1タグ)

**変更:** `@unit order, payment` → `{ type: '@unit', value: 'order' }, { type: '@unit', value: 'payment' }` (2タグ)

**テストケース:**
| # | テスト名 |
|---|---------|
| 1 | `カンマ区切り @unit が複数タグに展開される` |
| 2 | `単一 @unit はそのまま 1 タグ` |
| 3 | `複数行 @unit は複数タグとして維持される` |
| 4 | `カンマ区切りの空白がトリムされる` |
| 5 | `@layer 等他タグはカンマ展開されない` |

---

### グループ 2: プリセット定義ファイル（グループ 1-A 完了後）

#### 2-A: full-phase-nodes.ts リネーム（A-2-4）

**対象:** `default-phase-nodes.ts` → `full-phase-nodes.ts`
- export 名: `DEFAULT_PHASE_NODES` → `FULL_PHASE_NODES`
- 内容は現行と同一
- `default-phase-nodes.ts` は削除し、import を全て更新

**影響ファイル:**
- `default-phase-dependencies.ts` → `full-phase-dependencies.ts` (A-2-7)
- `phase-structure.ts`

---

#### 2-B: standard-phase-nodes.ts 新設（A-2-5）

**新規ファイル:** `scripts/harness/phase-dependency-model/domain/definitions/standard-phase-nodes.ts`

§4.4 `standard` 定義に基づく:
- **Level 1:** product-architect, story-writer のみ（product_overview.md + user_stories.md）
- **Level 2:** domain-designer, logical-designer のみ（domain_model.md + logical_design.md）
- **Level 3:** logical-designer (required), 他は optional

---

#### 2-C: minimal-phase-nodes.ts 新設（A-2-6）

§4.4 `minimal` 定義に基づく:
- **Level 1:** product-architect のみ（product_overview_plan.md + product_overview.md required）
- **Level 2:** logical-designer のみ（logical_design.md required）
- **Level 3:** なし（空）

---

#### 2-D: full-phase-dependencies.ts リネーム（A-2-7）

`DEFAULT_PHASE_DEPENDENCIES` → `FULL_PHASE_DEPENDENCIES`。内容同一。

---

#### 2-E: standard-phase-dependencies.ts 新設（A-2-8）

standard ノードに対応する依存定義:
- L1: product-architect → story-writer
- L1→L2: story-writer → domain-designer → logical-designer
- L2→L3: logical-designer → 3:logical-designer

---

#### 2-F: minimal-phase-dependencies.ts 新設（A-2-9）

minimal ノードに対応する依存定義:
- L1→L2: product-architect → logical-designer（Level 間遷移、non-relaxable）

---

#### 2-G: storyReflection デフォルト mappings 定義（A-2-10）

**新規ファイル群:**
- `full-story-reflection-defaults.ts` — §4.2 full mappings (logical_design required, domain_model required, uiux_design optional)
- `standard-story-reflection-defaults.ts` — §4.2 standard mappings (logical_design required, domain_model optional)
- minimal は `StoryReflectionConfig.disabled()` で表現（ファイル不要）

---

### グループ 3: PhaseStructure プリセット対応（グループ 2 完了後）

#### 3-A: PhaseStructure.createDefault() プリセット対応（A-2-11）

**対象:** `scripts/harness/phase-dependency-model/domain/models/phase-structure.ts`

**現状:**
```typescript
static createDefault(policy: PhaseCustomizationPolicy): PhaseStructure {
  const levels = buildLevels(DEFAULT_PHASE_NODES);
  // ...
}
```

**変更:**
```typescript
static createDefault(policy: PhaseCustomizationPolicy): PhaseStructure {
  const { nodes, dependencies } = resolvePresetDefinitions(policy.preset);
  const levels = buildLevels(nodes);
  // ...
}
```

`resolvePresetDefinitions()` はプリセットに応じて適切なノード・依存セットを返す private 関数。

**テストケース:**
| # | テスト名 |
|---|---------|
| 1 | `'full' プリセットは全 15 ノード・17 依存を生成する` |
| 2 | `'standard' プリセットは Level 1 に 2 ノード、Level 2 に 2 ノードを持つ` |
| 3 | `'minimal' プリセットは Level 2 に 1 ノードのみ` |
| 4 | `'custom' プリセットは 'full' ベースで customRules を適用` |
| 5 | `プリセット切替後も checkPhaseGate が正しく動作する` |

---

### グループ 4: StoryReflectionChecker ドメインサービス（グループ 1-B/C 完了後）

#### 4-A: StoryReflectionChecker 新設（A-2-12）

**新規ファイル:** `scripts/harness/phase-dependency-model/domain/services/story-reflection-checker.ts`

**設計:**
```typescript
// Port（domain 層に定義）
interface StoryReflectionFileSystemPort {
  listStoryDirectories(unitId: string): Promise<readonly string[]>;
  fileExists(path: string): Promise<boolean>;
  fileContainsAnnotation(path: string, storyId: string): Promise<boolean>;
}

// Result
interface StoryReflectionResult {
  readonly passed: boolean;
  readonly violations: readonly StoryReflectionViolation[];
  readonly warnings: readonly StoryReflectionViolation[];
}

interface StoryReflectionViolation {
  readonly storyId: string;
  readonly mapping: StoryReflectionMapping;
  readonly inceptionExists: boolean;
  readonly productReflected: boolean;
}

// Service
class StoryReflectionChecker {
  constructor(private readonly fsPort: StoryReflectionFileSystemPort);
  
  async check(
    unitId: string,
    config: StoryReflectionConfig,
  ): Promise<StoryReflectionResult>;
}
```

**処理フロー:**
1. `fsPort.listStoryDirectories(unitId)` で inception/{unit}/ 配下の storyId ディレクトリ列挙
2. 各 storyId × 各 mapping について:
   - `mapping.resolve({ unitId, storyId })` でパス解決
   - inception ファイル存在チェック
   - inception 存在 AND required → product 内 `@story-id {storyId}` チェック
   - inception 存在 AND !required → product 未反映は warning
   - inception 不存在 → skip

**テストケース:**
| # | テスト名 |
|---|---------|
| 1 | `inception 存在 × product 反映済み → pass` |
| 2 | `inception 存在 × product 未反映 × required → fail` |
| 3 | `inception 存在 × product 未反映 × optional → warning のみ` |
| 4 | `inception 不存在 → skip（チェック不要）` |
| 5 | `config.enabled: false → 常に pass` |
| 6 | `複数 storyId × 複数 mapping の組み合わせ検証` |
| 7 | `storyId ディレクトリが空 → pass` |

---

### グループ 5: metadata-validator 複数 @unit 対応（グループ 1-E 完了後）

#### 5-A: metadata-validator 全 @unit 検証（A-2-15）

**対象:** `scripts/harness/traceability-model/domain/services/metadata-validator.ts`

**現状 (L83):**
```typescript
const unitTag = input.tags.find((tag) => tag.type === '@unit');
// → 最初の @unit のみ検証
```

**変更:**
```typescript
const unitTags = input.tags.filter((tag) => tag.type === '@unit');
if (unitTags.length === 0) { /* エラー: @unit 必須 */ }
for (const unitTag of unitTags) {
  if (!(await hasUnit(this.unitDefinitionPort, unitTag.value))) {
    /* エラー: unit 未登録 */
  }
}
```

**テストケース:**
| # | テスト名 |
|---|---------|
| 1 | `複数 @unit の全件が検証される` |
| 2 | `2 つの @unit のうち 1 つが不正 → エラー` |
| 3 | `全 @unit が有効 → success` |
| 4 | `単一 @unit の後方互換` |

---

### グループ 6: Phase Gate × 複数 unit（A-2-16、グループ 3/5 完了後）

#### 6-A: WriteTargetScope + Phase Gate 複数 unit 対応

**対象:** `scripts/harness/agent-integration/domain/value-objects/write-target-scope.ts`

**現状:** `fromPath()` はパスベースで単一 unitId を返す。

**変更方針:**
- WriteTargetScope 自体は単一 unit のスコープを表す（不変条件維持）
- 呼び出し元（application 層の HandlePreToolUseUseCase）で `@unit` アノテーションから複数 WriteTargetScope を生成し、**全 unit でゲートチェック** する
- これは A-3（アプリケーション層）の責務なので、A-2 では:
  1. unit-comment-parser/source-metadata-parser の複数 unit パース（1-D, 1-E で完了）
  2. metadata-validator の全 @unit 検証（5-A で完了）
  3. WriteTargetScope 自体の変更は不要（単一 unit スコープの設計は維持）

**→ A-2-16 のドメイン層変更は 1-D, 1-E, 5-A に包含される。アプリケーション層での統合は A-3 で実施。**

---

## 4. 環境検証チェックリスト

- [x] pnpm install 正常完了
- [x] pnpm test 全テストグリーン
- [x] 対象ファイルの @unit/@layer メタデータ確認済み

## 5. QA（不明点・確認事項）

### [Question] Q1: standard プリセットの Level 1 ノードにおける _plan.md

standard プリセットの Level 1 は product-architect と story-writer のみ。これらのノードは inception/_shared/ の _plan.md を required artifact として持つ。standard ではこれらの plan を required のまま維持するか、それとも省略するか？

**推奨案:** full と同じく required 維持。standard は「ノード数を減らす」プリセットであり、存在するノードの品質を緩めるものではない。

### [Question] Q2: minimal プリセットの Level 1 ノード

§4.4 の minimal 定義では Level 1 ノードは「なし」。つまり product_overview.md 等の存在チェックも行わない。この場合 Level 2 への遷移条件をどう定義するか？

**決定: Level 1 が空の場合でも Level 2 へ自動通過させない。Level 間遷移は non-relaxable。**
minimal の Level 1 に product-architect ノード（product_overview_plan.md + product_overview.md）を追加する。これにより全プリセットで Level 1→2 遷移にゲートが存在する。§4.4 minimal 定義を更新済み。

### [Question] Q3: standard/minimal の non-relaxable dependencies

full では `isLevelTransition() || to === implementation-readiness-checker || to === story-implementor` が non-relaxable。standard/minimal でこれらのノードが存在しない場合、non-relaxable はどうなるか？

**推奨案:** non-relaxable は各プリセットのノードセットに存在する依存のみに適用。存在しないノードへの依存は定義自体がないので問題なし。

## 6. 前提条件・リスク

- **破壊的変更:** `unitName: string | null` → `unitNames: string[]` は内部 API だが、呼び出し元の修正が必要。A-3/A-4 で対応。
- **既存テストへの影響:** `phase-customization-policy.test.ts`, `phase-structure.test.ts` の `'default'` プリセット参照を `'full'` に更新必要（A-6-4）。ただしフォールバックにより既存テストは動作継続。
- **リネーム影響:** `default-phase-nodes.ts` → `full-phase-nodes.ts` は import 変更が複数ファイルに波及。
