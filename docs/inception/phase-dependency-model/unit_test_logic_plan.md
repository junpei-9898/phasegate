# ユニットテストロジック設計計画: phase-dependency-model

> **作成日**: 2026-04-05
> **対応**: A-4 Phase Gate ブロッカー解消 / A-2 で追加された configurable phase gate 関連ドメイン
> **上位設計**:
> - `docs/inception/phase-dependency-model/unit_test_design_plan.md`
> - `docs/inception/phase-dependency-model/domain_model_plan.md`
> - `docs/inception/phase-dependency-model/logical_design_plan.md`
> - `docs/inception/_shared/configurable_phase_gate_plan.md`

---

## QA（設計判断の根拠）

### Q1: A-2 で追加されたプリセット別 defaults 定義のテスト粒度
- **Q**: `FULL_STORY_REFLECTION_DEFAULTS` / `STANDARD_STORY_REFLECTION_DEFAULTS` / `MINIMAL_STORY_REFLECTION_DEFAULTS` の静的定義をどこまでテストするか？
- **A**: **スナップショット的に値を固定**するテストのみ。静的定義はリグレッション防止が主目的のため、enabled/mappings 件数/required フラグ/パス文字列をアサート。計算ロジックは無いので境界値は不要。
- **根拠**: `configurable_phase_gate_plan.md` 4.2 に定めたデフォルト mappings が破壊されていないことを機械的に保証することが目的。

### Q2: `StoryReflectionChecker` のモック方針
- **Q**: `StoryReflectionFileSystemPort` をモックするか、インメモリ実装を使うか？
- **A**: **`vi.fn()` によるポートモック**を採用。Port は outbound であり、ドメインサービスの振る舞い（違反収集ロジック）を純粋に検証する。
- **根拠**: `testing-rules.md` の「ドメイン実体はモック禁止、外部依存 Port のみ Fake/Stub 可」に従う。`StoryReflectionConfig` と `StoryReflectionMapping` は実体生成。

### Q3: `PhaseStructure` プリセット切替のテスト配置
- **Q**: 既存 `phase-structure.test.ts` に追記するか、別ファイルに切るか？
- **A**: **既存 `phase-structure.test.ts` に `createDefault - プリセット対応` describe を追加**（既存構造を継承）。プリセット別ノードロードは `PhaseStructure.createDefault` の振る舞い差分なので、同一 SUT のテストとして集約する。
- **根拠**: 既に A-2 実装済みの `phase-structure.test.ts` L1867 以降がこの方針で書かれており、それに従う。

---

## 1. スコープ

- **対象**: A-2「フェーズゲート設定可能化」で追加された以下のドメイン要素のユニットテストロジック設計
  - `PhaseCustomizationPolicy` のプリセット拡張（`default` → `full` フォールバック、`full`/`standard`/`minimal`/`custom`）
  - `PhaseStructure.createDefault(policy)` のプリセット別ノード・依存ロード
  - `StoryReflectionMapping` 値オブジェクト
  - `StoryReflectionConfig` 値オブジェクト
  - `StoryReflectionResult` 値オブジェクト
  - `StoryReflectionChecker` ドメインサービス
  - プリセット別 `*_STORY_REFLECTION_DEFAULTS` 静的定義
- **上位設計**: 上記 QA の参照文書
- **実装先**: `scripts/harness/phase-dependency-model/domain/` 配下（A-2 で実装済）
- **テストケース総数概算**: 54件
  - PhaseCustomizationPolicy プリセット拡張: 8件
  - PhaseStructure プリセット別ロード: 10件
  - StoryReflectionMapping: 10件
  - StoryReflectionConfig: 6件
  - StoryReflectionResult: 4件
  - StoryReflectionChecker: 10件
  - プリセット別 defaults 定義: 6件

> 既存の H02-01/02/03 の基本テスト（`phase-structure.test.ts` 本体・`planning-mode.test.ts`・`phase-customization-policy.test.ts` 基本部）は `unit_test_design_plan.md` に準拠し、本計画では A-2 差分のみを扱う。

---

## 2. テストファイル構成（計画）

