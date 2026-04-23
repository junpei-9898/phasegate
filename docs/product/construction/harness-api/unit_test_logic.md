# ユニットテストロジック設計: harness-api

@story-id H09-01
@story-id H09-02
@story-id H09-03
@story-id H09-04
> **Unit ID**: harness-api
> **作成日**: 2026-03-19
> **Wave**: 2（コア品質機構）
> **参照**: unit_test_design.md, unit_test_logic_plan.md, docs/principles/testing-rules.md

---

## 1. テストファイル構成

| テストファイル | 対象クラス | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/unit/harness-api/cli-command-definition.test.ts` | CliCommandDefinition（VO） | 9 |
| `scripts/harness/__tests__/unit/harness-api/harness-api-response.test.ts` | HarnessApiResponse\<T\>（VO） | 8 |
| `scripts/harness/__tests__/unit/harness-api/check-ready-result.test.ts` | CheckReadyResult（VO） | 5 |
| `scripts/harness/__tests__/unit/harness-api/phase-info.test.ts` | PhaseInfo（VO） | 4 |
| `scripts/harness/__tests__/unit/harness-api/ci-check-result.test.ts` | CiCheckResult（VO） | 6 |
| `scripts/harness/__tests__/unit/harness-api/drift-report-summary.test.ts` | DriftReportSummary（VO） | 4 |
| `scripts/harness/__tests__/unit/harness-api/harness-status-summary.test.ts` | HarnessStatusSummary（VO） | 4 |
| `scripts/harness/__tests__/unit/harness-api/artifact-scan-result.test.ts` | ArtifactScanResult（VO） | 4 |
| `scripts/harness/__tests__/unit/harness-api/layer-health.test.ts` | LayerHealth（VO） | 5 |
| `scripts/harness/__tests__/unit/harness-api/command-input-spec.test.ts` | CommandInputSpec（VO） | 3 |
| `scripts/harness/__tests__/unit/harness-api/exit-code-spec.test.ts` | ExitCodeSpec（VO） | 3 |
| `scripts/harness/__tests__/unit/harness-api/command-registry.test.ts` | CommandRegistry（DS） | 8 |
| `scripts/harness/__tests__/unit/harness-api/command-dispatch-service.test.ts` | CommandDispatchService（DS） | 12 |
| `scripts/harness/__tests__/unit/harness-api/status-derivation-service.test.ts` | StatusDerivationService（DS） | 8 |

※境界値テスト（UT-BND-*）は各ファイルに分散して記載する（§5 参照）。

---

## 2. 共通ヘルパー・ファクトリ

`scripts/harness/__tests__/helpers/test-helpers.ts` に以下のファクトリ関数を追加する。

```typescript
import { describe } from 'vitest';

/** テスト対象のメソッド/クラスを示す describe エイリアス */
export const target = describe;

/** テストの前提条件を示す describe エイリアス */
export const context = describe;

// ─── harness-api ファクトリ ───────────────────────────────────────────

export const createCliCommandDefinition = (commandName = 'phasegate:check-ready') =>
  CliCommandDefinition.create(commandName);

export const createHarnessApiResponse = <T>(
  overrides: Partial<{ status: string; errors: HarnessError[]; summary: string; data: T }> = {}
) =>
  HarnessApiResponse.create({
    status: 'pass',
    errors: [],
    summary: 'チェック完了',
    data: undefined,
    ...overrides,
  });

export const createCheckReadyResult = (
  overrides: Partial<{ stories: { storyId: string; passed: boolean }[]; allPassed: boolean }> = {}
) =>
  CheckReadyResult.create({
    stories: [{ storyId: 'H09-01', passed: true }],
    allPassed: true,
    ...overrides,
  });

export const createCiCheckResult = (
  overrides: Partial<{ validatorResults: { validatorId: string; passed: boolean }[]; allPassed: boolean }> = {}
) =>
  CiCheckResult.create({
    validatorResults: [{ validatorId: 'L2-001', passed: true }],
    allPassed: true,
    ...overrides,
  });

export const createDriftReportSummary = (
  overrides: Partial<{ drifts: DriftItem[]; totalCount: number }> = {}
) =>
  DriftReportSummary.create({
    drifts: [],
    totalCount: 0,
    ...overrides,
  });

export const createLayerHealth = (
  overrides: Partial<{ layerId: string; enabled: boolean; lastResult?: string }> = {}
) =>
  LayerHealth.create({
    layerId: 'L1',
    enabled: true,
    lastResult: 'pass',
    ...overrides,
  });

export const createArtifactScanResult = (
  overrides: Partial<{ scannedPaths: string[]; foundArtifacts: ArtifactPresence[]; derivedLayerHealth: LayerHealth[] }> = {}
) =>
  ArtifactScanResult.create({
    scannedPaths: [],
    foundArtifacts: [],
    derivedLayerHealth: [],
    ...overrides,
  });
```

補足:
- 各ファクトリは `overrides` を受け取りデフォルト値と deepMerge（またはスプレッド）する。
- 実装公開 API（`create` / `reconstitute` / コンストラクタ）に合わせて読み替える。
- ポートモックは `vi.fn()` で都度生成し、`mockResolvedValue` / `mockReturnValue` で値を設定する。

---

## 3. テストケース詳細ロジック

### 3.1 `cli-command-definition.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers';