| テストファイル | 対象クラス | 既存/新規 | ケース数 |
|---|---|---|---|
| `scripts/harness/__tests__/unit/phase-dependency-model/phase-customization-policy.test.ts` | `PhaseCustomizationPolicy` プリセット拡張 | 既存（追記） | 8 |
| `scripts/harness/__tests__/unit/phase-dependency-model/phase-structure.test.ts` | `PhaseStructure.createDefault` プリセット対応 | 既存（追記） | 10 |
| `scripts/harness/__tests__/unit/phase-dependency-model/story-reflection-mapping.test.ts` | `StoryReflectionMapping` 値オブジェクト | 新規 | 10 |
| `scripts/harness/__tests__/unit/phase-dependency-model/story-reflection-config.test.ts` | `StoryReflectionConfig` 値オブジェクト | 新規 | 6 |
| `scripts/harness/__tests__/unit/phase-dependency-model/story-reflection-result.test.ts` | `StoryReflectionResult` 値オブジェクト | 新規 | 4 |
| `scripts/harness/__tests__/unit/phase-dependency-model/story-reflection-checker.test.ts` | `StoryReflectionChecker` ドメインサービス | 新規 | 10 |
| `scripts/harness/__tests__/unit/phase-dependency-model/story-reflection-defaults.test.ts` | `FULL/STANDARD/MINIMAL_STORY_REFLECTION_DEFAULTS` | 新規 | 6 |

---

## 3. モック/ファクトリ設計方針

### 3.1 ファクトリ関数配置

`scripts/harness/__tests__/helpers/test-helpers.ts` に以下を追加:

- `createStoryReflectionMapping(overrides?)`: デフォルト `{ inception: 'docs/inception/{unit}/{storyId}/logical_design.md', product: 'docs/product/construction/{unit}/logical_design.md', required: true }`
- `createStoryReflectionConfig(overrides?)`: デフォルト `{ enabled: true, mappings: [createStoryReflectionMapping()] }`
- `createPhaseCustomizationPolicy(overrides?)`: A-2 以前から存在。`preset`/`rules`/`overrideEnabled` を受け取る。デフォルト `{ preset: 'full', rules: [], overrideEnabled: false }`

### 3.2 モック方針

| 対象 | 扱い |
|---|---|
| `StoryReflectionMapping` / `StoryReflectionConfig` / `StoryReflectionResult` | **実体生成**（VO、モック禁止） |
| `PhaseCustomizationPolicy` / `PhaseStructure` | **実体生成**（集約・VO、モック禁止） |
| `StoryReflectionFileSystemPort` | **`vi.fn()` モック**（outbound Port） |
| プリセット別 defaults (`FULL_*` / `STANDARD_*` / `MINIMAL_*`) | **そのまま import して値を直接検証**（静的定数） |

### 3.3 StoryReflectionChecker のモック構成

```typescript
const fsPort: StoryReflectionFileSystemPort = {
  listStoryDirectories: vi.fn(),
  fileExists: vi.fn(),
  fileContainsStoryAnnotation: vi.fn(),
};
```

各テストで `vi.mocked(fsPort.xxx).mockResolvedValue(...)` でスタブを設定。テスト間の状態干渉を防ぐため、各 `it` 内で新規にポートを生成する。

---

## 4. テストロジック詳細設計（疑似コード）

### 4.1 `PhaseCustomizationPolicy` プリセット拡張

#### target: `PhaseCustomizationPolicy.create` - プリセット解決

```typescript
target('PhaseCustomizationPolicy.create - プリセット拡張', () => {
  describe('PresetName 型のプリセットを解決する', () => {
    it("'default' プリセットは 'full' にフォールバックされる", () => {
      // Arrange
      const input = { preset: 'default' as const, rules: [], overrideEnabled: false };

      // Act
      const actual = PhaseCustomizationPolicy.create(input);

      // Assert
      expect(actual.preset).toBe('full');
    });

    it.each(['full', 'standard', 'minimal', 'custom'] as const)(
      "'%s' プリセットが生成できる",
      (preset) => {
        // Arrange
        const input = { preset, rules: [], overrideEnabled: false };

        // Act
        const actual = PhaseCustomizationPolicy.create(input);

        // Assert
        expect(actual.preset).toBe(preset);
      },
    );

    context('preset が省略されかつ rules が空の場合', () => {
      it("'full' が既定として設定される", () => {
        // Arrange
        const input = { rules: [], overrideEnabled: false };

        // Act
        const actual = PhaseCustomizationPolicy.create(input);

        // Assert
        expect(actual.preset).toBe('full');
      });
    });

    context('preset が省略されかつ rules が存在する場合', () => {
      it("'custom' が既定として設定される", () => {
        // Arrange
        const input = {
          rules: [createCustomRule()],
          overrideEnabled: false,
        };

        // Act
        const actual = PhaseCustomizationPolicy.create(input);

        // Assert
        expect(actual.preset).toBe('custom');
      });
    });
  });

  describe('equals によるプリセット差異判定', () => {
    it('プリセットが異なる場合は equals が false を返す', () => {
      // Arrange
      const left = PhaseCustomizationPolicy.create({ preset: 'full', rules: [], overrideEnabled: false });
      const right = PhaseCustomizationPolicy.create({ preset: 'minimal', rules: [], overrideEnabled: false });

      // Act
      const actual = left.equals(right);

      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

**網羅観点**: `resolvePreset` の全分岐（undefined × hasRules T/F、'default'、PresetName 直指定 4 種）。

### 4.2 `PhaseStructure.createDefault` プリセット別ロード

#### target: `PhaseStructure.createDefault - プリセット対応`

```typescript
target('PhaseStructure.createDefault - プリセット対応', () => {
  describe("'full' プリセットを指定する", () => {
    it('Level 1/2/3 の全ノードが FULL_PHASE_NODES から生成される', () => {
      // Arrange
      const policy = PhaseCustomizationPolicy.create({ preset: 'full', rules: [], overrideEnabled: false });

      // Act
      const actual = PhaseStructure.createDefault(policy);

      // Assert
      expect(actual.getPhaseNodes(PhaseLevel.of(1))).toHaveLength(FULL_PHASE_NODES.filter(n => n.level.value === 1).length);
      expect(actual.getPhaseNodes(PhaseLevel.of(2))).toHaveLength(FULL_PHASE_NODES.filter(n => n.level.value === 2).length);
      expect(actual.getPhaseNodes(PhaseLevel.of(3))).toHaveLength(FULL_PHASE_NODES.filter(n => n.level.value === 3).length);
    });

    it('依存関係数が FULL_PHASE_DEPENDENCIES と一致する', () => {
      // Arrange
      const policy = createPhaseCustomizationPolicy({ preset: 'full' });

      // Act
      const actual = PhaseStructure.createDefault(policy).buildDependencyGraph();

      // Assert
      expect(actual.edges).toHaveLength(FULL_PHASE_DEPENDENCIES.length);
    });
  });

  describe("'standard' プリセットを指定する", () => {
    it('Level 1 に product-architect と story-writer の 2 ノードを持つ', () => {
      // Arrange
      const policy = createPhaseCustomizationPolicy({ preset: 'standard' });

      // Act
      const actual = PhaseStructure.createDefault(policy).getPhaseNodes(PhaseLevel.of(1));

      // Assert
      expect(actual.map((n) => n.skillName).sort()).toEqual(['product-architect', 'story-writer']);
    });

    it('Level 2 に domain-designer と logical-designer の 2 ノードを持つ', () => {
      // Arrange
      const policy = createPhaseCustomizationPolicy({ preset: 'standard' });

      // Act
      const actual = PhaseStructure.createDefault(policy).getPhaseNodes(PhaseLevel.of(2));

      // Assert
      expect(actual.map((n) => n.skillName).sort()).toEqual(['domain-designer', 'logical-designer']);
    });

    it('checkPhaseGate が 正常系で passed=true を返す', () => {
      // Arrange
      const sut = PhaseStructure.createDefault(createPhaseCustomizationPolicy({ preset: 'standard' }));
      const evidence = buildStandardPresetEvidenceBundle(); // helper

      // Act
      const actual = sut.checkPhaseGate(PhaseLevel.of(3), evidence);

      // Assert
      expect(actual.passed).toBe(true);
    });
  });

  describe("'minimal' プリセットを指定する", () => {
    it('Level 1 に product-architect のみを持つ', () => {
      // Arrange
      const policy = createPhaseCustomizationPolicy({ preset: 'minimal' });

      // Act
      const actual = PhaseStructure.createDefault(policy).getPhaseNodes(PhaseLevel.of(1));

      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0].skillName).toBe('product-architect');
    });

    it('Level 2 に logical-designer のみを持つ', () => {
      // Arrange
      const policy = createPhaseCustomizationPolicy({ preset: 'minimal' });

      // Act
      const actual = PhaseStructure.createDefault(policy).getPhaseNodes(PhaseLevel.of(2));

      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0].skillName).toBe('logical-designer');
    });

    it('Level 3 は空配列を返す', () => {
      // Arrange
      const policy = createPhaseCustomizationPolicy({ preset: 'minimal' });

      // Act
      const actual = PhaseStructure.createDefault(policy).getPhaseNodes(PhaseLevel.of(3));

      // Assert
      expect(actual).toHaveLength(0);
    });
  });

  describe("'custom' プリセットを指定する", () => {
    it("'full' ベースの構造で生成される", () => {
      // Arrange
      const policy = createPhaseCustomizationPolicy({ preset: 'custom' });

      // Act
      const actual = PhaseStructure.createDefault(policy);

      // Assert
      expect(actual.getPhaseNodes(PhaseLevel.of(1))).toHaveLength(
        FULL_PHASE_NODES.filter((n) => n.level.value === 1).length,
      );
    });
  });

  describe("'default' プリセット（後方互換）", () => {
    it("'full' と同一の構造になる", () => {
      // Arrange
      const legacy = PhaseStructure.createDefault(
        PhaseCustomizationPolicy.create({ preset: 'default', rules: [], overrideEnabled: false }),
      );
      const full = PhaseStructure.createDefault(
        PhaseCustomizationPolicy.create({ preset: 'full', rules: [], overrideEnabled: false }),
      );

      // Act
      const actual = legacy.getPhaseNodes(PhaseLevel.of(1)).length;

      // Assert
      expect(actual).toBe(full.getPhaseNodes(PhaseLevel.of(1)).length);
    });
  });
});
```

**網羅観点**: プリセット 4 種 + 'default' フォールバック × 各 Level ノード数。Level 間依存の不変条件は既存テストで担保済。

### 4.3 `StoryReflectionMapping` 値オブジェクト

```typescript
target('StoryReflectionMapping.create', () => {
  describe('StoryReflectionMapping を生成する', () => {
    it('inception/product/required が有効な場合は正常に生成される', () => {
      // Arrange
      const input = {
        inception: 'docs/inception/{unit}/{storyId}/logical_design.md',
        product: 'docs/product/construction/{unit}/logical_design.md',
        required: true,
      };

      // Act
      const actual = StoryReflectionMapping.create(input);

      // Assert
      expect(actual.inception).toBe(input.inception);
      expect(actual.product).toBe(input.product);
      expect(actual.required).toBe(true);
    });

    context('inception が docs/inception/ で始まらない場合', () => {
      it('InvalidStoryReflectionMappingError をスローする', () => {
        // Arrange
        const input = {
          inception: 'inception/{unit}/{storyId}/logical_design.md',
          product: 'docs/product/construction/{unit}/logical_design.md',
          required: true,
        };

        // Act
        const actual = () => StoryReflectionMapping.create(input);

        // Assert
        expect(actual).toThrowError(InvalidStoryReflectionMappingError);
      });
    });

    context('product が docs/product/ で始まらない場合', () => {
      it('InvalidStoryReflectionMappingError をスローする', () => {
        // Arrange / Act / Assert
        expect(() =>
          StoryReflectionMapping.create({
            inception: 'docs/inception/{unit}/{storyId}/logical_design.md',
            product: 'product/construction/{unit}/logical_design.md',
            required: true,
          }),
        ).toThrowError(InvalidStoryReflectionMappingError);
      });
    });

    context('inception に {storyId} プレースホルダが無い場合', () => {
      it('InvalidStoryReflectionMappingError をスローする', () => {
        expect(() =>
          StoryReflectionMapping.create({
            inception: 'docs/inception/{unit}/logical_design.md',
            product: 'docs/product/construction/{unit}/logical_design.md',
            required: true,
          }),
        ).toThrowError(InvalidStoryReflectionMappingError);
      });
    });

    context('inception に {unit} プレースホルダが無い場合', () => {
      it('InvalidStoryReflectionMappingError をスローする', () => {
        expect(() =>
          StoryReflectionMapping.create({
            inception: 'docs/inception/shared/{storyId}/logical_design.md',
            product: 'docs/product/construction/{unit}/logical_design.md',
            required: true,
          }),
        ).toThrowError(InvalidStoryReflectionMappingError);
      });
    });

    context('product に {unit} プレースホルダが無い場合', () => {
      it('InvalidStoryReflectionMappingError をスローする', () => {
        expect(() =>
          StoryReflectionMapping.create({
            inception: 'docs/inception/{unit}/{storyId}/logical_design.md',
            product: 'docs/product/construction/shared/logical_design.md',
            required: true,
          }),
        ).toThrowError(InvalidStoryReflectionMappingError);
      });
    });
  });
});