target('CliCommandDefinition', () => {
  describe('有効なコマンド名でCliCommandDefinitionを生成する', () => {
    // UT-CCD-001
    it('phasegate:check-readyからCliCommandDefinitionが生成されること', () => {
      // Arrange
      const input = 'phasegate:check-ready';
      // Act
      const actual = CliCommandDefinition.create(input);
      // Assert
      expect(actual.commandName).toBe('phasegate:check-ready');
    });

    // UT-CCD-002
    it('phasegate:impact-analysis（args指定あり）からCliCommandDefinitionが生成されること', () => {
      // Arrange
      const input = 'phasegate:impact-analysis';
      const inputSpec = CommandInputSpec.create({
        args: [{ name: 'storyId', type: 'string' }],
        flags: [],
      });
      // Act
      const actual = CliCommandDefinition.create(input, { inputSpec });
      // Assert
      expect(actual.commandName).toBe('phasegate:impact-analysis');
      expect(actual.inputSpec.args).toHaveLength(1);
    });
  });

  context('コマンド名が空文字列の場合', () => {
    // UT-CCD-003
    it('エラーをthrowすること', () => {
      // Arrange
      const input = '';
      // Act
      const actual = () => CliCommandDefinition.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });

  context('harness:プレフィックスがない場合', () => {
    // UT-CCD-004
    it('check-readyからはエラーをthrowすること', () => {
      // Arrange
      const input = 'check-ready';
      // Act
      const actual = () => CliCommandDefinition.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });

  context('プレフィックスのみでコマンド名部分が空の場合', () => {
    // UT-CCD-005
    it('harness:からはエラーをthrowすること', () => {
      // Arrange
      const input = 'harness:';
      // Act
      const actual = () => CliCommandDefinition.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });

  describe('等値性テスト', () => {
    // UT-CCD-006
    it('同一commandNameを持つ2つのCliCommandDefinitionが等価であること', () => {
      // Arrange
      const a = CliCommandDefinition.create('phasegate:check-ready');
      const b = CliCommandDefinition.create('phasegate:check-ready');
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-CCD-007
    it('異なるcommandNameを持つ2つのCliCommandDefinitionが非等価であること', () => {
      // Arrange
      const a = CliCommandDefinition.create('phasegate:check-ready');
      const b = CliCommandDefinition.create('phasegate:ci-check');
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });

  describe('不変条件テスト', () => {
    // UT-CCD-008
    it('生成後にcommandNameプロパティを変更しても反映されないこと', () => {
      // Arrange
      const sut = CliCommandDefinition.create('phasegate:check-ready');
      // Act
      // @ts-expect-error 意図的なimmutabilityテスト
      const actual = () => { sut.commandName = 'harness:other'; };
      // Assert
      // TypeScript strict + Object.freeze または readonly によって書き換え不可
      expect(sut.commandName).toBe('phasegate:check-ready');
    });

    // UT-CCD-009
    it('コマンド名部分が数字始まりのharness:1cmdはエラーをthrowすること', () => {
      // Arrange
      const input = 'harness:1cmd';
      // Act
      const actual = () => CliCommandDefinition.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });
});
```

境界値: UT-BND-001（`harness:` のみ）、UT-BND-002（`HARNESS:check-ready` 大文字プレフィックス）をこのファイル末尾に追加する。

---

### 3.2 `harness-api-response.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context, createHarnessApiResponse } from '../../helpers/test-helpers';

target('HarnessApiResponse', () => {
  describe('正常系: 有効な引数でHarnessApiResponseを生成する', () => {
    // UT-HAR-001
    it('status=passでHarnessApiResponseが生成されること', () => {
      // Arrange
      const input = { status: 'pass', errors: [], summary: 'チェック完了', data: { count: 1 } };
      // Act
      const actual = HarnessApiResponse.create(input);
      // Assert
      expect(actual.status).toBe('pass');
      expect(actual.errors).toHaveLength(0);
    });

    // UT-HAR-002
    it('status=failかつerrorsに1件以上でHarnessApiResponseが生成されること', () => {
      // Arrange
      const error = buildHarnessError();
      const input = { status: 'fail', errors: [error], summary: '検証失敗' };
      // Act
      const actual = HarnessApiResponse.create(input);
      // Assert
      expect(actual.status).toBe('fail');
      expect(actual.errors).toHaveLength(1);
    });

    // UT-HAR-003
    it('status=errorかつerrorsに1件以上でHarnessApiResponseが生成されること', () => {
      // Arrange
      const error = buildHarnessError();
      const input = { status: 'error', errors: [error], summary: '実行時エラー' };
      // Act
      const actual = HarnessApiResponse.create(input);
      // Assert
      expect(actual.status).toBe('error');
    });

    // UT-HAR-004
    it('status=passでdata省略（undefined）のHarnessApiResponseが生成されること', () => {
      // Arrange
      const input = { status: 'pass', errors: [], summary: 'チェック完了' };
      // Act
      const actual = HarnessApiResponse.create(input);
      // Assert
      expect(actual.data).toBeUndefined();
    });
  });

  describe('不変条件テスト', () => {
    // UT-HAR-005 (INV-3: passのときerrorsは空配列)
    it('status=passかつerrorsに1件でエラーをthrowすること', () => {
      // Arrange
      const error = buildHarnessError();
      const input = { status: 'pass', errors: [error], summary: 'チェック完了' };
      // Act
      const actual = () => HarnessApiResponse.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-HAR-006 (INV-4: failのときerrorsは1件以上)
    it('status=failかつerrors=[]でエラーをthrowすること', () => {
      // Arrange
      const input = { status: 'fail', errors: [], summary: '検証失敗' };
      // Act
      const actual = () => HarnessApiResponse.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-HAR-007 (INV-4: errorのときerrorsは1件以上)
    it('status=errorかつerrors=[]でエラーをthrowすること', () => {
      // Arrange
      const input = { status: 'error', errors: [], summary: '実行時エラー' };
      // Act
      const actual = () => HarnessApiResponse.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });

  describe('等値性テスト', () => {
    // UT-HAR-008
    it('同一内容を持つ2つのHarnessApiResponseが等価であること', () => {
      // Arrange
      const a = createHarnessApiResponse({ summary: 'テスト' });
      const b = createHarnessApiResponse({ summary: 'テスト' });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });
  });
});
```

境界値: UT-BND-003（status=pass, errors に空でないHarnessError配列1件）をこのファイル末尾に追加する。

---

### 3.3 `check-ready-result.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context, createCheckReadyResult } from '../../helpers/test-helpers';

target('CheckReadyResult', () => {
  describe('正常系: 有効な引数でCheckReadyResultを生成する', () => {
    // UT-CRR-001
    it('全stories passed=trueかつallPassed=trueでCheckReadyResultが生成されること', () => {
      // Arrange
      const input = {
        stories: [{ storyId: 'H09-01', passed: true }, { storyId: 'H09-02', passed: true }],
        allPassed: true,
      };
      // Act
      const actual = CheckReadyResult.create(input);
      // Assert
      expect(actual.allPassed).toBe(true);
      expect(actual.stories).toHaveLength(2);
    });

    // UT-CRR-002
    it('一部stories passed=falseかつallPassed=falseでCheckReadyResultが生成されること', () => {
      // Arrange
      const input = {
        stories: [{ storyId: 'H09-01', passed: true }, { storyId: 'H09-02', passed: false }],
        allPassed: false,
      };
      // Act
      const actual = CheckReadyResult.create(input);
      // Assert
      expect(actual.allPassed).toBe(false);
    });

    // UT-CRR-003
    it('stories=[]（空）でCheckReadyResultが生成されること', () => {
      // Arrange
      const input = { stories: [], allPassed: true };
      // Act
      const actual = CheckReadyResult.create(input);
      // Assert
      expect(actual.stories).toHaveLength(0);
    });
  });

  describe('不変条件テスト', () => {
    // UT-CRR-004
    it('storiesにpassed=falseがあるのにallPassed=trueでエラーをthrowすること', () => {
      // Arrange
      const input = {
        stories: [{ storyId: 'H09-01', passed: true }, { storyId: 'H09-02', passed: false }],
        allPassed: true,
      };
      // Act
      const actual = () => CheckReadyResult.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-CRR-005
    it('全stories passed=trueなのにallPassed=falseでエラーをthrowすること', () => {
      // Arrange
      const input = {
        stories: [{ storyId: 'H09-01', passed: true }, { storyId: 'H09-02', passed: true }],
        allPassed: false,
      };
      // Act
      const actual = () => CheckReadyResult.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });
});
```

---

### 3.4 `phase-info.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers';

target('PhaseInfo', () => {
  describe('正常系: 有効な引数でPhaseInfoを生成する', () => {
    // UT-PHI-001
    it('unitId=harness-error, currentLevel=1, completedGates=[]でPhaseInfoが生成されること', () => {
      // Arrange
      const input = {
        unitId: 'harness-error',
        currentLevel: 1,
        currentPhase: 'construction',
        completedGates: [],
      };
      // Act
      const actual = PhaseInfo.create(input);
      // Assert
      expect(actual.unitId).toBe('harness-error');
      expect(actual.currentLevel).toBe(1);
    });

    // UT-PHI-002
    it('currentLevel=4, completedGates=[L1,L2,L3]でPhaseInfoが生成されること', () => {
      // Arrange
      const input = {
        unitId: 'config-foundation',
        currentLevel: 4,
        currentPhase: 'construction',
        completedGates: ['L1', 'L2', 'L3'],
      };
      // Act
      const actual = PhaseInfo.create(input);
      // Assert
      expect(actual.completedGates).toEqual(['L1', 'L2', 'L3']);
    });
  });

  context('unitIdが空文字列の場合', () => {
    // UT-PHI-003
    it('エラーをthrowすること', () => {
      // Arrange
      const input = { unitId: '', currentLevel: 1, currentPhase: 'construction', completedGates: [] };
      // Act
      const actual = () => PhaseInfo.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });

  context('currentLevelが0（正数でない）の場合', () => {
    // UT-PHI-004
    it('エラーをthrowすること', () => {
      // Arrange
      const input = { unitId: 'harness-error', currentLevel: 0, currentPhase: 'construction', completedGates: [] };
      // Act
      const actual = () => PhaseInfo.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });
});
```

境界値: UT-BND-012（currentLevel=-1 負数）をこのファイル末尾に追加する。

---

### 3.5 `ci-check-result.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context, createCiCheckResult } from '../../helpers/test-helpers';

target('CiCheckResult', () => {
  describe('正常系: 有効な引数でCiCheckResultを生成する', () => {
    // UT-CCR-001
    it('validatorResults=[1件passed=true], allPassed=trueでCiCheckResultが生成されること', () => {
      // Arrange
      const input = {
        validatorResults: [{ validatorId: 'L2-001', passed: true }],
        allPassed: true,
      };
      // Act
      const actual = CiCheckResult.create(input);
      // Assert
      expect(actual.allPassed).toBe(true);
    });

    // UT-CCR-002
    it('一部passed=falseを含む複数件でCiCheckResultが生成されること', () => {
      // Arrange
      const input = {
        validatorResults: [
          { validatorId: 'L2-001', passed: true },
          { validatorId: 'L2-002', passed: false },
        ],
        allPassed: false,
      };
      // Act
      const actual = CiCheckResult.create(input);
      // Assert
      expect(actual.allPassed).toBe(false);
      expect(actual.validatorResults).toHaveLength(2);
    });
  });

  describe('不変条件テスト', () => {
    // UT-CCR-003 (INV-5: validatorResultsは1件以上)
    it('validatorResults=[]でエラーをthrowすること', () => {
      // Arrange
      const input = { validatorResults: [], allPassed: true };
      // Act
      const actual = () => CiCheckResult.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-CCR-004 (INV-6: allPassed !== 全件passed論理積)
    it('全件passed=trueなのにallPassed=falseでエラーをthrowすること', () => {
      // Arrange
      const input = {
        validatorResults: [{ validatorId: 'L2-001', passed: true }, { validatorId: 'L2-002', passed: true }],
        allPassed: false,
      };
      // Act
      const actual = () => CiCheckResult.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-CCR-005 (INV-6逆)
    it('passed=falseを含む結果でallPassed=trueでエラーをthrowすること', () => {
      // Arrange
      const input = {
        validatorResults: [{ validatorId: 'L2-001', passed: true }, { validatorId: 'L2-002', passed: false }],
        allPassed: true,
      };
      // Act
      const actual = () => CiCheckResult.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-CCR-006 (INV-6 正常系)
    it('全件passed=true, allPassed=trueで正常に生成されること', () => {
      // Arrange
      const input = {
        validatorResults: [{ validatorId: 'L2-001', passed: true }, { validatorId: 'L2-002', passed: true }],
        allPassed: true,
      };
      // Act
      const actual = CiCheckResult.create(input);
      // Assert
      expect(actual.allPassed).toBe(true);
    });
  });
});
```

境界値: UT-BND-004（validatorResults=0件）はUT-CCR-003と統合済み。

---

### 3.6 `drift-report-summary.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context, createDriftReportSummary } from '../../helpers/test-helpers';

target('DriftReportSummary', () => {
  describe('正常系: 有効な引数でDriftReportSummaryを生成する', () => {
    // UT-DRS-001
    it('drifts=[], totalCount=0でDriftReportSummaryが生成されること', () => {
      // Arrange
      const input = { drifts: [], totalCount: 0 };
      // Act
      const actual = DriftReportSummary.create(input);
      // Assert
      expect(actual.totalCount).toBe(0);
      expect(actual.drifts).toHaveLength(0);
    });

    // UT-DRS-002
    it('drifts=[2件], totalCount=2でDriftReportSummaryが生成されること', () => {
      // Arrange
      const drifts = [buildDriftItem('D-001'), buildDriftItem('D-002')];
      const input = { drifts, totalCount: 2 };
      // Act
      const actual = DriftReportSummary.create(input);
      // Assert
      expect(actual.totalCount).toBe(2);
    });
  });

  describe('不変条件テスト', () => {
    // UT-DRS-003 (INV-7: totalCount === drifts.length)
    it('drifts=2件なのにtotalCount=3でエラーをthrowすること', () => {
      // Arrange
      const drifts = [buildDriftItem('D-001'), buildDriftItem('D-002')];
      const input = { drifts, totalCount: 3 };
      // Act
      const actual = () => DriftReportSummary.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-DRS-004 (INV-7逆)
    it('drifts=2件なのにtotalCount=0でエラーをthrowすること', () => {
      // Arrange
      const drifts = [buildDriftItem('D-001'), buildDriftItem('D-002')];
      const input = { drifts, totalCount: 0 };
      // Act
      const actual = () => DriftReportSummary.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });
});
```

境界値: UT-BND-005（drifts=3件, totalCount=3 正常境界）、UT-BND-006（drifts=3件, totalCount=4 INV-7違反）をこのファイル末尾に追加する。

---

### 3.7 `harness-status-summary.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context, createLayerHealth } from '../../helpers/test-helpers';

target('HarnessStatusSummary', () => {
  describe('正常系: 4レイヤー全て揃った状態でHarnessStatusSummaryを生成する', () => {
    // UT-HSS-001
    it('L1/L2/L3/L4の4件でHarnessStatusSummaryが生成されること', () => {
      // Arrange
      const layers = [
        createLayerHealth({ layerId: 'L1' }),
        createLayerHealth({ layerId: 'L2' }),
        createLayerHealth({ layerId: 'L3' }),
        createLayerHealth({ layerId: 'L4' }),
      ];
      const input = { layers, phaseGateSummary: buildPhaseGateSummary(), presetInfo: buildPresetInfo(), configSummary: buildConfigSummary() };
      // Act
      const actual = HarnessStatusSummary.create(input);
      // Assert
      expect(actual.layers).toHaveLength(4);
    });
  });

  describe('不変条件テスト（INV: 4レイヤー必須）', () => {
    // UT-HSS-002
    it('layers=[]でエラーをthrowすること', () => {
      // Arrange
      const input = { layers: [], phaseGateSummary: buildPhaseGateSummary(), presetInfo: buildPresetInfo(), configSummary: buildConfigSummary() };
      // Act
      const actual = () => HarnessStatusSummary.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-HSS-003
    it('layers=[L1/L2/L3]（L4欠落）でエラーをthrowすること', () => {
      // Arrange
      const layers = [
        createLayerHealth({ layerId: 'L1' }),
        createLayerHealth({ layerId: 'L2' }),
        createLayerHealth({ layerId: 'L3' }),
      ];
      const input = { layers, phaseGateSummary: buildPhaseGateSummary(), presetInfo: buildPresetInfo(), configSummary: buildConfigSummary() };
      // Act
      const actual = () => HarnessStatusSummary.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-HSS-004
    it('layers=[L1/L2/L3/L4/L1]（L1重複）でエラーをthrowすること', () => {
      // Arrange
      const layers = [
        createLayerHealth({ layerId: 'L1' }),
        createLayerHealth({ layerId: 'L2' }),
        createLayerHealth({ layerId: 'L3' }),
        createLayerHealth({ layerId: 'L4' }),
        createLayerHealth({ layerId: 'L1' }),
      ];
      const input = { layers, phaseGateSummary: buildPhaseGateSummary(), presetInfo: buildPresetInfo(), configSummary: buildConfigSummary() };
      // Act
      const actual = () => HarnessStatusSummary.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });
});
```

補足: `buildPhaseGateSummary()`, `buildPresetInfo()`, `buildConfigSummary()` は最小有効値を返すローカルファクトリとして各テストファイルの先頭に定義する。

---

### 3.8 `artifact-scan-result.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context, createArtifactScanResult, createLayerHealth } from '../../helpers/test-helpers';

target('ArtifactScanResult', () => {
  describe('正常系: 有効な引数でArtifactScanResultを生成する', () => {
    // UT-ASR-001
    it('scannedPaths/foundArtifacts/derivedLayerHealth全て有効でArtifactScanResultが生成されること', () => {
      // Arrange
      const layers = [
        createLayerHealth({ layerId: 'L1' }),
        createLayerHealth({ layerId: 'L2' }),
        createLayerHealth({ layerId: 'L3' }),
        createLayerHealth({ layerId: 'L4' }),
      ];
      const input = {
        scannedPaths: ['docs/product/construction/harness-error'],
        foundArtifacts: [buildArtifactPresence('domain-model', true)],
        derivedLayerHealth: layers,
      };
      // Act
      const actual = ArtifactScanResult.create(input);
      // Assert
      expect(actual.scannedPaths).toHaveLength(1);
      expect(actual.derivedLayerHealth).toHaveLength(4);
    });

    // UT-ASR-002
    it('全て空でArtifactScanResultが生成されること', () => {
      // Arrange
      const input = { scannedPaths: [], foundArtifacts: [], derivedLayerHealth: [] };
      // Act
      const actual = ArtifactScanResult.create(input);
      // Assert
      expect(actual.foundArtifacts).toHaveLength(0);
    });

    // UT-ASR-003
    it('foundArtifactsにpresent=trueが含まれる場合に正しく格納されること', () => {
      // Arrange
      const artifact = buildArtifactPresence('unit-test-logic', true);
      const input = { scannedPaths: ['scripts/harness'], foundArtifacts: [artifact], derivedLayerHealth: [] };
      // Act
      const actual = ArtifactScanResult.create(input);
      // Assert
      expect(actual.foundArtifacts[0].present).toBe(true);
    });

    // UT-ASR-004
    it('derivedLayerHealthが4件（L1〜L4対応）でArtifactScanResultが生成されること', () => {
      // Arrange
      const layers = ['L1', 'L2', 'L3', 'L4'].map((id) => createLayerHealth({ layerId: id }));
      const input = { scannedPaths: [], foundArtifacts: [], derivedLayerHealth: layers };
      // Act
      const actual = ArtifactScanResult.create(input);
      // Assert
      expect(actual.derivedLayerHealth).toHaveLength(4);
    });
  });
});
```

補足: `buildArtifactPresence(type, present)` はローカルファクトリとして定義する。

---

### 3.9 `layer-health.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context, createLayerHealth } from '../../helpers/test-helpers';

target('LayerHealth', () => {
  describe('正常系: 有効な引数でLayerHealthを生成する', () => {
    // UT-LYH-001
    it('layerId=L1, enabled=true, lastResult=passでLayerHealthが生成されること', () => {
      // Arrange
      const input = { layerId: 'L1', enabled: true, lastResult: 'pass' };
      // Act
      const actual = LayerHealth.create(input);
      // Assert
      expect(actual.layerId).toBe('L1');
      expect(actual.enabled).toBe(true);
      expect(actual.lastResult).toBe('pass');
    });

    // UT-LYH-002
    it('layerId=L4, enabled=false, lastResult省略でLayerHealthが生成されること', () => {
      // Arrange
      const input = { layerId: 'L4', enabled: false };
      // Act
      const actual = LayerHealth.create(input);
      // Assert
      expect(actual.enabled).toBe(false);
      expect(actual.lastResult).toBeUndefined();
    });

    // UT-LYH-003
    it('layerId=L2, enabled=true, lastResult=unknownでLayerHealthが生成されること', () => {
      // Arrange
      const input = { layerId: 'L2', enabled: true, lastResult: 'unknown' };
      // Act
      const actual = LayerHealth.create(input);
      // Assert
      expect(actual.lastResult).toBe('unknown');
    });
  });

  describe('制約テスト: 列挙外の値はエラー', () => {
    // UT-LYH-004
    it('layerId=L5（列挙外）でエラーをthrowすること', () => {
      // Arrange
      const input = { layerId: 'L5', enabled: true };
      // Act
      const actual = () => LayerHealth.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-LYH-005
    it('lastResult=running（列挙外）でエラーをthrowすること', () => {
      // Arrange
      const input = { layerId: 'L1', enabled: true, lastResult: 'running' };
      // Act
      const actual = () => LayerHealth.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });
});
```

境界値: UT-BND-007（lastResult=`fail` 有効値確認）をこのファイル末尾に追加する。

---

### 3.10 `command-input-spec.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers';

target('CommandInputSpec', () => {
  describe('正常系: 有効な引数でCommandInputSpecを生成する', () => {
    // UT-CIS-001
    it('args=[], flags=[]でCommandInputSpecが生成されること', () => {
      // Arrange
      const input = { args: [], flags: [] };
      // Act
      const actual = CommandInputSpec.create(input);
      // Assert
      expect(actual.args).toHaveLength(0);
      expect(actual.flags).toHaveLength(0);
    });

    // UT-CIS-002
    it('args=[{name:unit, type:string}]でCommandInputSpecが生成されること', () => {
      // Arrange
      const input = { args: [{ name: 'unit', type: 'string' }], flags: [] };
      // Act
      const actual = CommandInputSpec.create(input);
      // Assert
      expect(actual.args[0].name).toBe('unit');
    });

    // UT-CIS-003
    it('flags=[{name:json, type:boolean}]でCommandInputSpecが生成されること', () => {
      // Arrange
      const input = { args: [], flags: [{ name: 'json', type: 'boolean' }] };
      // Act
      const actual = CommandInputSpec.create(input);
      // Assert
      expect(actual.flags[0].name).toBe('json');
    });
  });
});
```

---

### 3.11 `exit-code-spec.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers';

target('ExitCodeSpec', () => {
  describe('正常系: 標準定義でExitCodeSpecを生成する', () => {
    // UT-ECS-001
    it('pass=0, fail=1, error=2でExitCodeSpecが生成されること', () => {
      // Arrange
      const input = { pass: 0, fail: 1, error: 2 };
      // Act
      const actual = ExitCodeSpec.create(input);
      // Assert
      expect(actual.pass).toBe(0);
      expect(actual.fail).toBe(1);
      expect(actual.error).toBe(2);
    });
  });

  describe('制約テスト', () => {
    // UT-ECS-002 (pass=0固定 INV)
    it('pass=1（0以外）でエラーをthrowすること', () => {
      // Arrange
      const input = { pass: 1, fail: 2, error: 3 };
      // Act
      const actual = () => ExitCodeSpec.create(input);
      // Assert
      expect(actual).toThrow();
    });

    // UT-ECS-003 (exitCode値の一意性)
    it('error=1（failと同値）でエラーをthrowすること', () => {
      // Arrange
      const input = { pass: 0, fail: 1, error: 1 };
      // Act
      const actual = () => ExitCodeSpec.create(input);
      // Assert
      expect(actual).toThrow();
    });
  });
});
```

境界値: UT-BND-008（pass=0, fail=1, error=2 全て有効値）はUT-ECS-001と統合済み。

---

### 3.12 `command-registry.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context, createCliCommandDefinition } from '../../helpers/test-helpers';

target('CommandRegistry', () => {
  target('registerCommand', () => {
    describe('有効なCliCommandDefinitionを登録する', () => {
      // UT-CRG-001
      it('phasegate:check-readyを登録するとlistAll()で確認できること', () => {
        // Arrange
        const registry = new CommandRegistry();
        const cmd = createCliCommandDefinition('phasegate:check-ready');
        // Act
        registry.registerCommand(cmd);
        const actual = registry.listAll();
        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].commandName).toBe('phasegate:check-ready');
      });

      // UT-CRG-002
      it('8コマンドを順番に登録するとlistAll()で8件返却されること', () => {
        // Arrange
        const registry = new CommandRegistry();
        const commandNames = [
          'phasegate:check-ready', 'phasegate:check-phase', 'phasegate:ci-check',
          'phasegate:detect-drift', 'phasegate:lint', 'phasegate:impact-analysis',
          'phasegate:status', 'phasegate:complete-check',
        ];
        // Act
        for (const name of commandNames) {
          registry.registerCommand(createCliCommandDefinition(name));
        }
        const actual = registry.listAll();
        // Assert
        expect(actual).toHaveLength(8);
      });
    });

    describe('不変条件テスト', () => {
      // UT-CRG-003 (INV-1: 同一CommandName重複禁止)
      it('同一phasegate:check-readyを2回登録すると2回目でエラーをthrowすること', () => {
        // Arrange
        const registry = new CommandRegistry();
        const cmd = createCliCommandDefinition('phasegate:check-ready');
        registry.registerCommand(cmd);
        // Act
        const actual = () => registry.registerCommand(cmd);
        // Assert
        expect(actual).toThrow();
      });

      // UT-CRG-004 (INV-2: harness:プレフィックス必須)
      it('commandName=ci-check（プレフィックスなし）でエラーをthrowすること', () => {
        // Arrange
        const registry = new CommandRegistry();
        // ci-check は CliCommandDefinition.create で既にthrowするので
        // プレフィックスなし文字列を別経路で登録しようとするケースをテスト
        const actual = () => registry.registerCommand({ commandName: 'ci-check' } as CliCommandDefinition);
        // Assert
        expect(actual).toThrow();
      });

      // UT-CRG-005 (INV-2: 空文字列)
      it('commandName=空文字列でエラーをthrowすること', () => {
        // Arrange
        const registry = new CommandRegistry();
        const actual = () => registry.registerCommand({ commandName: '' } as CliCommandDefinition);
        // Assert
        expect(actual).toThrow();
      });
    });
  });

  target('findByName', () => {
    // UT-CRG-006
    it('登録済みのphasegate:ci-checkに対応するCliCommandDefinitionを返すこと', () => {
      // Arrange
      const registry = new CommandRegistry();
      const cmd = createCliCommandDefinition('phasegate:ci-check');
      registry.registerCommand(cmd);
      // Act
      const actual = registry.findByName('phasegate:ci-check');
      // Assert
      expect(actual.commandName).toBe('phasegate:ci-check');
    });

    // UT-CRG-007
    it('未登録のharness:unknown-cmdでエラーをthrowすること', () => {
      // Arrange
      const registry = new CommandRegistry();
      // Act
      const actual = () => registry.findByName('harness:unknown-cmd');
      // Assert
      expect(actual).toThrow();
    });
  });

  target('listAll', () => {
    // UT-CRG-008
    it('3件登録後にlistAll()で3件返却されること', () => {
      // Arrange
      const registry = new CommandRegistry();
      registry.registerCommand(createCliCommandDefinition('phasegate:check-ready'));
      registry.registerCommand(createCliCommandDefinition('phasegate:ci-check'));
      registry.registerCommand(createCliCommandDefinition('phasegate:lint'));
      // Act
      const actual = registry.listAll();
      // Assert
      expect(actual).toHaveLength(3);
    });
  });
});
```

境界値: UT-BND-009（1件も登録されていない状態でfindByName）をこのファイル末尾に追加する。

---

### 3.13 `command-dispatch-service.test.ts`

```typescript
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers';

// ─── ポートモックのセットアップ ───────────────────────────────────────
const buildPorts = (overrides: Partial<CommandDispatchPorts> = {}): CommandDispatchPorts => ({
  validatorExecutionPort: { runL3Validators: vi.fn(), runDriftDetection: vi.fn(), runCompleteCheck: vi.fn() },
  phaseGateQueryPort: { queryAllStories: vi.fn(), queryUnit: vi.fn() },
  biomeLintPort: { runLint: vi.fn() },
  impactAnalysisPort: { analyze: vi.fn() },
  artifactScannerPort: { scan: vi.fn() },
  configQueryPort: { getConfig: vi.fn() },
  ...overrides,
});

target('CommandDispatchService', () => {
  target('dispatch', () => {
    describe('phasegate:check-ready: 全stories passed=trueの場合', () => {
      // UT-CDS-001
      it('status=pass, exitCode=0のHarnessApiResponseを返すこと', async () => {
        // Arrange
        const ports = buildPorts();
        (ports.phaseGateQueryPort.queryAllStories as ReturnType<typeof vi.fn>).mockResolvedValue([
          { storyId: 'H09-01', passed: true },
        ]);
        const sut = new CommandDispatchService(ports);
        // Act
        const actual = await sut.dispatch({ commandName: 'phasegate:check-ready', args: {}, flags: {} });
        // Assert
        expect(actual.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
      });
    });

    context('phasegate:check-ready: 一部passed=falseの場合', () => {
      // UT-CDS-002
      it('status=fail, exitCode=1のHarnessApiResponseを返すこと', async () => {
        // Arrange
        const ports = buildPorts();
        (ports.phaseGateQueryPort.queryAllStories as ReturnType<typeof vi.fn>).mockResolvedValue([
          { storyId: 'H09-01', passed: true },
          { storyId: 'H09-02', passed: false },
        ]);
        const sut = new CommandDispatchService(ports);
        // Act
        const actual = await sut.dispatch({ commandName: 'phasegate:check-ready', args: {}, flags: {} });
        // Assert
        expect(actual.status).toBe('fail');
        expect(actual.exitCode).toBe(1);
      });
    });

    describe('phasegate:check-phase: 有効なunitId指定', () => {
      // UT-CDS-003
      it('status=pass, exitCode=0でPhaseInfoが返ること', async () => {
        // Arrange
        const ports = buildPorts();
        const phaseInfo = buildPhaseInfo('harness-error', 2);
        (ports.phaseGateQueryPort.queryUnit as ReturnType<typeof vi.fn>).mockResolvedValue(phaseInfo);
        const sut = new CommandDispatchService(ports);
        // Act
        const actual = await sut.dispatch({ commandName: 'phasegate:check-phase', args: { unit: 'harness-error' }, flags: {} });
        // Assert
        expect(actual.status).toBe('pass');
        expect(actual.data).toEqual(phaseInfo);
      });
    });

    describe('phasegate:ci-check: 全validators passed=true', () => {
      // UT-CDS-004
      it('status=pass, exitCode=0のHarnessApiResponseを返すこと', async () => {
        // Arrange
        const ports = buildPorts();
        (ports.validatorExecutionPort.runL3Validators as ReturnType<typeof vi.fn>).mockResolvedValue([
          { validatorId: 'L2-001', passed: true },
        ]);
        const sut = new CommandDispatchService(ports);
        // Act
        const actual = await sut.dispatch({ commandName: 'phasegate:ci-check', args: {}, flags: {} });
        // Assert
        expect(actual.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
      });
    });

    describe('phasegate:detect-drift: 乖離なし', () => {
      // UT-CDS-005
      it('status=pass, exitCode=0のHarnessApiResponseを返すこと', async () => {
        // Arrange
        const ports = buildPorts();
        (ports.validatorExecutionPort.runDriftDetection as ReturnType<typeof vi.fn>).mockResolvedValue([]);
        const sut = new CommandDispatchService(ports);
        // Act
        const actual = await sut.dispatch({ commandName: 'phasegate:detect-drift', args: {}, flags: {} });
        // Assert
        expect(actual.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
      });
    });

    context('phasegate:detect-drift: 1件以上の乖離あり', () => {
      // UT-CDS-006
      it('status=fail, exitCode=1のHarnessApiResponseを返すこと', async () => {
        // Arrange
        const ports = buildPorts();
        (ports.validatorExecutionPort.runDriftDetection as ReturnType<typeof vi.fn>).mockResolvedValue([
          buildDriftItem('D-001'),
        ]);
        const sut = new CommandDispatchService(ports);
        // Act
        const actual = await sut.dispatch({ commandName: 'phasegate:detect-drift', args: {}, flags: {} });
        // Assert
        expect(actual.status).toBe('fail');
        expect(actual.exitCode).toBe(1);
      });
    });

    describe('phasegate:lint: 正常終了', () => {
      // UT-CDS-007
      it('status=pass, data=undefined, exitCode=0のHarnessApiResponseを返すこと', async () => {
        // Arrange
        const ports = buildPorts();
        (ports.biomeLintPort.runLint as ReturnType<typeof vi.fn>).mockResolvedValue({ passed: true });
        const sut = new CommandDispatchService(ports);
        // Act
        const actual = await sut.dispatch({ commandName: 'phasegate:lint', args: {}, flags: {} });
        // Assert
        expect(actual.status).toBe('pass');
        expect(actual.data).toBeUndefined();
        expect(actual.exitCode).toBe(0);
      });
    });

    describe('phasegate:impact-analysis: 有効なstoryId指定', () => {
      // UT-CDS-008
      it('status=pass, exitCode=0でImpactAnalysisResultが返ること', async () => {
        // Arrange
        const ports = buildPorts();
        const impactResult = buildImpactAnalysisResult('H09-01');
        (ports.impactAnalysisPort.analyze as ReturnType<typeof vi.fn>).mockResolvedValue(impactResult);
        const sut = new CommandDispatchService(ports);
        // Act
        const actual = await sut.dispatch({ commandName: 'phasegate:impact-analysis', args: { storyId: 'H09-01' }, flags: {} });
        // Assert
        expect(actual.status).toBe('pass');
        expect(actual.data).toEqual(impactResult);
      });
    });

    describe('ExitCode決定ルールテスト（§9-D5）', () => {
      // UT-CDS-009
      it('phasegate:status: 正常スキャンでexitCode=0を返すこと', async () => {
        // Arrange
        const ports = buildPorts();
        const scanResult = createArtifactScanResult({
          derivedLayerHealth: ['L1', 'L2', 'L3', 'L4'].map((id) =>
            createLayerHealth({ layerId: id, lastResult: 'pass' })
          ),
        });
        (ports.artifactScannerPort.scan as ReturnType<typeof vi.fn>).mockResolvedValue(scanResult);
        (ports.configQueryPort.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(buildConfigSummary());
        const sut = new CommandDispatchService(ports);
        // Act
        const actual = await sut.dispatch({ commandName: 'phasegate:status', args: {}, flags: {} });
        // Assert
        expect(actual.exitCode).toBe(0);
      });

      // UT-CDS-010
      it('phasegate:status: LayerHealth全件lastResult=unknownでもexitCode=0を返すこと', async () => {
        // Arrange
        const ports = buildPorts();
        const scanResult = createArtifactScanResult({
          derivedLayerHealth: ['L1', 'L2', 'L3', 'L4'].map((id) =>
            createLayerHealth({ layerId: id, lastResult: 'unknown' })
          ),
        });
        (ports.artifactScannerPort.scan as ReturnType<typeof vi.fn>).mockResolvedValue(scanResult);
        (ports.configQueryPort.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(buildConfigSummary());
        const sut = new CommandDispatchService(ports);
        // Act
        const actual = await sut.dispatch({ commandName: 'phasegate:status', args: {}, flags: {} });
        // Assert
        expect(actual.exitCode).toBe(0);
      });
    });

    describe('異常系', () => {
      // UT-CDS-011
      it('phasegate:ci-check でポートが例外をthrowした場合 status=error, exitCode=2のHarnessApiResponseを返すこと', async () => {
        // Arrange
        const ports = buildPorts();
        (ports.validatorExecutionPort.runL3Validators as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('接続失敗')
        );
        const sut = new CommandDispatchService(ports);
        // Act
        const actual = await sut.dispatch({ commandName: 'phasegate:ci-check', args: {}, flags: {} });
        // Assert
        expect(actual.status).toBe('error');
        expect(actual.errors.length).toBeGreaterThanOrEqual(1);
        expect(actual.exitCode).toBe(2);
      });

      // UT-CDS-012
      it('未登録のharness:unknown-commandでエラーをthrowすること', async () => {
        // Arrange
        const ports = buildPorts();
        const sut = new CommandDispatchService(ports);
        // Act
        const actual = () => sut.dispatch({ commandName: 'harness:unknown-command', args: {}, flags: {} });
        // Assert
        await expect(actual()).rejects.toThrow();
      });
    });
  });
});
```

境界値: UT-BND-010（phasegate:complete-check で両ポートへの委譲確認）をこのファイル末尾に追加する。

---

### 3.14 `status-derivation-service.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context, createArtifactScanResult, createLayerHealth } from '../../helpers/test-helpers';

target('StatusDerivationService', () => {
  target('deriveLayerHealth', () => {
    describe('L1の全成果物が存在する場合', () => {
      // UT-SDS-001
      it('L1のLayerHealth.lastResult=passになること', () => {
        // Arrange
        const scanResult = createArtifactScanResult({
          scannedPaths: ['docs/product/construction/harness-error'],
          foundArtifacts: buildAllL1Artifacts(),
          derivedLayerHealth: [],
        });
        const sut = new StatusDerivationService();
        // Act
        const actual = sut.deriveLayerHealth(scanResult, 'L1');
        // Assert
        expect(actual.lastResult).toBe('pass');
      });
    });

    context('L2の成果物が存在しない場合', () => {
      // UT-SDS-002
      it('L2のLayerHealth.lastResult=unknownになること', () => {
        // Arrange
        const scanResult = createArtifactScanResult({
          scannedPaths: [],
          foundArtifacts: [],
          derivedLayerHealth: [],
        });
        const sut = new StatusDerivationService();
        // Act
        const actual = sut.deriveLayerHealth(scanResult, 'L2');
        // Assert
        expect(actual.lastResult).toBe('unknown');
      });
    });

    context('L3の成果物が一部のみ存在する場合', () => {
      // UT-SDS-003
      it('L3のLayerHealth.lastResult=unknown（全て揃わない場合はunknown）になること', () => {
        // Arrange
        const scanResult = createArtifactScanResult({
          scannedPaths: ['scripts/harness'],
          foundArtifacts: [buildArtifactPresence('unit-test-logic', true)],
          derivedLayerHealth: [],
        });
        const sut = new StatusDerivationService();
        // Act
        const actual = sut.deriveLayerHealth(scanResult, 'L3');
        // Assert
        expect(actual.lastResult).toBe('unknown');
      });
    });

    describe('L1〜L4全て存在する場合', () => {
      // UT-SDS-004
      it('HarnessStatusSummaryのlayers=4件、全てlastResult=passになること', () => {
        // Arrange
        const scanResult = createArtifactScanResult({
          scannedPaths: ['docs', 'scripts'],
          foundArtifacts: buildAllLayerArtifacts(),
          derivedLayerHealth: [],
        });
        const config = buildConfigWithAllLayersEnabled();
        const sut = new StatusDerivationService();
        // Act
        const actual = sut.deriveStatusSummary(scanResult, config);
        // Assert
        expect(actual.layers).toHaveLength(4);
        for (const layer of actual.layers) {
          expect(layer.lastResult).toBe('pass');
        }
      });
    });
  });

  target('deriveStatusSummary', () => {
    describe('enabled反映テスト', () => {
      // UT-SDS-005
      it('configでL4.enabled=falseの場合LayerHealth(L4).enabled=falseが反映されること', () => {
        // Arrange
        const scanResult = createArtifactScanResult({
          derivedLayerHealth: ['L1', 'L2', 'L3', 'L4'].map((id) => createLayerHealth({ layerId: id })),
        });
        const config = buildConfigWithL4Disabled();
        const sut = new StatusDerivationService();
        // Act
        const actual = sut.deriveStatusSummary(scanResult, config);
        // Assert
        const l4 = actual.layers.find((l) => l.layerId === 'L4');
        expect(l4?.enabled).toBe(false);
      });

      // UT-SDS-006
      it('configでL1〜L4全てenabled=trueの場合全LayerHealth.enabled=trueになること', () => {
        // Arrange
        const scanResult = createArtifactScanResult({
          derivedLayerHealth: ['L1', 'L2', 'L3', 'L4'].map((id) => createLayerHealth({ layerId: id })),
        });
        const config = buildConfigWithAllLayersEnabled();
        const sut = new StatusDerivationService();
        // Act
        const actual = sut.deriveStatusSummary(scanResult, config);
        // Assert
        for (const layer of actual.layers) {
          expect(layer.enabled).toBe(true);
        }
      });
    });

    describe('HarnessStatusSummary生成テスト', () => {
      // UT-SDS-007
      it('有効なArtifactScanResult + PresetInfo/ConfigSummaryでHarnessStatusSummaryが正常に生成されること', () => {
        // Arrange
        const scanResult = createArtifactScanResult({
          derivedLayerHealth: ['L1', 'L2', 'L3', 'L4'].map((id) => createLayerHealth({ layerId: id })),
        });
        const config = buildConfigWithAllLayersEnabled();
        const presetInfo = buildPresetInfo();
        const sut = new StatusDerivationService();
        // Act
        const actual = sut.deriveStatusSummary(scanResult, config, presetInfo);
        // Assert
        expect(actual.layers).toHaveLength(4);
        expect(actual.presetInfo).toEqual(presetInfo);
        expect(actual.configSummary).toBeDefined();
      });

      // UT-SDS-008
      it('ArtifactScanResult.derivedLayerHealthが空の場合HarnessStatusSummary.layersが空のまま生成されること', () => {
        // Arrange
        const scanResult = createArtifactScanResult({ derivedLayerHealth: [] });
        const config = buildConfigWithAllLayersEnabled();
        const sut = new StatusDerivationService();
        // Act
        // 実装によってエラーをthrowする場合と空layersを返す場合がある
        // 設計意図: HarnessStatusSummary のINV（4件必須）に従いエラーをthrowする
        const actual = () => sut.deriveStatusSummary(scanResult, config);
        // Assert
        expect(actual).toThrow();
      });
    });
  });
});
```

境界値: UT-BND-011（全成果物present=false → 全LayerHealth.lastResult=unknown）をこのファイル末尾に追加する。

補足:
- `buildAllL1Artifacts()`, `buildAllLayerArtifacts()` はL1〜L4の全必須成果物のArtifactPresenceを生成するローカルファクトリ。
- `buildConfigWithAllLayersEnabled()`, `buildConfigWithL4Disabled()` はローカルファクトリ。

---

## 4. モック戦略

### 4.1 VO・純粋サービス: モック不使用

| 対象 | 理由 |
|---|---|
| CliCommandDefinition | VO。実体を直接生成できる。 |
| HarnessApiResponse | VO。実体を直接生成できる。 |
| CheckReadyResult, PhaseInfo, CiCheckResult | VO。実体を直接生成できる。 |
| DriftReportSummary, HarnessStatusSummary | VO。実体を直接生成できる。 |
| ArtifactScanResult, LayerHealth | VO。実体を直接生成できる。 |
| CommandInputSpec, ExitCodeSpec | VO。実体を直接生成できる。 |
| CommandRegistry | ドメインサービス。外部依存なし。実体を直接生成できる。 |
| StatusDerivationService | 純粋計算。ポート依存なし。実体を直接生成できる。 |

### 4.2 CommandDispatchService: ポートを vi.fn() でモック

| ポート | モック対象メソッド | 使用テスト |
|---|---|---|
| `ValidatorExecutionPort` | `runL3Validators`, `runDriftDetection`, `runCompleteCheck` | UT-CDS-004, 005, 006, 010, 011 |
| `PhaseGateQueryPort` | `queryAllStories`, `queryUnit` | UT-CDS-001, 002, 003 |
| `BiomeLintPort` | `runLint` | UT-CDS-007 |
| `ImpactAnalysisPort` | `analyze` | UT-CDS-008 |
| `ArtifactScannerPort` | `scan` | UT-CDS-009, 010 |
| `ConfigQueryPort` | `getConfig` | UT-CDS-009, 010 |

モックセットアップパターン:
```typescript
const ports = buildPorts(); // 全ポートを vi.fn() で初期化
(ports.phaseGateQueryPort.queryAllStories as ReturnType<typeof vi.fn>).mockResolvedValue([...]);
```

各テストケースで必要なポートのみを `mockResolvedValue` / `mockReturnValue` で設定し、不要なポートはデフォルト（未設定 = `undefined` 返却）とする。

---

## 5. 境界値テスト一覧

各テストファイルの末尾に対応する境界値テストを追記する。

| ケースID | 追記先ファイル | 入力 | 期待結果 |
|---|---|---|---|
| UT-BND-001 | `cli-command-definition.test.ts` | commandName=`harness:`（名前部分が空） | エラーをthrow |
| UT-BND-002 | `cli-command-definition.test.ts` | commandName=`HARNESS:check-ready`（大文字プレフィックス） | エラーをthrow |
| UT-BND-003 | `harness-api-response.test.ts` | status=`pass`, errors=[空でないHarnessError 1件] | INV-3違反でエラーをthrow |
| UT-BND-004 | `ci-check-result.test.ts` | validatorResults=[] | INV-5違反でエラーをthrow（UT-CCR-003と統合済み） |
| UT-BND-005 | `drift-report-summary.test.ts` | drifts=[3件], totalCount=3 | 正常に生成される（境界正常値） |
| UT-BND-006 | `drift-report-summary.test.ts` | drifts=[3件], totalCount=4 | INV-7違反でエラーをthrow |
| UT-BND-007 | `layer-health.test.ts` | lastResult=`fail` | 正常に生成される（有効値確認） |
| UT-BND-008 | `exit-code-spec.test.ts` | pass=0, fail=1, error=2 | 正常に生成される（UT-ECS-001と統合済み） |
| UT-BND-009 | `command-registry.test.ts` | 1件も登録されていない状態でfindByName | エラーをthrow / 未登録として扱われる |
| UT-BND-010 | `command-dispatch-service.test.ts` | phasegate:complete-check | ValidatorExecutionPort + BiomeLintPort 両方に委譲 |
| UT-BND-011 | `status-derivation-service.test.ts` | 全成果物present=false | 全LayerHealth.lastResult=`unknown` |
| UT-BND-012 | `phase-info.test.ts` | currentLevel=-1（負数） | エラーをthrow |

### UT-BND-010 の疑似コード

```typescript
// UT-BND-010
it('phasegate:complete-checkがValidatorExecutionPortとBiomeLintPortの両方に委譲すること', async () => {
  // Arrange
  const ports = buildPorts();
  (ports.validatorExecutionPort.runCompleteCheck as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (ports.biomeLintPort.runLint as ReturnType<typeof vi.fn>).mockResolvedValue({ passed: true });
  const sut = new CommandDispatchService(ports);
  // Act
  const actual = await sut.dispatch({ commandName: 'phasegate:complete-check', args: {}, flags: {} });
  // Assert
  expect(ports.validatorExecutionPort.runCompleteCheck).toHaveBeenCalledOnce();
  expect(ports.biomeLintPort.runLint).toHaveBeenCalledOnce();
  expect(actual.exitCode).toBe(0);
});
```

---

## 6. テスト実行コマンド

```bash
# harness-api ユニットテスト全件実行
npx vitest run scripts/harness/__tests__/unit/harness-api

# 特定ファイルのみ実行
npx vitest run scripts/harness/__tests__/unit/harness-api/cli-command-definition.test.ts

# ウォッチモードで実行
npx vitest --watch scripts/harness/__tests__/unit/harness-api

# カバレッジ付きで実行
npx vitest run --coverage scripts/harness/__tests__/unit/harness-api
```