target('StoryReflectionMapping.resolve', () => {
  describe('プレースホルダを展開する', () => {
    it('{unit} と {storyId} が実値に置換される', () => {
      // Arrange
      const sut = createStoryReflectionMapping();

      // Act
      const actual = sut.resolve({ unitId: 'order', storyId: 'US-001' });

      // Assert
      expect(actual.inception).toBe('docs/inception/order/US-001/logical_design.md');
      expect(actual.product).toBe('docs/product/construction/order/logical_design.md');
    });

    it('複数出現する {unit} をすべて置換する', () => {
      // Arrange
      const sut = StoryReflectionMapping.create({
        inception: 'docs/inception/{unit}/{storyId}/{unit}-note.md',
        product: 'docs/product/construction/{unit}/{unit}-summary.md',
        required: false,
      });

      // Act
      const actual = sut.resolve({ unitId: 'payment', storyId: 'US-010' });

      // Assert
      expect(actual.inception).toBe('docs/inception/payment/US-010/payment-note.md');
      expect(actual.product).toBe('docs/product/construction/payment/payment-summary.md');
    });
  });
});

target('StoryReflectionMapping.equals', () => {
  describe('値等価性を判定する', () => {
    it('同一属性であれば true を返す', () => {
      // Arrange
      const left = createStoryReflectionMapping();
      const right = createStoryReflectionMapping();

      // Act
      const actual = left.equals(right);

      // Assert
      expect(actual).toBe(true);
    });

    it('required が異なれば false を返す', () => {
      // Arrange
      const left = createStoryReflectionMapping({ required: true });
      const right = createStoryReflectionMapping({ required: false });

      // Act
      const actual = left.equals(right);

      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

**網羅観点**: 5 つの不変条件すべて × 正常系 1 件。resolve の placeholder 置換。equals の 差異 2 ケース。

### 4.4 `StoryReflectionConfig` 値オブジェクト

```typescript
target('StoryReflectionConfig.create', () => {
  describe('StoryReflectionConfig を生成する', () => {
    it('enabled=true と mappings を渡すと正常に生成される', () => {
      // Arrange
      const mappings = [createStoryReflectionMapping()];

      // Act
      const actual = StoryReflectionConfig.create({ enabled: true, mappings });

      // Assert
      expect(actual.enabled).toBe(true);
      expect(actual.mappings).toEqual(mappings);
    });

    it('mappings が空配列でも生成できる', () => {
      // Arrange / Act
      const actual = StoryReflectionConfig.create({ enabled: true, mappings: [] });

      // Assert
      expect(actual.mappings).toHaveLength(0);
    });
  });
});

target('StoryReflectionConfig.disabled', () => {
  describe('無効な設定を生成する', () => {
    it('enabled=false かつ mappings が空の Config を返す', () => {
      // Arrange / Act
      const actual = StoryReflectionConfig.disabled();

      // Assert
      expect(actual.enabled).toBe(false);
      expect(actual.mappings).toHaveLength(0);
    });
  });
});

target('StoryReflectionConfig.requiredMappings / optionalMappings', () => {
  describe('required で mappings をフィルタする', () => {
    it('required=true の mapping のみを requiredMappings が返す', () => {
      // Arrange
      const required = createStoryReflectionMapping({ required: true });
      const optional = createStoryReflectionMapping({
        inception: 'docs/inception/{unit}/{storyId}/uiux_design.md',
        product: 'docs/product/construction/{unit}/uiux_design.md',
        required: false,
      });
      const sut = StoryReflectionConfig.create({ enabled: true, mappings: [required, optional] });

      // Act
      const actual = sut.requiredMappings();

      // Assert
      expect(actual).toEqual([required]);
    });

    it('required=false の mapping のみを optionalMappings が返す', () => {
      // Arrange
      const required = createStoryReflectionMapping({ required: true });
      const optional = createStoryReflectionMapping({
        inception: 'docs/inception/{unit}/{storyId}/uiux_design.md',
        product: 'docs/product/construction/{unit}/uiux_design.md',
        required: false,
      });
      const sut = StoryReflectionConfig.create({ enabled: true, mappings: [required, optional] });

      // Act
      const actual = sut.optionalMappings();

      // Assert
      expect(actual).toEqual([optional]);
    });
  });
});

target('StoryReflectionConfig.equals', () => {
  describe('値等価性を判定する', () => {
    it('同一 mappings・同一 enabled なら true', () => {
      // Arrange
      const left = createStoryReflectionConfig();
      const right = createStoryReflectionConfig();

      // Act
      const actual = left.equals(right);

      // Assert
      expect(actual).toBe(true);
    });

    it('enabled が異なれば false', () => {
      // Arrange
      const left = StoryReflectionConfig.create({ enabled: true, mappings: [] });
      const right = StoryReflectionConfig.create({ enabled: false, mappings: [] });

      // Act
      const actual = left.equals(right);

      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

### 4.5 `StoryReflectionResult` 値オブジェクト

```typescript
target('StoryReflectionResult', () => {
  describe('pass ファクトリ', () => {
    it('passed=true かつ violations/warnings が空の結果を返す', () => {
      // Arrange / Act
      const actual = StoryReflectionResult.pass();

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.violations).toHaveLength(0);
      expect(actual.warnings).toHaveLength(0);
    });
  });

  describe('create ファクトリ', () => {
    it('violations が空なら passed=true', () => {
      // Arrange / Act
      const actual = StoryReflectionResult.create({ violations: [], warnings: [] });

      // Assert
      expect(actual.passed).toBe(true);
    });

    it('violations が 1 件以上なら passed=false', () => {
      // Arrange
      const violation = createViolation('US-001');

      // Act
      const actual = StoryReflectionResult.create({ violations: [violation], warnings: [] });

      // Assert
      expect(actual.passed).toBe(false);
    });
  });

  describe('isBlocked', () => {
    it('violations が 1 件以上あれば true', () => {
      // Arrange
      const sut = StoryReflectionResult.create({
        violations: [createViolation('US-002')],
        warnings: [],
      });

      // Act
      const actual = sut.isBlocked();

      // Assert
      expect(actual).toBe(true);
    });
  });
});
```

### 4.6 `StoryReflectionChecker` ドメインサービス

```typescript
const buildFsPort = (
  overrides: Partial<StoryReflectionFileSystemPort> = {},
): StoryReflectionFileSystemPort => ({
  listStoryDirectories: vi.fn().mockResolvedValue([]),
  fileExists: vi.fn().mockResolvedValue(false),
  fileContainsStoryAnnotation: vi.fn().mockResolvedValue(false),
  ...overrides,
});

target('StoryReflectionChecker.check', () => {
  describe('config.enabled=false の場合', () => {
    it('fsPort を呼ばずに pass を返す', async () => {
      // Arrange
      const fsPort = buildFsPort();
      const sut = new StoryReflectionChecker(fsPort);
      const config = StoryReflectionConfig.disabled();

      // Act
      const actual = await sut.check('order', config);

      // Assert
      expect(actual.passed).toBe(true);
      expect(fsPort.listStoryDirectories).not.toHaveBeenCalled();
    });
  });

  describe('inception ディレクトリが空の場合', () => {
    it('pass を返す', async () => {
      // Arrange
      const fsPort = buildFsPort({
        listStoryDirectories: vi.fn().mockResolvedValue([]),
      });
      const sut = new StoryReflectionChecker(fsPort);

      // Act
      const actual = await sut.check('order', createStoryReflectionConfig());

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.violations).toHaveLength(0);
    });
  });

  describe('inception ファイルが存在しない storyId', () => {
    it('違反に計上されない', async () => {
      // Arrange
      const fsPort = buildFsPort({
        listStoryDirectories: vi.fn().mockResolvedValue(['US-001']),
        fileExists: vi.fn().mockResolvedValue(false),
      });
      const sut = new StoryReflectionChecker(fsPort);

      // Act
      const actual = await sut.check('order', createStoryReflectionConfig());

      // Assert
      expect(actual.passed).toBe(true);
      expect(fsPort.fileContainsStoryAnnotation).not.toHaveBeenCalled();
    });
  });

  describe('inception 存在 AND product に @story-id あり', () => {
    it('passed=true を返す', async () => {
      // Arrange
      const fsPort = buildFsPort({
        listStoryDirectories: vi.fn().mockResolvedValue(['US-001']),
        fileExists: vi.fn().mockResolvedValue(true),
        fileContainsStoryAnnotation: vi.fn().mockResolvedValue(true),
      });
      const sut = new StoryReflectionChecker(fsPort);

      // Act
      const actual = await sut.check('order', createStoryReflectionConfig());

      // Assert
      expect(actual.passed).toBe(true);
    });
  });

  describe('inception 存在 AND product に @story-id なし AND required=true', () => {
    it('violations に計上し passed=false を返す', async () => {
      // Arrange
      const fsPort = buildFsPort({
        listStoryDirectories: vi.fn().mockResolvedValue(['US-001']),
        fileExists: vi.fn().mockResolvedValue(true),
        fileContainsStoryAnnotation: vi.fn().mockResolvedValue(false),
      });
      const sut = new StoryReflectionChecker(fsPort);
      const config = createStoryReflectionConfig({
        mappings: [createStoryReflectionMapping({ required: true })],
      });

      // Act
      const actual = await sut.check('order', config);

      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.violations).toHaveLength(1);
      expect(actual.violations[0].storyId).toBe('US-001');
      expect(actual.violations[0].productPath).toBe(
        'docs/product/construction/order/logical_design.md',
      );
    });
  });

  describe('inception 存在 AND product に @story-id なし AND required=false', () => {
    it('warnings に計上し passed=true を返す', async () => {
      // Arrange
      const fsPort = buildFsPort({
        listStoryDirectories: vi.fn().mockResolvedValue(['US-001']),
        fileExists: vi.fn().mockResolvedValue(true),
        fileContainsStoryAnnotation: vi.fn().mockResolvedValue(false),
      });
      const sut = new StoryReflectionChecker(fsPort);
      const config = createStoryReflectionConfig({
        mappings: [createStoryReflectionMapping({ required: false })],
      });

      // Act
      const actual = await sut.check('order', config);

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.warnings).toHaveLength(1);
      expect(actual.violations).toHaveLength(0);
    });
  });

  describe('複数 storyId × 複数 mapping', () => {
    it('全組み合わせが検査され違反が正しく集計される', async () => {
      // Arrange
      const fsPort = buildFsPort({
        listStoryDirectories: vi.fn().mockResolvedValue(['US-001', 'US-002']),
        fileExists: vi.fn().mockResolvedValue(true),
        fileContainsStoryAnnotation: vi
          .fn()
          .mockImplementation(async (_path: string, storyId: string) => storyId === 'US-001'),
      });
      const sut = new StoryReflectionChecker(fsPort);
      const config = createStoryReflectionConfig({
        mappings: [createStoryReflectionMapping({ required: true })],
      });

      // Act
      const actual = await sut.check('order', config);

      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.violations.map((v) => v.storyId)).toEqual(['US-002']);
    });
  });

  describe('複数 mapping (required + optional) の混在', () => {
    it('required 違反は violations、optional 違反は warnings に振り分けられる', async () => {
      // Arrange
      const requiredMapping = createStoryReflectionMapping({ required: true });
      const optionalMapping = StoryReflectionMapping.create({
        inception: 'docs/inception/{unit}/{storyId}/uiux_design.md',
        product: 'docs/product/construction/{unit}/uiux_design.md',
        required: false,
      });
      const fsPort = buildFsPort({
        listStoryDirectories: vi.fn().mockResolvedValue(['US-001']),
        fileExists: vi.fn().mockResolvedValue(true),
        fileContainsStoryAnnotation: vi.fn().mockResolvedValue(false),
      });
      const sut = new StoryReflectionChecker(fsPort);
      const config = StoryReflectionConfig.create({
        enabled: true,
        mappings: [requiredMapping, optionalMapping],
      });

      // Act
      const actual = await sut.check('order', config);

      // Assert
      expect(actual.violations).toHaveLength(1);
      expect(actual.warnings).toHaveLength(1);
      expect(actual.passed).toBe(false);
    });
  });

  describe('fsPort エラー伝播', () => {
    it('listStoryDirectories が reject した場合はエラーが伝播する', async () => {
      // Arrange
      const fsPort = buildFsPort({
        listStoryDirectories: vi.fn().mockRejectedValue(new Error('fs error')),
      });
      const sut = new StoryReflectionChecker(fsPort);

      // Act
      const actual = sut.check('order', createStoryReflectionConfig());

      // Assert
      await expect(actual).rejects.toThrow('fs error');
    });
  });

  describe('resolve されたパスが fsPort に渡る', () => {
    it('fileExists と fileContainsStoryAnnotation に正しい展開済みパスが渡される', async () => {
      // Arrange
      const fsPort = buildFsPort({
        listStoryDirectories: vi.fn().mockResolvedValue(['US-001']),
        fileExists: vi.fn().mockResolvedValue(true),
        fileContainsStoryAnnotation: vi.fn().mockResolvedValue(true),
      });
      const sut = new StoryReflectionChecker(fsPort);

      // Act
      await sut.check('order', createStoryReflectionConfig());

      // Assert
      expect(fsPort.fileExists).toHaveBeenCalledWith(
        'docs/inception/order/US-001/logical_design.md',
      );
      expect(fsPort.fileContainsStoryAnnotation).toHaveBeenCalledWith(
        'docs/product/construction/order/logical_design.md',
        'US-001',
      );
    });
  });
});
```

**網羅観点**: `check` メソッドの全分岐（enabled=false / 空ディレクトリ / inception 不存在 / 反映済 / required 違反 / optional 違反 / 混在 / エラー伝播 / パス展開検証）。

### 4.7 プリセット別 `STORY_REFLECTION_DEFAULTS` 静的定義

```typescript
target('FULL_STORY_REFLECTION_DEFAULTS', () => {
  describe('full プリセットのデフォルト mappings', () => {
    it('enabled=true である', () => {
      // Arrange / Act
      const actual = FULL_STORY_REFLECTION_DEFAULTS.enabled;

      // Assert
      expect(actual).toBe(true);
    });

    it('logical_design + domain_model + uiux_design の 3 mapping を持つ', () => {
      // Arrange / Act
      const actual = FULL_STORY_REFLECTION_DEFAULTS.mappings;

      // Assert
      expect(actual).toHaveLength(3);
      expect(actual.map((m) => m.inception)).toEqual([
        'docs/inception/{unit}/{storyId}/logical_design.md',
        'docs/inception/{unit}/{storyId}/domain_model.md',
        'docs/inception/{unit}/{storyId}/uiux_design.md',
      ]);
    });

    it('logical_design と domain_model は required=true、uiux_design は required=false', () => {
      // Arrange / Act
      const actual = FULL_STORY_REFLECTION_DEFAULTS.mappings.map((m) => m.required);

      // Assert
      expect(actual).toEqual([true, true, false]);
    });
  });
});

target('STANDARD_STORY_REFLECTION_DEFAULTS', () => {
  describe('standard プリセットのデフォルト mappings', () => {
    it('enabled=true かつ 2 mapping を持つ', () => {
      // Arrange / Act
      const actual = STANDARD_STORY_REFLECTION_DEFAULTS;

      // Assert
      expect(actual.enabled).toBe(true);
      expect(actual.mappings).toHaveLength(2);
    });

    it('logical_design は required=true、domain_model は required=false', () => {
      // Arrange / Act
      const actual = STANDARD_STORY_REFLECTION_DEFAULTS.mappings.map((m) => m.required);

      // Assert
      expect(actual).toEqual([true, false]);
    });
  });
});

target('MINIMAL_STORY_REFLECTION_DEFAULTS', () => {
  describe('minimal プリセットのデフォルト mappings', () => {
    it('enabled=false かつ mappings が空である', () => {
      // Arrange / Act
      const actual = MINIMAL_STORY_REFLECTION_DEFAULTS;

      // Assert
      expect(actual.enabled).toBe(false);
      expect(actual.mappings).toHaveLength(0);
    });
  });
});
```

---

## 5. QA（不明点・確認事項）

なし。A-2 実装は既に完了しており、本計画は実装済みコードに対応するテストロジック設計を遡及的に明文化するものである。

---

## 6. 前提条件・リスク

- `PhaseStructure.createDefault` のプリセット別ロードは `full-phase-nodes.ts` / `standard-phase-nodes.ts` / `minimal-phase-nodes.ts` の静的定義に依存する。定義変更時は本計画のテスト期待値（ノード名・件数）も連動して更新すること
- `StoryReflectionMapping` の不変条件は `{unit}` と `{storyId}` プレースホルダ必須に縛られている。将来的に static path をサポートする場合は本計画の異常系テストを見直す必要がある
- `StoryReflectionChecker` は `Promise.all` を使わず逐次処理している。並行化した場合もモック呼び出し回数と violations 集計順序が安定するようテストを組むこと
- プリセット別 defaults は module-level 定数であり、import 時に `StoryReflectionMapping.create` が実行される。生成時例外があれば import 失敗するため、defaults テストは実質的に構築健全性の回帰テストとしても機能する
- `'default'` プリセットの後方互換（→`'full'` フォールバック）は v1.0 移行期間専用。将来削除する際は `PhaseCustomizationPolicy` と `PhaseStructure` の両テストを同時に削除すること
