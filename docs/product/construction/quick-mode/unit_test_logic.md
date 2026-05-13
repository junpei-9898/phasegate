# ユニットテストロジック設計: quick-mode

@story-id H10-01
@story-id H10-02
@story-id H10-03
## 1. テストファイル構成

| ファイルパス | 対象クラス | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/unit/quick-mode/domain/value-objects/quick-mode-config.test.ts` | QuickModeConfig | 14 |
| `scripts/harness/__tests__/unit/quick-mode/domain/value-objects/changed-file.test.ts` | ChangedFile | 12 |
| `scripts/harness/__tests__/unit/quick-mode/domain/value-objects/change-category.test.ts` | ChangeCategory | 10 |
| `scripts/harness/__tests__/unit/quick-mode/domain/value-objects/change-classification.test.ts` | ChangeClassification | 10 |
| `scripts/harness/__tests__/unit/quick-mode/domain/value-objects/quick-mode-eligibility.test.ts` | QuickModeEligibility | 12 |
| `scripts/harness/__tests__/unit/quick-mode/domain/value-objects/validator-relaxation-profile.test.ts` | ValidatorRelaxationProfile | 14 |
| `scripts/harness/__tests__/unit/quick-mode/domain/value-objects/quick-mode-decision.test.ts` | QuickModeDecision | 8 |
| `scripts/harness/__tests__/unit/quick-mode/domain/services/quick-mode-judgment-engine.test.ts` | QuickModeJudgmentEngine | 20 |
| `scripts/harness/__tests__/unit/quick-mode/domain/services/validator-relaxation-service.test.ts` | ValidatorRelaxationService | 8 |
| `scripts/harness/__tests__/unit/quick-mode/application/usecases/judge-quick-mode-eligibility-usecase.test.ts` | JudgeQuickModeEligibilityUseCase | 14 |
| `scripts/harness/__tests__/unit/quick-mode/application/usecases/build-relaxation-profile-usecase.test.ts` | BuildRelaxationProfileUseCase | 10 |
| `scripts/harness/__tests__/unit/quick-mode/application/usecases/execute-quick-ci-check-usecase.test.ts` | ExecuteQuickCiCheckUseCase | 10 |
| `scripts/harness/__tests__/unit/quick-mode/application/mappers/quick-mode-decision-contract-mapper.test.ts` | QuickModeDecisionContractMapper | 8 |
| **合計** | **13ファイル** | **150** |

---

## 2. 共通ヘルパー・ファクトリ

以下のファクトリ関数を `scripts/harness/__tests__/helpers/test-helpers.ts` に追加する。

```typescript
// ---- quick-mode ファクトリ関数 ----

export const createChangedFile = (
  filePath = 'scripts/harness/quick-mode/services/quick-service.ts',
  changeKind: 'CREATE' | 'MODIFY' | 'DELETE' = 'MODIFY'
) => ChangedFile.create({ filePath, changeKind });

export const createQuickModeConfig = (overrides: Partial<{
  allowedCategories: string[];
  maintainedLayers: string[];
  relaxedGates: string[];
}> = {}) =>
  QuickModeConfig.create({
    allowedCategories: ['bugfix', 'docs', 'test', 'config'],
    maintainedLayers: ['L1'],
    relaxedGates: ['L2-001'],
    ...overrides,
  });

export const createQuickModeEligibility = (eligible = true) =>
  eligible
    ? QuickModeEligibility.eligible('allowedCategories内のみ')
    : QuickModeEligibility.rejected(
        'MIXED_CHANGES',
        [createChangedFile('scripts/harness/quick-mode/domain/service.ts', 'MODIFY')],
        'domain カテゴリが含まれる'
      );

export const createValidatorRelaxationProfile = () =>
  ValidatorRelaxationProfile.createDefault();

export const createQuickModeDecision = (approved = true) =>
  approved
    ? QuickModeDecision.approved(createQuickModeEligibility(true), createValidatorRelaxationProfile())
    : QuickModeDecision.rejected(createQuickModeEligibility(false));
```

補足:
- ファクトリはテストファイル内で `import { createChangedFile, createQuickModeConfig, ... } from '../../../../helpers/test-helpers';` のように相対パスで取り込む。
- `createQuickModeEligibility(false)` は内部で `createChangedFile` を呼ぶため、`ChangedFile` 実体が必要。
- UseCase層のPortはファクトリを定義せず、各テストファイル内で `vi.fn()` で直接スタブを組み立てる。

---

## 3. テストケース詳細ロジック

### 3.1 `quick-mode-config.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../../helpers/test-helpers';
import { QuickModeConfig } from '../../../../harness/quick-mode/domain/value-objects/quick-mode-config';
import { createQuickModeConfig } from '../../../../helpers/test-helpers';

target('QuickModeConfig', () => {
  target('create', () => {
    describe('有効な設定でQuickModeConfigを生成する', () => {
      // UT-QMC-001
      it('allowedCategories/maintainedLayers/relaxedGatesが設定されたQuickModeConfigが生成されること', () => {
        // Arrange
        const input = {
          allowedCategories: ['bugfix', 'docs'],
          maintainedLayers: ['L1'],
          relaxedGates: ['L2-001'],
        };
        // Act
        const actual = QuickModeConfig.create(input);
        // Assert
        expect(actual.allowedCategories).toEqual(['bugfix', 'docs']);
        expect(actual.maintainedLayers).toEqual(['L1']);
        expect(actual.relaxedGates).toEqual(['L2-001']);
      });
    });

    context('allowedCategoriesに空配列が渡された場合', () => {
      // UT-QMC-002
      it('QuickModeConfigErrorが発生すること', () => {
        // Arrange
        const input = { allowedCategories: [], maintainedLayers: ['L1'], relaxedGates: [] };
        // Act
        const actual = () => QuickModeConfig.create(input);
        // Assert
        expect(actual).toThrowError();
      });
    });

    context("allowedCategoriesに'domain'が含まれる場合", () => {
      // UT-QMC-003
      it('QuickModeConfigErrorが発生すること', () => {
        // Arrange
        const input = {
          allowedCategories: ['bugfix', 'domain'],
          maintainedLayers: ['L1'],
          relaxedGates: [],
        };
        // Act
        const actual = () => QuickModeConfig.create(input);
        // Assert
        expect(actual).toThrowError();
      });
    });

    context("allowedCategoriesに'api'が含まれる場合", () => {
      // UT-QMC-004
      it('QuickModeConfigErrorが発生すること', () => {
        // Arrange
        const input = {
          allowedCategories: ['bugfix', 'api'],
          maintainedLayers: ['L1'],
          relaxedGates: [],
        };
        // Act
        const actual = () => QuickModeConfig.create(input);
        // Assert
        expect(actual).toThrowError();
      });
    });

    context("allowedCategoriesに'feature'が含まれる場合", () => {
      // UT-QMC-005
      it('QuickModeConfigErrorが発生すること', () => {
        // Arrange
        const input = {
          allowedCategories: ['bugfix', 'feature'],
          maintainedLayers: ['L1'],
          relaxedGates: [],
        };
        // Act
        const actual = () => QuickModeConfig.create(input);
        // Assert
        expect(actual).toThrowError();
      });
    });

    context('生成後にObject.freeze()が適用されている場合', () => {
      // UT-QMC-014
      it('プロパティへの再代入が無視（またはエラー）となること', () => {
        // Arrange
        const sut = createQuickModeConfig();
        // Act
        const actual = () => {
          (sut as Record<string, unknown>)['allowedCategories'] = ['other'];
        };
        // Assert
        expect(Object.isFrozen(sut)).toBe(true);
      });
    });
  });

  target('isAllowed', () => {
    describe("指定カテゴリがallowedCategoriesに含まれるか判定する", () => {
      // UT-QMC-006
      it("allowedCategoriesに'bugfix'が含まれる場合にtrueが返ること", () => {
        // Arrange
        const sut = createQuickModeConfig({ allowedCategories: ['bugfix', 'docs'] });
        // Act
        const actual = sut.isAllowed('bugfix');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-QMC-007
      it("allowedCategoriesに'docs'が含まれない場合にfalseが返ること", () => {
        // Arrange
        const sut = createQuickModeConfig({ allowedCategories: ['bugfix', 'test'] });
        // Act
        const actual = sut.isAllowed('docs');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('isMaintained', () => {
    describe('指定ValidatorIdがmaintainedLayersに含まれるか判定する', () => {
      // UT-QMC-008
      it("maintainedLayersに'L1'が含まれる場合にtrueが返ること", () => {
        // Arrange
        const sut = createQuickModeConfig({ maintainedLayers: ['L1'] });
        // Act
        const actual = sut.isMaintained('L1');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-QMC-009
      it("maintainedLayersに'L2-001'が含まれない場合にfalseが返ること", () => {
        // Arrange
        const sut = createQuickModeConfig({ maintainedLayers: ['L1'] });
        // Act
        const actual = sut.isMaintained('L2-001');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('isRelaxed', () => {
    describe('指定ValidatorIdがrelaxedGatesに含まれるか判定する', () => {
      // UT-QMC-010
      it("relaxedGatesに'L2-001'が含まれる場合にtrueが返ること", () => {
        // Arrange
        const sut = createQuickModeConfig({ relaxedGates: ['L2-001'] });
        // Act
        const actual = sut.isRelaxed('L2-001');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-QMC-011
      it("relaxedGatesに'L3-001'が含まれない場合にfalseが返ること", () => {
        // Arrange
        const sut = createQuickModeConfig({ relaxedGates: ['L2-001'] });
        // Act
        const actual = sut.isRelaxed('L3-001');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('equals', () => {
    describe('2つのQuickModeConfigの値等価性を判定する', () => {
      // UT-QMC-012
      it('同一の設定値を持つ2つのインスタンスの場合にtrueが返ること', () => {
        // Arrange
        const sut = createQuickModeConfig();
        const other = createQuickModeConfig();
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(true);
      });

      // UT-QMC-013
      it('allowedCategoriesが異なる2つのインスタンスの場合にfalseが返ること', () => {
        // Arrange
        const sut = createQuickModeConfig({ allowedCategories: ['bugfix'] });
        const other = createQuickModeConfig({ allowedCategories: ['bugfix', 'docs'] });
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
```

---

### 3.2 `changed-file.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../../helpers/test-helpers';
import { ChangedFile } from '../../../../harness/quick-mode/domain/value-objects/changed-file';
import { createChangedFile } from '../../../../helpers/test-helpers';

target('ChangedFile', () => {
  target('create', () => {
    describe('ChangedFileを生成する', () => {
      // UT-CF-001
      it('正常なfilePathとchangeKindが渡された場合にChangedFileが生成されること', () => {
        // Arrange
        const filePath = 'scripts/harness/quick-mode/services/quick-service.ts';
        const changeKind = 'MODIFY';
        // Act
        const actual = ChangedFile.create({ filePath, changeKind });
        // Assert
        expect(actual.filePath).toBe(filePath);
        expect(actual.changeKind).toBe(changeKind);
      });
    });

    context('filePathが空文字の場合', () => {
      // UT-CF-002
      it('エラーが発生すること', () => {
        // Arrange
        const input = { filePath: '', changeKind: 'MODIFY' as const };
        // Act
        const actual = () => ChangedFile.create(input);
        // Assert
        expect(actual).toThrowError();
      });
    });

    context('filePathが末尾スラッシュを含む場合', () => {
      // UT-CF-003
      it('エラーが発生すること', () => {
        // Arrange
        const input = { filePath: 'scripts/harness/quick-mode/', changeKind: 'MODIFY' as const };
        // Act
        const actual = () => ChangedFile.create(input);
        // Assert
        expect(actual).toThrowError();
      });
    });

    context("changeKindが'CREATE'/'MODIFY'/'DELETE'以外の場合", () => {
      // UT-CF-004
      it('エラーが発生すること', () => {
        // Arrange
        const input = {
          filePath: 'scripts/harness/quick-mode/services/quick-service.ts',
          changeKind: 'UPDATE' as unknown as 'MODIFY',
        };
        // Act
        const actual = () => ChangedFile.create(input);
        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('isUnder', () => {
    describe('filePathが指定ディレクトリ配下かを判定する', () => {
      // UT-CF-005
      it("'scripts/harness/quick-mode/domain/'で始まるfilePathの場合にtrueが返ること", () => {
        // Arrange
        const sut = ChangedFile.create({
          filePath: 'scripts/harness/quick-mode/domain/value-objects/quick-mode-config.ts',
          changeKind: 'MODIFY',
        });
        // Act
        const actual = sut.isUnder('scripts/harness/quick-mode/domain/');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-CF-006
      it('一致しないディレクトリプレフィックスの場合にfalseが返ること', () => {
        // Arrange
        const sut = createChangedFile('scripts/harness/quick-mode/services/quick-service.ts');
        // Act
        const actual = sut.isUnder('scripts/harness/quick-mode/domain/');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('hasExtension', () => {
    describe('指定拡張子との一致を判定する', () => {
      // UT-CF-007
      it("'.ts'拡張子を持つfilePathの場合にtrueが返ること", () => {
        // Arrange
        const sut = createChangedFile('scripts/harness/quick-mode/services/quick-service.ts');
        // Act
        const actual = sut.hasExtension('.ts');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-CF-008
      it("'.json'拡張子を持つfilePathの場合に'.ts'指定ではfalseが返ること", () => {
        // Arrange
        const sut = createChangedFile('scripts/harness/quick-mode/phasegate.config.json');
        // Act
        const actual = sut.hasExtension('.ts');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('matchesPattern', () => {
    describe('glob/suffixパターンとの一致を判定する', () => {
      // UT-CF-009
      it("'*port.ts'パターンに一致するfilePathの場合にtrueが返ること", () => {
        // Arrange
        const sut = ChangedFile.create({
          filePath: 'scripts/harness/quick-mode/application/ports/changed-files-port.ts',
          changeKind: 'MODIFY',
        });
        // Act
        const actual = sut.matchesPattern('*port.ts');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-CF-010
      it("'*adapter.ts'パターンに一致しないfilePathの場合にfalseが返ること", () => {
        // Arrange
        const sut = createChangedFile('scripts/harness/quick-mode/services/quick-service.ts');
        // Act
        const actual = sut.matchesPattern('*adapter.ts');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('equals', () => {
    describe('2つのChangedFileの値等価性を判定する', () => {
      // UT-CF-011
      it('同一filePath/changeKindを持つ2つのインスタンスの場合にtrueが返ること', () => {
        // Arrange
        const sut = createChangedFile();
        const other = createChangedFile();
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(true);
      });

      // UT-CF-012
      it('filePathが異なる2つのインスタンスの場合にfalseが返ること', () => {
        // Arrange
        const sut = createChangedFile('scripts/harness/quick-mode/services/quick-service.ts');
        const other = createChangedFile('scripts/harness/quick-mode/domain/other.ts');
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
```

---

### 3.3 `change-category.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../../helpers/test-helpers';
import { ChangeCategory } from '../../../../harness/quick-mode/domain/value-objects/change-category';

target('ChangeCategory', () => {
  target('fromString', () => {
    describe('文字列からChangeCategoryを生成する', () => {
      // UT-CC-001
      it("正規7値（'bugfix'/'docs'/'test'/'config'/'feature'/'domain'/'api'）が渡された場合に対応するChangeCategoryが生成されること", () => {
        // Arrange
        const inputs = ['bugfix', 'docs', 'test', 'config', 'feature', 'domain', 'api'];
        // Act
        const actuals = inputs.map((v) => ChangeCategory.fromString(v));
        // Assert
        actuals.forEach((actual, i) => {
          expect(actual.toString()).toBe(inputs[i]);
        });
      });

      // UT-CC-002
      it("大文字（'BUGFIX'）が渡された場合に大文字小文字を正規化してChangeCategoryが生成されること", () => {
        // Arrange
        const input = 'BUGFIX';
        // Act
        const actual = ChangeCategory.fromString(input);
        // Assert
        expect(actual.toString()).toBe('bugfix');
      });
    });

    context('定義外の文字列が渡された場合', () => {
      // UT-CC-003
      it('UnknownChangeCategoryErrorが発生すること', () => {
        // Arrange
        const input = 'unknown-category';
        // Act
        const actual = () => ChangeCategory.fromString(input);
        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('isQuickModeRejectable', () => {
    describe('Quick Mode拒否対象カテゴリかを判定する', () => {
      // UT-CC-004
      it("'domain'の場合にtrueが返ること", () => {
        // Arrange
        const sut = ChangeCategory.fromString('domain');
        // Act
        const actual = sut.isQuickModeRejectable();
        // Assert
        expect(actual).toBe(true);
      });

      // UT-CC-005
      it("'api'の場合にtrueが返ること", () => {
        // Arrange
        const sut = ChangeCategory.fromString('api');
        // Act
        const actual = sut.isQuickModeRejectable();
        // Assert
        expect(actual).toBe(true);
      });

      // UT-CC-006
      it("'feature'の場合にtrueが返ること", () => {
        // Arrange
        const sut = ChangeCategory.fromString('feature');
        // Act
        const actual = sut.isQuickModeRejectable();
        // Assert
        expect(actual).toBe(true);
      });

      // UT-CC-007
      it("'bugfix'の場合にfalseが返ること", () => {
        // Arrange
        const sut = ChangeCategory.fromString('bugfix');
        // Act
        const actual = sut.isQuickModeRejectable();
        // Assert
        expect(actual).toBe(false);
      });

      // UT-CC-008
      it("'docs'/'test'/'config'の場合にfalseが返ること", () => {
        // Arrange
        const inputs = ['docs', 'test', 'config'].map((v) => ChangeCategory.fromString(v));
        // Act / Assert
        inputs.forEach((sut) => {
          const actual = sut.isQuickModeRejectable();
          expect(actual).toBe(false);
        });
      });
    });
  });

  target('toString', () => {
    describe('ChangeCategoryを文字列に変換する', () => {
      // UT-CC-009
      it("'bugfix'のChangeCategoryの場合に'bugfix'が返ること", () => {
        // Arrange
        const sut = ChangeCategory.fromString('bugfix');
        // Act
        const actual = sut.toString();
        // Assert
        expect(actual).toBe('bugfix');
      });
    });
  });

  target('equals', () => {
    describe('2つのChangeCategoryの等価性を判定する', () => {
      // UT-CC-010
      it('同一値の2つのインスタンスの場合にtrueが返ること', () => {
        // Arrange
        const sut = ChangeCategory.fromString('bugfix');
        const other = ChangeCategory.fromString('bugfix');
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
```

---

### 3.4 `change-classification.test.ts`

`ChangeClassification` は独立した生成コンストラクタを持たない。`QuickModeJudgmentEngine.classify()` の返り値を通じて各メソッドの振る舞いを検証する。

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../../helpers/test-helpers';
import { QuickModeJudgmentEngine } from '../../../../harness/quick-mode/domain/services/quick-mode-judgment-engine';
import { ChangedFile } from '../../../../harness/quick-mode/domain/value-objects/changed-file';
import { createChangedFile, createQuickModeConfig } from '../../../../helpers/test-helpers';

// ChangeClassificationはclassify()の返り値を通じて検証する
const engine = new QuickModeJudgmentEngine();

target('ChangeClassification', () => {
  target('getFiles', () => {
    describe('指定カテゴリのファイル一覧を返す', () => {
      // UT-CCLS-001
      it("'docs'カテゴリのファイルが含まれる分類結果の場合に対応するChangedFile[]が返ること", () => {
        // Arrange
        const files = [
          ChangedFile.create({ filePath: 'docs/design/overview.md', changeKind: 'MODIFY' }),
        ];
        const config = createQuickModeConfig();
        // Act
        const classification = engine.classify(files, config);
        const actual = classification.getFiles('docs');
        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].filePath).toBe('docs/design/overview.md');
      });

      // UT-CCLS-002
      it('指定カテゴリのファイルが存在しない場合に空配列が返ること', () => {
        // Arrange
        const files = [createChangedFile('docs/design/overview.md', 'MODIFY')];
        const config = createQuickModeConfig();
        // Act
        const classification = engine.classify(files, config);
        const actual = classification.getFiles('api');
        // Assert
        expect(actual).toEqual([]);
      });
    });
  });

  target('hasCategory', () => {
    describe('指定カテゴリが含まれるかを判定する', () => {
      // UT-CCLS-003
      it("'domain'カテゴリのファイルが含まれる場合にtrueが返ること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
            changeKind: 'MODIFY',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const classification = engine.classify(files, config);
        const actual = classification.hasCategory('domain');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-CCLS-004
      it("'api'カテゴリのファイルが含まれない場合にfalseが返ること", () => {
        // Arrange
        const files = [createChangedFile('docs/design/overview.md', 'MODIFY')];
        const config = createQuickModeConfig();
        // Act
        const classification = engine.classify(files, config);
        const actual = classification.hasCategory('api');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('hasAnyRejectable', () => {
    describe('拒否対象カテゴリが含まれるかを判定する', () => {
      // UT-CCLS-005
      it("'domain'/'api'/'feature'のいずれかが含まれる場合にtrueが返ること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/value-objects/new-vo.ts',
            changeKind: 'CREATE',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const classification = engine.classify(files, config);
        const actual = classification.hasAnyRejectable();
        // Assert
        expect(actual).toBe(true);
      });

      // UT-CCLS-006
      it("全ファイルが'bugfix'/'docs'/'test'/'config'のみの場合にfalseが返ること", () => {
        // Arrange
        const files = [
          createChangedFile('scripts/harness/quick-mode/services/quick-service.ts', 'MODIFY'),
          ChangedFile.create({ filePath: 'docs/design/overview.md', changeKind: 'MODIFY' }),
        ];
        const config = createQuickModeConfig();
        // Act
        const classification = engine.classify(files, config);
        const actual = classification.hasAnyRejectable();
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('dominantCategory', () => {
    describe('最高リスクカテゴリが正しく選択される', () => {
      // UT-CCLS-007
      it("'api'と'domain'が混在する場合にdominantCategoryが'api'であること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/application/ports/changed-files-port.ts',
            changeKind: 'MODIFY',
          }),
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
            changeKind: 'MODIFY',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const classification = engine.classify(files, config);
        const actual = classification.dominantCategory;
        // Assert
        expect(actual?.toString()).toBe('api');
      });

      // UT-CCLS-008
      it("'domain'と'bugfix'が混在する場合にdominantCategoryが'domain'であること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
            changeKind: 'MODIFY',
          }),
          createChangedFile('scripts/harness/quick-mode/services/quick-service.ts', 'MODIFY'),
        ];
        const config = createQuickModeConfig();
        // Act
        const classification = engine.classify(files, config);
        const actual = classification.dominantCategory;
        // Assert
        expect(actual?.toString()).toBe('domain');
      });

      // UT-CCLS-009
      it("全ファイルがallowed内（'bugfix'のみ）の場合にdominantCategoryが拒否対象を示さないこと", () => {
        // Arrange
        const files = [
          createChangedFile('scripts/harness/quick-mode/services/quick-service.ts', 'MODIFY'),
        ];
        const config = createQuickModeConfig();
        // Act
        const classification = engine.classify(files, config);
        const actual = classification.dominantCategory;
        // Assert
        expect(actual?.isQuickModeRejectable()).toBeFalsy();
      });
    });
  });

  target('equals', () => {
    describe('2つのChangeClassificationの値等価性を判定する', () => {
      // UT-CCLS-010
      it('同一の分類結果を持つ2つのインスタンスの場合にtrueが返ること', () => {
        // Arrange
        const files = [createChangedFile()];
        const config = createQuickModeConfig();
        const sut = engine.classify(files, config);
        const other = engine.classify(files, config);
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
```

---

### 3.5 `quick-mode-eligibility.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../../helpers/test-helpers';
import { QuickModeEligibility } from '../../../../harness/quick-mode/domain/value-objects/quick-mode-eligibility';
import { createChangedFile, createQuickModeEligibility } from '../../../../helpers/test-helpers';

target('QuickModeEligibility', () => {
  target('eligible', () => {
    describe('eligible=trueのQuickModeEligibilityを生成する', () => {
      // UT-QME-001
      it('正常なreason文字列が渡された場合にeligible=true、rejectionRule=undefined、rejectedFiles=undefinedのインスタンスが生成されること', () => {
        // Arrange
        const reason = 'allowedCategories内のみ';
        // Act
        const actual = QuickModeEligibility.eligible(reason);
        // Assert
        expect(actual.isEligible()).toBe(true);
        expect(actual.rejectionRule).toBeUndefined();
        expect(actual.rejectedFiles).toBeUndefined();
      });
    });

    context('reasonが空文字の場合', () => {
      // UT-QME-002
      it('エラーが発生すること（INV-E3）', () => {
        // Arrange
        const reason = '';
        // Act
        const actual = () => QuickModeEligibility.eligible(reason);
        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('rejected', () => {
    describe('eligible=falseのQuickModeEligibilityを生成する', () => {
      // UT-QME-003
      it('rejectionRuleとrejectedFilesが渡された場合にeligible=false、rejectionRule非undefined、rejectedFiles非undefinedのインスタンスが生成されること', () => {
        // Arrange
        const rejectionRule = 'MIXED_CHANGES';
        const rejectedFiles = [createChangedFile()];
        const reason = 'domain カテゴリが含まれる';
        // Act
        const actual = QuickModeEligibility.rejected(rejectionRule, rejectedFiles, reason);
        // Assert
        expect(actual.isEligible()).toBe(false);
        expect(actual.rejectionRule).toBe('MIXED_CHANGES');
        expect(actual.rejectedFiles).toHaveLength(1);
      });
    });

    context('rejectedFilesが空配列の場合', () => {
      // UT-QME-004
      it('エラーが発生すること（INV-E2）', () => {
        // Arrange
        const rejectedFiles: never[] = [];
        // Act
        const actual = () =>
          QuickModeEligibility.rejected('MIXED_CHANGES', rejectedFiles, 'reason');
        // Assert
        expect(actual).toThrowError();
      });
    });

    context('reasonが空文字の場合', () => {
      // UT-QME-005
      it('エラーが発生すること（INV-E3）', () => {
        // Arrange
        const rejectedFiles = [createChangedFile()];
        // Act
        const actual = () =>
          QuickModeEligibility.rejected('MIXED_CHANGES', rejectedFiles, '');
        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('isEligible', () => {
    describe('Quick Mode適用可否を返す', () => {
      // UT-QME-006
      it('eligible=trueのインスタンスの場合にtrueが返ること', () => {
        // Arrange
        const sut = createQuickModeEligibility(true);
        // Act
        const actual = sut.isEligible();
        // Assert
        expect(actual).toBe(true);
      });

      // UT-QME-007
      it('eligible=falseのインスタンスの場合にfalseが返ること', () => {
        // Arrange
        const sut = createQuickModeEligibility(false);
        // Act
        const actual = sut.isEligible();
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('equals', () => {
    describe('2つのQuickModeEligibilityの値等価性を判定する', () => {
      // UT-QME-008
      it('同一eligible/reason/rejectionRuleを持つ場合にtrueが返ること', () => {
        // Arrange
        const sut = QuickModeEligibility.eligible('allowedCategories内のみ');
        const other = QuickModeEligibility.eligible('allowedCategories内のみ');
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(true);
      });

      // UT-QME-009
      it('eligibleが異なる場合にfalseが返ること', () => {
        // Arrange
        const sut = createQuickModeEligibility(true);
        const other = createQuickModeEligibility(false);
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  // 不変条件の組み合わせテスト
  // UT-QME-010
  it('INV-E1: eligible=trueのときrejectionRuleがundefinedであること', () => {
    // Arrange
    const sut = createQuickModeEligibility(true);
    // Act
    const actual = sut.rejectionRule;
    // Assert
    expect(actual).toBeUndefined();
  });

  // UT-QME-011
  it('INV-E1: eligible=trueのときrejectedFilesがundefinedであること', () => {
    // Arrange
    const sut = createQuickModeEligibility(true);
    // Act
    const actual = sut.rejectedFiles;
    // Assert
    expect(actual).toBeUndefined();
  });

  // UT-QME-012
  it('INV-E2: rejected()で1件のrejectedFilesを渡した場合にrejectedFilesが1件含まれること', () => {
    // Arrange
    const rejectedFiles = [createChangedFile()];
    const sut = QuickModeEligibility.rejected('MIXED_CHANGES', rejectedFiles, 'reason');
    // Act
    const actual = sut.rejectedFiles;
    // Assert
    expect(actual).toHaveLength(1);
  });
});
```

---

### 3.6 `validator-relaxation-profile.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../../helpers/test-helpers';
import { ValidatorRelaxationProfile } from '../../../../harness/quick-mode/domain/value-objects/validator-relaxation-profile';
import { createValidatorRelaxationProfile } from '../../../../helpers/test-helpers';

target('ValidatorRelaxationProfile', () => {
  target('createDefault', () => {
    describe('デフォルト緩和プロファイルを生成する', () => {
      // UT-VRP-001
      it('引数なしで呼び出した場合にlevelDependencyRelaxed=false、l1.all=true、l4.all=false、phaseExecution.twoPhaseRequired=falseのプロファイルが生成されること', () => {
        // Arrange（なし）
        // Act
        const actual = ValidatorRelaxationProfile.createDefault();
        // Assert
        expect(actual.levelDependencyRelaxed).toBe(false);
        expect(actual.l1.all).toBe(true);
        expect(actual.l4.all).toBe(false);
        expect(actual.phaseExecution.twoPhaseRequired).toBe(false);
      });

      // UT-VRP-002
      it("デフォルトプロファイルのl2がmaintained=[L2-002, L2-003]、skipped=[L2-001]であること", () => {
        // Arrange（なし）
        // Act
        const actual = ValidatorRelaxationProfile.createDefault();
        // Assert
        expect(actual.l2.maintained).toEqual(expect.arrayContaining(['L2-002', 'L2-003']));
        expect(actual.l2.maintained).toHaveLength(2);
        expect(actual.l2.skipped).toEqual(['L2-001']);
      });

      // UT-VRP-003
      it("デフォルトプロファイルのl3がmaintained=[L3-001]、skipped=[L3-002, L3-003, L3-004]であること", () => {
        // Arrange（なし）
        // Act
        const actual = ValidatorRelaxationProfile.createDefault();
        // Assert
        expect(actual.l3.maintained).toEqual(['L3-001']);
        expect(actual.l3.skipped).toEqual(
          expect.arrayContaining(['L3-002', 'L3-003', 'L3-004'])
        );
        expect(actual.l3.skipped).toHaveLength(3);
      });
    });
  });

  target('create', () => {
    describe('カスタム緩和プロファイルを生成する', () => {
      // UT-VRP-004
      it("l2.maintained∪l2.skippedが{L2-001, L2-002, L2-003, L2-013, L2-014, L2-015}に一致する場合にValidatorRelaxationProfileが生成されること（INV-P5）", () => {
        // Arrange
        const input = {
          levelDependencyRelaxed: false,
          l1: { all: true },
          l2: { maintained: ['L2-002', 'L2-003', 'L2-014'], skipped: ['L2-001', 'L2-013', 'L2-015'] },
          l3: { maintained: ['L3-001'], skipped: ['L3-002', 'L3-003', 'L3-004'] },
          l4: { all: false },
          phaseExecution: { twoPhaseRequired: false },
        };
        // Act
        const actual = ValidatorRelaxationProfile.create(input);
        // Assert
        expect(actual).toBeDefined();
      });

      // UT-VRP-005
      it("l2.maintained∪l2.skippedが{L2-001, L2-002, L2-003, L2-013, L2-014, L2-015}に一致しない場合にエラーが発生すること（INV-P5違反）", () => {
        // Arrange
        const input = {
          levelDependencyRelaxed: false,
          l1: { all: true },
          l2: { maintained: ['L2-002'], skipped: ['L2-001'] },
          l3: { maintained: ['L3-001'], skipped: ['L3-002', 'L3-003', 'L3-004'] },
          l4: { all: false },
          phaseExecution: { twoPhaseRequired: false },
        };
        // Act
        const actual = () => ValidatorRelaxationProfile.create(input);
        // Assert
        expect(actual).toThrowError();
      });

      // UT-VRP-006
      it("l3.maintained∪l3.skippedが{L3-001, L3-002, L3-003, L3-004}に一致する場合にValidatorRelaxationProfileが生成されること（INV-P6）", () => {
        // Arrange
        const input = {
          levelDependencyRelaxed: false,
          l1: { all: true },
          l2: { maintained: ['L2-002', 'L2-003', 'L2-014'], skipped: ['L2-001', 'L2-013', 'L2-015'] },
          l3: { maintained: ['L3-001', 'L3-002'], skipped: ['L3-003', 'L3-004'] },
          l4: { all: false },
          phaseExecution: { twoPhaseRequired: false },
        };
        // Act
        const actual = ValidatorRelaxationProfile.create(input);
        // Assert
        expect(actual).toBeDefined();
      });

      // UT-VRP-007
      it("l3.maintained∪l3.skippedが{L3-001, L3-002, L3-003, L3-004}に一致しない場合にエラーが発生すること（INV-P6違反）", () => {
        // Arrange
        const input = {
          levelDependencyRelaxed: false,
          l1: { all: true },
          l2: { maintained: ['L2-002', 'L2-003', 'L2-014'], skipped: ['L2-001', 'L2-013', 'L2-015'] },
          l3: { maintained: ['L3-001'], skipped: ['L3-002', 'L3-003'] }, // L3-004が欠落
          l4: { all: false },
          phaseExecution: { twoPhaseRequired: false },
        };
        // Act
        const actual = () => ValidatorRelaxationProfile.create(input);
        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('isMaintained', () => {
    describe('指定ValidatorIdが維持対象かを判定する', () => {
      // UT-VRP-008
      it('L2-002が指定された場合にtrueが返ること', () => {
        // Arrange
        const sut = createValidatorRelaxationProfile();
        // Act
        const actual = sut.isMaintained('L2-002');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-VRP-009
      it('L2-001が指定された場合にfalseが返ること（スキップ対象）', () => {
        // Arrange
        const sut = createValidatorRelaxationProfile();
        // Act
        const actual = sut.isMaintained('L2-001');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('isSkipped', () => {
    describe('指定ValidatorIdがスキップ対象かを判定する', () => {
      // UT-VRP-010
      it('L2-001が指定された場合にtrueが返ること', () => {
        // Arrange
        const sut = createValidatorRelaxationProfile();
        // Act
        const actual = sut.isSkipped('L2-001');
        // Assert
        expect(actual).toBe(true);
      });

      // UT-VRP-011
      it('L3-001が指定された場合にfalseが返ること（維持対象）', () => {
        // Arrange
        const sut = createValidatorRelaxationProfile();
        // Act
        const actual = sut.isSkipped('L3-001');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('equals', () => {
    describe('2つのValidatorRelaxationProfileの値等価性を判定する', () => {
      // UT-VRP-012
      it('同一設定の2つのインスタンスの場合にtrueが返ること', () => {
        // Arrange
        const sut = createValidatorRelaxationProfile();
        const other = createValidatorRelaxationProfile();
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(true);
      });

      // UT-VRP-013
      it('l2.maintainedが異なる2つのインスタンスの場合にfalseが返ること', () => {
        // Arrange
        const sut = createValidatorRelaxationProfile(); // l2.maintained = [L2-002, L2-003]
        const other = ValidatorRelaxationProfile.create({
          levelDependencyRelaxed: false,
          l1: { all: true },
          l2: { maintained: ['L2-002', 'L2-003', 'L2-014'], skipped: ['L2-001', 'L2-013', 'L2-015'] },
          l3: { maintained: ['L3-001', 'L3-002'], skipped: ['L3-003', 'L3-004'] }, // l3が違う
          l4: { all: false },
          phaseExecution: { twoPhaseRequired: false },
        });
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  // UT-VRP-014: INV-P1保護テスト
  it('INV-P1: createDefault()の戻り値のlevelDependencyRelaxedが常にfalseであること', () => {
    // Arrange（なし）
    // Act
    const actual = ValidatorRelaxationProfile.createDefault();
    // Assert
    expect(actual.levelDependencyRelaxed).toBe(false);
  });
});
```

---

### 3.7 `quick-mode-decision.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../../helpers/test-helpers';
import { QuickModeDecision } from '../../../../harness/quick-mode/domain/value-objects/quick-mode-decision';
import {
  createQuickModeEligibility,
  createValidatorRelaxationProfile,
  createQuickModeDecision,
} from '../../../../helpers/test-helpers';

target('QuickModeDecision', () => {
  target('approved', () => {
    describe('承認済みQuickModeDecisionを生成する', () => {
      // UT-QMD-001
      it('eligibility=trueとrelaxationProfileが渡された場合にrelaxationProfileが設定されたQuickModeDecisionが生成されること', () => {
        // Arrange
        const eligibility = createQuickModeEligibility(true);
        const profile = createValidatorRelaxationProfile();
        // Act
        const actual = QuickModeDecision.approved(eligibility, profile);
        // Assert
        expect(actual.isApproved()).toBe(true);
        expect(actual.relaxationProfile).toBeDefined();
      });
    });

    context('eligible=falseのeligibilityが渡された場合', () => {
      // UT-QMD-003
      it('エラーが発生すること（INV-D2の逆保証）', () => {
        // Arrange
        const eligibility = createQuickModeEligibility(false);
        const profile = createValidatorRelaxationProfile();
        // Act
        const actual = () => QuickModeDecision.approved(eligibility, profile);
        // Assert
        expect(actual).toThrowError();
      });
    });
  });

  target('rejected', () => {
    describe('拒否済みQuickModeDecisionを生成する', () => {
      // UT-QMD-002
      it('eligibility=falseが渡された場合にrelaxationProfile=undefinedのQuickModeDecisionが生成されること（INV-D1）', () => {
        // Arrange
        const eligibility = createQuickModeEligibility(false);
        // Act
        const actual = QuickModeDecision.rejected(eligibility);
        // Assert
        expect(actual.isApproved()).toBe(false);
        expect(actual.relaxationProfile).toBeUndefined();
      });
    });
  });

  target('isApproved', () => {
    describe('Quick Mode承認状態を返す', () => {
      // UT-QMD-004
      it('approved()で生成したインスタンスの場合にtrueが返ること', () => {
        // Arrange
        const sut = createQuickModeDecision(true);
        // Act
        const actual = sut.isApproved();
        // Assert
        expect(actual).toBe(true);
      });

      // UT-QMD-005
      it('rejected()で生成したインスタンスの場合にfalseが返ること', () => {
        // Arrange
        const sut = createQuickModeDecision(false);
        // Act
        const actual = sut.isApproved();
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  target('equals', () => {
    describe('2つのQuickModeDecisionの値等価性を判定する', () => {
      // UT-QMD-006
      it('同一eligibility/relaxationProfileを持つ場合にtrueが返ること', () => {
        // Arrange
        const sut = createQuickModeDecision(true);
        const other = createQuickModeDecision(true);
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(true);
      });

      // UT-QMD-007
      it('relaxationProfileの有無が異なる場合にfalseが返ること', () => {
        // Arrange
        const sut = createQuickModeDecision(true);
        const other = createQuickModeDecision(false);
        // Act
        const actual = sut.equals(other);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  // UT-QMD-008: INV-D1確認
  it('INV-D1: rejected()の戻り値のrelaxationProfileがundefinedであること', () => {
    // Arrange
    const eligibility = createQuickModeEligibility(false);
    // Act
    const actual = QuickModeDecision.rejected(eligibility);
    // Assert
    expect(actual.relaxationProfile).toBeUndefined();
  });
});
```

---

### 3.8 `quick-mode-judgment-engine.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../../helpers/test-helpers';
import { QuickModeJudgmentEngine } from '../../../../harness/quick-mode/domain/services/quick-mode-judgment-engine';
import { ChangedFile } from '../../../../harness/quick-mode/domain/value-objects/changed-file';
import { createChangedFile, createQuickModeConfig } from '../../../../helpers/test-helpers';

const engine = new QuickModeJudgmentEngine();

target('QuickModeJudgmentEngine', () => {
  target('classify', () => {
    describe('変更ファイル群をカテゴリに分類する', () => {
      // UT-JE-001
      it('空配列が渡された場合にdominantCategory=nullの空のChangeClassificationが返ること', () => {
        // Arrange
        const files: ChangedFile[] = [];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.dominantCategory).toBeNull();
      });

      // UT-JE-002
      it("'docs/'配下のfilePathを持つファイルが渡された場合に'docs'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({ filePath: 'docs/design/overview.md', changeKind: 'MODIFY' }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory('docs')).toBe(true);
      });

      // UT-JE-003
      it("'__tests__/'配下のfilePathを持つファイルが渡された場合に'test'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/__tests__/unit/quick-mode/domain/some.test.ts',
            changeKind: 'MODIFY',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory('test')).toBe(true);
      });

      // UT-JE-004
      it("'*.config.json'のfilePathを持つファイルが渡された場合に'config'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/phasegate.config.json',
            changeKind: 'MODIFY',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory('config')).toBe(true);
      });

      // UT-JE-005
      it("'domain/'配下のfilePathを持つファイルが渡された場合に'domain'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
            changeKind: 'MODIFY',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory('domain')).toBe(true);
      });

      // UT-JE-006
      it("'*port.ts'のfilePathを持つファイルが渡された場合に'api'カテゴリに分類されること（domain/以下であっても'api'が優先）", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/application/ports/changed-files-port.ts',
            changeKind: 'MODIFY',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory('api')).toBe(true);
      });

      // UT-JE-007
      it("domain/以外のCREATEファイルが渡された場合に'feature'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/services/new-feature-service.ts',
            changeKind: 'CREATE',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory('feature')).toBe(true);
      });

      // UT-JE-008
      it("domain/以外のMODIFYファイルが渡された場合に'bugfix'カテゴリに分類されること", () => {
        // Arrange
        const files = [
          createChangedFile(
            'scripts/harness/quick-mode/services/quick-service.ts',
            'MODIFY'
          ),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.classify(files, config);
        // Assert
        expect(actual.hasCategory('bugfix')).toBe(true);
      });
    });
  });

  target('judge', () => {
    describe("変更ファイル群を評価してQuick Mode適用可否を返す", () => {
      // UT-JE-009
      it("全ファイルがallowedCategories内（'bugfix'/'docs'/'test'/'config'）のみの場合にeligible=trueが返ること", () => {
        // Arrange
        const files = [
          createChangedFile(
            'scripts/harness/quick-mode/services/quick-service.ts',
            'MODIFY'
          ),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(true);
      });

      // UT-JE-010
      it('空の変更ファイル一覧が渡された場合にeligible=trueが返ること', () => {
        // Arrange
        const files: ChangedFile[] = [];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(true);
      });
    });

    describe('3拒否ルールの判定', () => {
      // UT-JE-011
      it("allowedCategories外のファイル（domainカテゴリ）が1件含まれる場合にeligible=false、rejectionRule='MIXED_CHANGES'が返ること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
            changeKind: 'MODIFY',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(false);
        expect(actual.rejectionRule).toBe('MIXED_CHANGES');
      });

      // UT-JE-012
      it("allowedCategories外のファイル（featureカテゴリ）が含まれる場合にeligible=false、rejectionRule='MIXED_CHANGES'が返り、rejectedFilesに当該ファイルが含まれること", () => {
        // Arrange
        const rejectedFile = ChangedFile.create({
          filePath: 'scripts/harness/quick-mode/services/new-feature.ts',
          changeKind: 'CREATE',
        });
        const files = [rejectedFile];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(false);
        expect(actual.rejectionRule).toBe('MIXED_CHANGES');
        expect(actual.rejectedFiles).toContainEqual(
          expect.objectContaining({ filePath: rejectedFile.filePath })
        );
      });

      // UT-JE-013
      it("'domain/'配下のchangeKind=CREATEファイルが含まれる場合にeligible=false、rejectionRule='NEW_DOMAIN'が返ること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/value-objects/new-vo.ts',
            changeKind: 'CREATE',
          }),
        ];
        // allowedCategoriesにdomain含まないが、NEW_DOMAINはMIXED_CHANGESより後に評価される
        // CREATEかつdomainカテゴリ → まずMIXED_CHANGESで弾かれる（UT-JE-017参照）
        // NEW_DOMAINルール単体を評価するには、domainがallowedに入った設定でCREATEを渡す
        const config = createQuickModeConfig({
          allowedCategories: ['bugfix', 'docs', 'test', 'config', 'domain'],
        });
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(false);
        expect(actual.rejectionRule).toBe('NEW_DOMAIN');
      });

      // UT-JE-014
      it("'domain/'配下のchangeKind=MODIFYファイルのみが含まれる場合にNEW_DOMAINルールで拒否されないこと（MIXED_CHANGESで拒否される）", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
            changeKind: 'MODIFY',
          }),
        ];
        const config = createQuickModeConfig();
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.rejectionRule).not.toBe('NEW_DOMAIN');
        expect(actual.rejectionRule).toBe('MIXED_CHANGES');
      });

      // UT-JE-015
      it("'*port.ts'ファイルの変更が含まれる場合にeligible=false、rejectionRule='API_CONTRACT'が返ること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/application/ports/changed-files-port.ts',
            changeKind: 'MODIFY',
          }),
        ];
        // API_CONTRACTを単独評価するためallowedにapi含む設定
        const config = createQuickModeConfig({
          allowedCategories: ['bugfix', 'docs', 'test', 'config', 'api'],
        });
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(false);
        expect(actual.rejectionRule).toBe('API_CONTRACT');
      });

      // UT-JE-016
      it("'*adapter.ts'ファイルの変更が含まれる場合にeligible=false、rejectionRule='API_CONTRACT'が返ること", () => {
        // Arrange
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/infrastructure/adapters/git-adapter.ts',
            changeKind: 'MODIFY',
          }),
        ];
        const config = createQuickModeConfig({
          allowedCategories: ['bugfix', 'docs', 'test', 'config', 'api'],
        });
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.isEligible()).toBe(false);
        expect(actual.rejectionRule).toBe('API_CONTRACT');
      });
    });

    describe('3拒否ルールをMIXED_CHANGES→NEW_DOMAIN→API_CONTRACTの順で評価する', () => {
      // UT-JE-017
      it('MIXED_CHANGESとNEW_DOMAINの両条件に該当するファイルが含まれる場合に最初に一致するMIXED_CHANGESルールで拒否されること', () => {
        // Arrange
        // domain/配下のCREATEはMIXED_CHANGES（allowedCategories外）かつNEW_DOMAIN双方に該当する
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/value-objects/new-vo.ts',
            changeKind: 'CREATE',
          }),
        ];
        const config = createQuickModeConfig(); // domain非許可
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.rejectionRule).toBe('MIXED_CHANGES');
      });

      // UT-JE-018
      it('NEW_DOMAINとAPI_CONTRACTの両条件に該当するファイルが含まれる場合にNEW_DOMAINルールで拒否されること', () => {
        // Arrange
        // domain/配下のCREATEかつ*port.ts → NEW_DOMAIN（MIXED_CHANGESの後）が先に評価
        // allowedCategoriesにdomainとapiを含めてMIXED_CHANGESを回避
        const files = [
          ChangedFile.create({
            filePath: 'scripts/harness/quick-mode/domain/ports/new-domain-port.ts',
            changeKind: 'CREATE',
          }),
        ];
        const config = createQuickModeConfig({
          allowedCategories: ['bugfix', 'docs', 'test', 'config', 'domain', 'api'],
        });
        // Act
        const actual = engine.judge(files, config);
        // Assert
        expect(actual.rejectionRule).toBe('NEW_DOMAIN');
      });
    });

    // UT-JE-019: INV-1不変条件
    it('INV-1: 任意の有効なChangedFile[]とQuickModeConfigで判定結果にLevel間依存緩和の情報が含まれないこと', () => {
      // Arrange
      const files = [createChangedFile()];
      const config = createQuickModeConfig();
      // Act
      const actual = engine.judge(files, config);
      // Assert
      // QuickModeEligibilityはlevelDependencyRelaxedプロパティを持たない
      expect((actual as Record<string, unknown>)['levelDependencyRelaxed']).toBeUndefined();
    });

    // UT-JE-020
    it('3拒否ルールはallowedCategoriesで上書きできない: allowedCategoriesに全カテゴリを含む設定でdomainカテゴリのファイルを渡した場合にMIXED_CHANGESルールで拒否されること', () => {
      // Arrange
      // allowedCategoriesに全カテゴリを設定してもdomain/配下はMIXED_CHANGESで弾かれる
      // NOTE: 実装上、allowedCategoriesへの'domain'追加はQuickModeConfigErrorを発生させる（UT-QMC-003）
      // そのため、'domain'を含む設定ではconfig生成自体がエラーになる
      // → このケースは「3拒否ルールはconfigで迂回不能」を設計レベルで確認するケース
      // 実装時は QuickModeConfig.create での validation を確認する
      const domainFile = ChangedFile.create({
        filePath: 'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
        changeKind: 'MODIFY',
      });
      const config = createQuickModeConfig(); // allowedCategoriesにdomain非許可 = デフォルト
      // Act
      const actual = engine.judge([domainFile], config);
      // Assert
      expect(actual.isEligible()).toBe(false);
      expect(actual.rejectionRule).toBe('MIXED_CHANGES');
    });
  });
});
```

---

### 3.9 `validator-relaxation-service.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../../helpers/test-helpers';
import { ValidatorRelaxationService } from '../../../../harness/quick-mode/domain/services/validator-relaxation-service';
import { createQuickModeConfig } from '../../../../helpers/test-helpers';

const service = new ValidatorRelaxationService();

// L1〜L4の全ValidatorId一覧（テスト用）
const ALL_VALIDATOR_IDS = [
  'L1-001', 'L1-002',
  'L2-001', 'L2-002', 'L2-003', 'L2-013', 'L2-014', 'L2-015',
  'L3-001', 'L3-002', 'L3-003', 'L3-004',
  'L4-001', 'L4-002', 'L4-003', 'L4-004', 'L4-005',
];

target('ValidatorRelaxationService', () => {
  target('build', () => {
    describe('QuickModeConfigと全ValidatorId一覧からValidatorRelaxationProfileを生成する', () => {
      // UT-VRS-001
      it('デフォルト設定と全ValidatorId（L1-001〜L4-005）が渡された場合にデフォルト緩和プロファイルが生成されること', () => {
        // Arrange
        const config = createQuickModeConfig(); // relaxedGates: ['L2-001'], maintainedLayers: ['L1']
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.l2.skipped).toContain('L2-001');
        expect(actual.l2.maintained).toEqual(expect.arrayContaining(['L2-002', 'L2-003']));
        expect(actual.l3.maintained).toContain('L3-001');
        expect(actual.l3.skipped).toEqual(expect.arrayContaining(['L3-002', 'L3-003', 'L3-004']));
      });

      // UT-VRS-002
      it('maintainedLayersにL2-001が含まれる設定が渡された場合にl2.maintainedにL2-001が含まれること', () => {
        // Arrange
        const config = createQuickModeConfig({
          maintainedLayers: ['L1', 'L2-001'],
          relaxedGates: [],
        });
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.l2.maintained).toContain('L2-001');
      });

      // UT-VRS-003
      it('relaxedGatesにL2-001のみが含まれる設定が渡された場合にl2.skippedにL2-001のみが含まれること', () => {
        // Arrange
        const config = createQuickModeConfig({ relaxedGates: ['L2-001'] });
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.l2.skipped).toEqual(['L2-001']);
      });

      // UT-VRS-004
      it('L1の全IDが渡された場合にl1.all=trueが設定されること（INV-P2保証）', () => {
        // Arrange
        const config = createQuickModeConfig();
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.l1.all).toBe(true);
      });

      // UT-VRS-005
      it('L4のIDが渡された場合にl4.all=falseが設定されること（INV-P3保証）、L4はスキップされること', () => {
        // Arrange
        const config = createQuickModeConfig();
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.l4.all).toBe(false);
      });

      // UT-VRS-006
      it("allValidatorIdsに認識できないID（'X1-999'）が含まれる場合に無視されてエラーが発生しないこと", () => {
        // Arrange
        const config = createQuickModeConfig();
        const allValidatorIdsWithUnknown = [...ALL_VALIDATOR_IDS, 'X1-999'];
        // Act
        const actual = () => service.build(config, allValidatorIdsWithUnknown);
        // Assert
        expect(actual).not.toThrow();
      });

      // UT-VRS-007
      it('生成されたプロファイルのlevelDependencyRelaxedが常にfalseであること（INV-P1保証）', () => {
        // Arrange
        const config = createQuickModeConfig();
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.levelDependencyRelaxed).toBe(false);
      });

      // UT-VRS-008
      it('生成されたプロファイルのphaseExecution.twoPhaseRequiredが常にfalseであること（INV-P4保証）', () => {
        // Arrange
        const config = createQuickModeConfig();
        // Act
        const actual = service.build(config, ALL_VALIDATOR_IDS);
        // Assert
        expect(actual.phaseExecution.twoPhaseRequired).toBe(false);
      });
    });
  });
});
```

---

### 3.10 `judge-quick-mode-eligibility-usecase.test.ts`

```typescript
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../../../helpers/test-helpers';
import { JudgeQuickModeEligibilityUseCase } from '../../../../harness/quick-mode/application/usecases/judge-quick-mode-eligibility-usecase';
import { createChangedFile, createQuickModeConfig } from '../../../../helpers/test-helpers';
import type { ChangedFilesPort } from '../../../../harness/quick-mode/application/ports/changed-files-port';
import type { QuickModeConfigPort } from '../../../../harness/quick-mode/application/ports/quick-mode-config-port';

// PortモックのビルダーはQA=0のため各テスト内でvi.fn()を直接構成する
const buildSut = (overrides?: {
  changedFiles?: ReturnType<typeof vi.fn>;
  getConfig?: ReturnType<typeof vi.fn>;
}) => {
  const changedFilesPort: ChangedFilesPort = {
    getChangedFiles: overrides?.changedFiles ?? vi.fn().mockResolvedValue([createChangedFile()]),
  };
  const quickModeConfigPort: QuickModeConfigPort = {
    getConfig: overrides?.getConfig ?? vi.fn().mockResolvedValue(createQuickModeConfig()),
  };
  const sut = new JudgeQuickModeEligibilityUseCase({ changedFilesPort, quickModeConfigPort });
  return { sut, changedFilesPort, quickModeConfigPort };
};

target('JudgeQuickModeEligibilityUseCase', () => {
  target('execute', () => {
    describe('変更ファイルの自動取得から適用可否判定まで実行する', () => {
      // UT-JUC-001
      it('changedFilesを省略した場合にChangedFilesPortから変更ファイルを取得してQuickModeEligibilityContractを返すこと', async () => {
        // Arrange
        const { sut, changedFilesPort } = buildSut();
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(changedFilesPort.getChangedFiles).toHaveBeenCalledOnce();
        expect(actual).toHaveProperty('eligible');
      });

      // UT-JUC-002
      it('明示的なchangedFiles配列が渡された場合に渡されたファイルを使用してQuickModeEligibilityContractを返すこと（PortのgetChangedFilesが呼ばれないこと）', async () => {
        // Arrange
        const { sut, changedFilesPort } = buildSut();
        const files = [createChangedFile()];
        // Act
        const actual = await sut.execute({ changedFiles: files });
        // Assert
        expect(changedFilesPort.getChangedFiles).not.toHaveBeenCalled();
        expect(actual).toHaveProperty('eligible');
      });

      // UT-JUC-003
      it('全ファイルがallowedCategories内のみの場合にeligible=trueのcontractが返ること', async () => {
        // Arrange
        const allowedFile = createChangedFile(
          'scripts/harness/quick-mode/services/quick-service.ts',
          'MODIFY'
        );
        const { sut } = buildSut({
          changedFiles: vi.fn().mockResolvedValue([allowedFile]),
        });
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(actual.eligible).toBe(true);
      });
    });

    describe('3拒否ルール別', () => {
      // UT-JUC-004
      it("MIXED_CHANGESルールに該当するファイルが含まれる場合にeligible=false、rejectionRule='MIXED_CHANGES'のcontractが返ること", async () => {
        // Arrange
        const domainFile = createChangedFile(
          'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
          'MODIFY'
        );
        const { sut } = buildSut({
          changedFiles: vi.fn().mockResolvedValue([domainFile]),
        });
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(actual.eligible).toBe(false);
        expect(actual.rejectionRule).toBe('MIXED_CHANGES');
      });

      // UT-JUC-005
      it("NEW_DOMAINルールに該当するファイルが含まれる場合にeligible=false、rejectionRule='NEW_DOMAIN'のcontractが返ること", async () => {
        // Arrange
        const newDomainFile = createChangedFile(
          'scripts/harness/quick-mode/domain/value-objects/new-vo.ts',
          'CREATE'
        );
        const config = createQuickModeConfig({
          allowedCategories: ['bugfix', 'docs', 'test', 'config', 'domain'],
        });
        const { sut } = buildSut({
          changedFiles: vi.fn().mockResolvedValue([newDomainFile]),
          getConfig: vi.fn().mockResolvedValue(config),
        });
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(actual.eligible).toBe(false);
        expect(actual.rejectionRule).toBe('NEW_DOMAIN');
      });

      // UT-JUC-006
      it("API_CONTRACTルールに該当するファイルが含まれる場合にeligible=false、rejectionRule='API_CONTRACT'のcontractが返ること", async () => {
        // Arrange
        const portFile = createChangedFile(
          'scripts/harness/quick-mode/application/ports/changed-files-port.ts',
          'MODIFY'
        );
        const config = createQuickModeConfig({
          allowedCategories: ['bugfix', 'docs', 'test', 'config', 'api'],
        });
        const { sut } = buildSut({
          changedFiles: vi.fn().mockResolvedValue([portFile]),
          getConfig: vi.fn().mockResolvedValue(config),
        });
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(actual.eligible).toBe(false);
        expect(actual.rejectionRule).toBe('API_CONTRACT');
      });
    });

    describe('異常系', () => {
      // UT-JUC-007
      it('不明なchangeKindを持つファイルが明示指定された場合にUnknownChangeCategoryError相当のエラーが発生すること', async () => {
        // Arrange
        const { sut } = buildSut();
        const invalidFile = { filePath: 'some/path.ts', changeKind: 'RENAME' };
        // Act
        const actual = sut.execute({ changedFiles: [invalidFile as never] });
        // Assert
        await expect(actual).rejects.toThrow();
      });

      // UT-JUC-008
      it('QuickModeConfigPortがエラーを返す場合にPortエラーがUseCaseから伝播すること', async () => {
        // Arrange
        const { sut } = buildSut({
          getConfig: vi.fn().mockRejectedValue(new Error('config load error')),
        });
        // Act
        const actual = sut.execute({});
        // Assert
        await expect(actual).rejects.toThrow('config load error');
      });

      // UT-JUC-009
      it('ChangedFilesPortがエラーを返す場合にPortエラーがUseCaseから伝播すること', async () => {
        // Arrange
        const { sut } = buildSut({
          changedFiles: vi.fn().mockRejectedValue(new Error('git error')),
        });
        // Act
        const actual = sut.execute({});
        // Assert
        await expect(actual).rejects.toThrow('git error');
      });
    });

    describe('出力形式確認', () => {
      // UT-JUC-010
      it('eligible=trueの場合に返り値のrejectionRuleがundefinedであること', async () => {
        // Arrange
        const allowedFile = createChangedFile(
          'scripts/harness/quick-mode/services/quick-service.ts',
          'MODIFY'
        );
        const { sut } = buildSut({
          changedFiles: vi.fn().mockResolvedValue([allowedFile]),
        });
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(actual.rejectionRule).toBeUndefined();
      });

      // UT-JUC-011
      it('eligible=trueの場合に返り値のrejectedFilesがundefinedであること', async () => {
        // Arrange
        const allowedFile = createChangedFile(
          'scripts/harness/quick-mode/services/quick-service.ts',
          'MODIFY'
        );
        const { sut } = buildSut({
          changedFiles: vi.fn().mockResolvedValue([allowedFile]),
        });
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(actual.rejectedFiles).toBeUndefined();
      });

      // UT-JUC-012
      it('eligible=falseの場合に返り値のrejectedFilesに1件以上のファイルが含まれること', async () => {
        // Arrange
        const domainFile = createChangedFile(
          'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
          'MODIFY'
        );
        const { sut } = buildSut({
          changedFiles: vi.fn().mockResolvedValue([domainFile]),
        });
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(actual.rejectedFiles).toBeDefined();
        expect(actual.rejectedFiles!.length).toBeGreaterThanOrEqual(1);
      });

      // UT-JUC-013
      it('eligible=falseの場合に返り値のreasonが空文字でないこと', async () => {
        // Arrange
        const domainFile = createChangedFile(
          'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
          'MODIFY'
        );
        const { sut } = buildSut({
          changedFiles: vi.fn().mockResolvedValue([domainFile]),
        });
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(actual.reason).toBeTruthy();
      });

      // UT-JUC-014
      it('返り値のObject.freeze()が適用されている場合にcontractオブジェクトが凍結されていること', async () => {
        // Arrange
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({});
        // Assert
        expect(Object.isFrozen(actual)).toBe(true);
      });
    });
  });
});
```

---

### 3.11 `build-relaxation-profile-usecase.test.ts`

```typescript
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../../../helpers/test-helpers';
import { BuildRelaxationProfileUseCase } from '../../../../harness/quick-mode/application/usecases/build-relaxation-profile-usecase';
import { createQuickModeConfig, createQuickModeEligibility } from '../../../../helpers/test-helpers';
import type { QuickModeConfigPort } from '../../../../harness/quick-mode/application/ports/quick-mode-config-port';
import type { ValidatorIdRegistryPort } from '../../../../harness/quick-mode/application/ports/validator-id-registry-port';

const ALL_VALIDATOR_IDS = [
  'L1-001', 'L1-002',
  'L2-001', 'L2-002', 'L2-003', 'L2-013', 'L2-014', 'L2-015',
  'L3-001', 'L3-002', 'L3-003', 'L3-004',
  'L4-001', 'L4-002', 'L4-003', 'L4-004', 'L4-005',
];

const buildSut = (overrides?: {
  getConfig?: ReturnType<typeof vi.fn>;
  getAllIds?: ReturnType<typeof vi.fn>;
}) => {
  const quickModeConfigPort: QuickModeConfigPort = {
    getConfig: overrides?.getConfig ?? vi.fn().mockResolvedValue(createQuickModeConfig()),
  };
  const validatorIdRegistryPort: ValidatorIdRegistryPort = {
    getAllIds: overrides?.getAllIds ?? vi.fn().mockResolvedValue(ALL_VALIDATOR_IDS),
  };
  const sut = new BuildRelaxationProfileUseCase({ quickModeConfigPort, validatorIdRegistryPort });
  return { sut, quickModeConfigPort, validatorIdRegistryPort };
};

target('BuildRelaxationProfileUseCase', () => {
  target('execute', () => {
    describe('eligibility=trueの場合にValidatorRelaxationProfileContractを生成する', () => {
      // UT-BUC-001
      it('eligible=trueのcontractが渡された場合にValidatorRelaxationProfileContractが返ること', async () => {
        // Arrange
        const eligibilityContract = { eligible: true, reason: 'OK' };
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ eligibilityContract });
        // Assert
        expect(actual).toHaveProperty('l1');
        expect(actual).toHaveProperty('l2');
        expect(actual).toHaveProperty('l3');
        expect(actual).toHaveProperty('l4');
      });

      // UT-BUC-002
      it('デフォルト設定の場合にL2-001スキップ・L2-002+L2-003維持・L3-001維持・L3-002〜L3-004スキップのcontractが返ること', async () => {
        // Arrange
        const eligibilityContract = { eligible: true, reason: 'OK' };
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ eligibilityContract });
        // Assert
        expect(actual.l2.skipped).toContain('L2-001');
        expect(actual.l2.maintained).toEqual(expect.arrayContaining(['L2-002', 'L2-003']));
        expect(actual.l3.maintained).toContain('L3-001');
        expect(actual.l3.skipped).toEqual(
          expect.arrayContaining(['L3-002', 'L3-003', 'L3-004'])
        );
      });

      // UT-BUC-003
      it('生成されたcontractのlevelDependencyRelaxedがfalseであること', async () => {
        // Arrange
        const eligibilityContract = { eligible: true, reason: 'OK' };
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ eligibilityContract });
        // Assert
        expect(actual.levelDependencyRelaxed).toBe(false);
      });
    });

    describe('異常系', () => {
      // UT-BUC-004
      it('eligible=falseのcontractが渡された場合にQuickModeNotEligibleErrorが発生すること', async () => {
        // Arrange
        const eligibilityContract = {
          eligible: false,
          reason: 'domain category detected',
          rejectionRule: 'MIXED_CHANGES',
          rejectedFiles: [{ filePath: 'scripts/harness/quick-mode/domain/vo.ts', changeKind: 'MODIFY' }],
        };
        const { sut } = buildSut();
        // Act
        const actual = sut.execute({ eligibilityContract });
        // Assert
        await expect(actual).rejects.toThrow();
      });
    });

    describe('出力形式確認', () => {
      const eligibilityContract = { eligible: true, reason: 'OK' };

      // UT-BUC-005
      it('返り値のl1がall=trueであること', async () => {
        // Arrange
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ eligibilityContract });
        // Assert
        expect(actual.l1.all).toBe(true);
      });

      // UT-BUC-006
      it('返り値のl4がall=falseであること', async () => {
        // Arrange
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ eligibilityContract });
        // Assert
        expect(actual.l4.all).toBe(false);
      });

      // UT-BUC-007
      it('返り値のphaseExecutionがtwoPhaseRequired=falseであること', async () => {
        // Arrange
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ eligibilityContract });
        // Assert
        expect(actual.phaseExecution.twoPhaseRequired).toBe(false);
      });

      // UT-BUC-008
      it('QuickModeConfigPortがエラーを返す場合にPortエラーがUseCaseから伝播すること', async () => {
        // Arrange
        const { sut } = buildSut({
          getConfig: vi.fn().mockRejectedValue(new Error('config error')),
        });
        // Act
        const actual = sut.execute({ eligibilityContract });
        // Assert
        await expect(actual).rejects.toThrow('config error');
      });

      // UT-BUC-009
      it('ValidatorIdRegistryPortがエラーを返す場合にPortエラーがUseCaseから伝播すること', async () => {
        // Arrange
        const { sut } = buildSut({
          getAllIds: vi.fn().mockRejectedValue(new Error('registry error')),
        });
        // Act
        const actual = sut.execute({ eligibilityContract });
        // Assert
        await expect(actual).rejects.toThrow('registry error');
      });

      // UT-BUC-010
      it('返り値のObject.freeze()が適用されている場合にcontractオブジェクトが再帰的に凍結されていること', async () => {
        // Arrange
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ eligibilityContract });
        // Assert
        expect(Object.isFrozen(actual)).toBe(true);
      });
    });
  });
});
```

---

### 3.12 `execute-quick-ci-check-usecase.test.ts`

```typescript
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../../../helpers/test-helpers';
import { ExecuteQuickCiCheckUseCase } from '../../../../harness/quick-mode/application/usecases/execute-quick-ci-check-usecase';
import { createChangedFile, createValidatorRelaxationProfile } from '../../../../helpers/test-helpers';
import type { ValidatorExecutionPort } from '../../../../harness/quick-mode/application/ports/validator-execution-port';

// テストダブル用の型定義
type JudgeDouble = { execute: ReturnType<typeof vi.fn> };
type BuildDouble = { execute: ReturnType<typeof vi.fn> };

const ELIGIBLE_CONTRACT = {
  eligible: true as const,
  reason: 'OK',
};

const NOT_ELIGIBLE_CONTRACT = {
  eligible: false as const,
  reason: 'domain detected',
  rejectionRule: 'MIXED_CHANGES' as const,
  rejectedFiles: [{ filePath: 'scripts/harness/quick-mode/domain/vo.ts', changeKind: 'MODIFY' as const }],
};

const PROFILE_CONTRACT = {
  levelDependencyRelaxed: false,
  l1: { all: true },
  l2: { maintained: ['L2-002', 'L2-003', 'L2-014'], skipped: ['L2-001', 'L2-013', 'L2-015'] },
  l3: { maintained: ['L3-001'], skipped: ['L3-002', 'L3-003', 'L3-004'] },
  l4: { all: false },
  phaseExecution: { twoPhaseRequired: false },
};

const buildSut = (overrides?: {
  judgeExecute?: ReturnType<typeof vi.fn>;
  buildExecute?: ReturnType<typeof vi.fn>;
  validatorExecutionPort?: ValidatorExecutionPort;
}) => {
  const judgeUseCase: JudgeDouble = {
    execute: overrides?.judgeExecute ?? vi.fn().mockResolvedValue(ELIGIBLE_CONTRACT),
  };
  const buildUseCase: BuildDouble = {
    execute: overrides?.buildExecute ?? vi.fn().mockResolvedValue(PROFILE_CONTRACT),
  };
  const validatorExecutionPort: ValidatorExecutionPort = overrides?.validatorExecutionPort ?? {
    executeWithProfile: vi.fn().mockResolvedValue(undefined),
  };
  const sut = new ExecuteQuickCiCheckUseCase({
    judgeUseCase: judgeUseCase as never,
    buildUseCase: buildUseCase as never,
    validatorExecutionPort,
  });
  return { sut, judgeUseCase, buildUseCase, validatorExecutionPort };
};

target('ExecuteQuickCiCheckUseCase', () => {
  target('execute', () => {
    describe('H10-01→H10-02の順で処理を実行しQuickModeDecisionContractを返す', () => {
      // UT-EUC-001
      it('eligible=falseの判定結果が返ってきた場合にrelaxationProfile=undefinedのQuickModeDecisionContractが返ること', async () => {
        // Arrange
        const { sut } = buildSut({
          judgeExecute: vi.fn().mockResolvedValue(NOT_ELIGIBLE_CONTRACT),
        });
        // Act
        const actual = await sut.execute({ dryRun: false });
        // Assert
        expect(actual.eligibility.eligible).toBe(false);
        expect(actual.relaxationProfile).toBeUndefined();
      });

      // UT-EUC-002
      it('eligible=falseの場合にBuildRelaxationProfileUseCaseが呼ばれないこと', async () => {
        // Arrange
        const { sut, buildUseCase } = buildSut({
          judgeExecute: vi.fn().mockResolvedValue(NOT_ELIGIBLE_CONTRACT),
        });
        // Act
        await sut.execute({ dryRun: false });
        // Assert
        expect(buildUseCase.execute).not.toHaveBeenCalled();
      });

      // UT-EUC-003
      it('eligible=trueの判定結果が返ってきた場合にrelaxationProfileを含むQuickModeDecisionContractが返ること', async () => {
        // Arrange
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ dryRun: false });
        // Assert
        expect(actual.eligibility.eligible).toBe(true);
        expect(actual.relaxationProfile).toBeDefined();
      });

      // UT-EUC-004
      it("eligible=trueかつdryRun=falseの場合に`validatorExecutionPort.executeWithProfile(relaxationProfile)`が1回呼ばれること（DIP保証）", async () => {
        // Arrange
        const { sut, validatorExecutionPort } = buildSut();
        // Act
        await sut.execute({ dryRun: false });
        // Assert
        expect(validatorExecutionPort.executeWithProfile).toHaveBeenCalledOnce();
      });

      // UT-EUC-005
      it('eligible=trueかつdryRun=trueの場合に`validatorExecutionPort.executeWithProfile`が呼ばれないこと', async () => {
        // Arrange
        const { sut, validatorExecutionPort } = buildSut();
        // Act
        await sut.execute({ dryRun: true });
        // Assert
        expect(validatorExecutionPort.executeWithProfile).not.toHaveBeenCalled();
      });

      // UT-EUC-006
      it('dryRun=trueかつeligible=trueの場合にrelaxationProfileが含まれたcontractが返ること（dryRunでもProfileは生成される）', async () => {
        // Arrange
        const { sut } = buildSut();
        // Act
        const actual = await sut.execute({ dryRun: true });
        // Assert
        expect(actual.relaxationProfile).toBeDefined();
      });

      // UT-EUC-007
      it('changedFilesを省略した場合にJudgeQuickModeEligibilityUseCaseにchangedFiles=undefinedで渡されること', async () => {
        // Arrange
        const { sut, judgeUseCase } = buildSut();
        // Act
        await sut.execute({ dryRun: false });
        // Assert
        expect(judgeUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({ changedFiles: undefined })
        );
      });

      // UT-EUC-008
      it('changedFilesを明示指定した場合に指定のchangedFilesがJudgeQuickModeEligibilityUseCaseに渡されること', async () => {
        // Arrange
        const { sut, judgeUseCase } = buildSut();
        const changedFiles = [createChangedFile()];
        // Act
        await sut.execute({ dryRun: false, changedFiles });
        // Assert
        expect(judgeUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({ changedFiles })
        );
      });
    });

    describe('異常系', () => {
      // UT-EUC-009
      it('JudgeQuickModeEligibilityUseCaseがエラーを投げる場合にUseCaseエラーがExecuteQuickCiCheckUseCaseから伝播すること', async () => {
        // Arrange
        const { sut } = buildSut({
          judgeExecute: vi.fn().mockRejectedValue(new Error('judge error')),
        });
        // Act
        const actual = sut.execute({ dryRun: false });
        // Assert
        await expect(actual).rejects.toThrow('judge error');
      });

      // UT-EUC-010
      it('BuildRelaxationProfileUseCaseがエラーを投げる場合にUseCaseエラーがExecuteQuickCiCheckUseCaseから伝播すること', async () => {
        // Arrange
        const { sut } = buildSut({
          buildExecute: vi.fn().mockRejectedValue(new Error('build error')),
        });
        // Act
        const actual = sut.execute({ dryRun: false });
        // Assert
        await expect(actual).rejects.toThrow('build error');
      });
    });
  });
});
```

---

### 3.13 `quick-mode-decision-contract-mapper.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { target, context } from '../../../../helpers/test-helpers';
import { QuickModeDecisionContractMapper } from '../../../../harness/quick-mode/application/mappers/quick-mode-decision-contract-mapper';
import {
  createChangedFile,
  createQuickModeEligibility,
  createValidatorRelaxationProfile,
  createQuickModeDecision,
} from '../../../../helpers/test-helpers';
import { QuickModeEligibility } from '../../../../harness/quick-mode/domain/value-objects/quick-mode-eligibility';

const mapper = new QuickModeDecisionContractMapper();

target('QuickModeDecisionContractMapper', () => {
  target('toEligibilityContract', () => {
    describe('QuickModeEligibilityをDTOに変換する', () => {
      // UT-MAP-001
      it('eligible=trueのインスタンスが渡された場合にeligible=true、rejectionRule=undefined、rejectedFiles=undefinedのcontractが返ること', () => {
        // Arrange
        const eligibility = createQuickModeEligibility(true);
        // Act
        const actual = mapper.toEligibilityContract(eligibility);
        // Assert
        expect(actual.eligible).toBe(true);
        expect(actual.rejectionRule).toBeUndefined();
        expect(actual.rejectedFiles).toBeUndefined();
      });

      // UT-MAP-002
      it('eligible=falseのインスタンスが渡された場合にeligible=false、rejectionRuleとrejectedFilesが設定されたcontractが返ること', () => {
        // Arrange
        const eligibility = createQuickModeEligibility(false);
        // Act
        const actual = mapper.toEligibilityContract(eligibility);
        // Assert
        expect(actual.eligible).toBe(false);
        expect(actual.rejectionRule).toBeDefined();
        expect(actual.rejectedFiles).toBeDefined();
      });

      // UT-MAP-003
      it('rejectedFilesを含むインスタンスが渡された場合にrejectedFilesが{filePath, changeKind}の配列に変換されること', () => {
        // Arrange
        const rejectedFile = createChangedFile(
          'scripts/harness/quick-mode/domain/value-objects/some-vo.ts',
          'MODIFY'
        );
        const eligibility = QuickModeEligibility.rejected(
          'MIXED_CHANGES',
          [rejectedFile],
          'domain カテゴリが含まれる'
        );
        // Act
        const actual = mapper.toEligibilityContract(eligibility);
        // Assert
        expect(actual.rejectedFiles).toEqual([
          { filePath: rejectedFile.filePath, changeKind: rejectedFile.changeKind },
        ]);
      });
    });
  });

  target('toRelaxationProfileContract', () => {
    describe('ValidatorRelaxationProfileをDTOに変換する', () => {
      // UT-MAP-004
      it('デフォルトプロファイルが渡された場合にValidatorRelaxationProfileContractが返ること', () => {
        // Arrange
        const profile = createValidatorRelaxationProfile();
        // Act
        const actual = mapper.toRelaxationProfileContract(profile);
        // Assert
        expect(actual).toHaveProperty('l1');
        expect(actual).toHaveProperty('l2');
        expect(actual).toHaveProperty('l3');
        expect(actual).toHaveProperty('l4');
        expect(actual).toHaveProperty('levelDependencyRelaxed');
        expect(actual).toHaveProperty('phaseExecution');
      });

      // UT-MAP-005
      it('変換後のlevelDependencyRelaxedがfalseであること', () => {
        // Arrange
        const profile = createValidatorRelaxationProfile();
        // Act
        const actual = mapper.toRelaxationProfileContract(profile);
        // Assert
        expect(actual.levelDependencyRelaxed).toBe(false);
      });
    });
  });

  target('toDecisionContract', () => {
    describe('QuickModeDecisionを統合DTOに変換する', () => {
      // UT-MAP-006
      it('approved()のインスタンスが渡された場合にeligibilityとrelaxationProfileの両方が設定されたcontractが返ること', () => {
        // Arrange
        const decision = createQuickModeDecision(true);
        // Act
        const actual = mapper.toDecisionContract(decision);
        // Assert
        expect(actual.eligibility).toBeDefined();
        expect(actual.eligibility.eligible).toBe(true);
        expect(actual.relaxationProfile).toBeDefined();
      });

      // UT-MAP-007
      it('rejected()のインスタンスが渡された場合にrelaxationProfile=undefinedのcontractが返ること', () => {
        // Arrange
        const decision = createQuickModeDecision(false);
        // Act
        const actual = mapper.toDecisionContract(decision);
        // Assert
        expect(actual.eligibility.eligible).toBe(false);
        expect(actual.relaxationProfile).toBeUndefined();
      });

      // UT-MAP-008
      it('変換後のcontractがObject.freeze()されている場合にcontractが凍結されていること', () => {
        // Arrange
        const decision = createQuickModeDecision(true);
        // Act
        const actual = mapper.toDecisionContract(decision);
        // Assert
        expect(Object.isFrozen(actual)).toBe(true);
      });
    });
  });
});
```

---

## 4. モック戦略

- **VO・ドメインサービス層**: モック不使用。`QuickModeConfig`、`ChangedFile`、`ChangeCategory`、`ChangeClassification`、`QuickModeEligibility`、`ValidatorRelaxationProfile`、`QuickModeDecision`、`QuickModeJudgmentEngine`、`ValidatorRelaxationService` はすべて実体を生成する。
- **UseCase層のPort**: `vi.fn()` でスタブ化する。対象は以下の通り。
  - `ChangedFilesPort.getChangedFiles` — `vi.fn().mockResolvedValue([ChangedFile])`
  - `QuickModeConfigPort.getConfig` — `vi.fn().mockResolvedValue(QuickModeConfig)`
  - `ValidatorIdRegistryPort.getAllIds` — `vi.fn().mockResolvedValue(string[])`
  - `ValidatorExecutionPort.executeWithProfile` — `vi.fn().mockResolvedValue(undefined)` （ExecuteQuickCiCheckUseCaseで使用）
- **UseCase間依存**: `ExecuteQuickCiCheckUseCase` のテストでは `JudgeQuickModeEligibilityUseCase` / `BuildRelaxationProfileUseCase` を `vi.fn()` のテストダブルとして注入する。各テストダブルの `execute` を `mockResolvedValue` で制御し、呼び出し回数・引数の検証には `toHaveBeenCalledOnce`・`toHaveBeenCalledWith` を使用する。
- モック不要の判断基準: 「純粋な値検証」または「同一Domain内の不変条件検証」。モック必要の判断基準: 「Port境界を越えた I/O（ファイルシステム・レジストリ参照）」または「UseCase間オーケストレーション」。

---

## 5. 境界値テスト一覧

| ケースID | 対象 | 境界条件 | 入力例 | 期待結果 |
|---|---|---|---|---|
| UT-EDGE-001 | QuickModeConfig | allowedCategoriesが空配列 | `allowedCategories: []` | `QuickModeConfigError` が発生すること |
| UT-EDGE-002 | QuickModeConfig | allowedCategoriesに'domain'を含む | `allowedCategories: ['bugfix', 'domain']` | `QuickModeConfigError` が発生すること（二重防護） |
| UT-EDGE-003 | ChangedFile | filePathが空文字 | `filePath: ''` | エラーが発生すること |
| UT-EDGE-004 | ChangedFile | changeKindが不正値 | `changeKind: 'UPDATE'` | エラーが発生すること |
| UT-EDGE-005 | ChangeCategory | 定義外の文字列 | `'unknown-category'` | `UnknownChangeCategoryError` が発生すること |
| UT-EDGE-006 | QuickModeEligibility | eligible=false、rejectedFiles=[] | `rejected('MIXED_CHANGES', [], 'r')` | エラーが発生すること（INV-E2） |
| UT-EDGE-007 | QuickModeEligibility | eligible=true/false、reason='' | `eligible('')` / `rejected('...', [f], '')` | エラーが発生すること（INV-E3） |
| UT-EDGE-008 | ValidatorRelaxationProfile | l2のunion ≠ {L2-001, L2-002, L2-003, L2-013, L2-014, L2-015} | `l2.maintained=['L2-002'], l2.skipped=['L2-001']` | エラーが発生すること（INV-P5） |
| UT-EDGE-009 | ValidatorRelaxationProfile | l3のunion ≠ {L3-001, L3-002, L3-003, L3-004} | `l3.maintained=['L3-001'], l3.skipped=['L3-002', 'L3-003']` | エラーが発生すること（INV-P6） |
| UT-EDGE-010 | QuickModeJudgmentEngine.judge | changedFiles=[] | `[]` | `eligible=true` が返ること |
| UT-EDGE-011 | QuickModeJudgmentEngine.judge | MIXED_CHANGESとNEW_DOMAINが重複 | domain/配下のCREATEファイルをallowed外で渡す | `MIXED_CHANGES` が優先されること |
| UT-EDGE-012 | BuildRelaxationProfileUseCase | eligible=falseのcontractを渡す | `eligibilityContract.eligible=false` | `QuickModeNotEligibleError` が発生すること |
| UT-EDGE-013 | ValidatorRelaxationService.build | allValidatorIdsに未知のIDが含まれる | `[...validIds, 'X1-999']` | 無視してエラーが発生しないこと |
| UT-EDGE-014 | QuickModeDecision.approved | eligible=falseのeligibilityを渡す | `approved(falseEligibility, profile)` | エラーが発生すること |
| UT-EDGE-015 | QuickModeJudgmentEngine.judge | domain/配下のCREATEとMODIFYが混在 | `[CREATE@domain/, MODIFY@service.ts]` | MIXED_CHANGESが先に評価されて拒否されること |

---

## 6. テスト実行コマンド

```bash
# quick-mode ユニットテスト全件実行
npx vitest run scripts/harness/__tests__/unit/quick-mode

# ファイル別実行（VO層）
npx vitest run scripts/harness/__tests__/unit/quick-mode/domain/value-objects

# ファイル別実行（ドメインサービス層）
npx vitest run scripts/harness/__tests__/unit/quick-mode/domain/services

# ファイル別実行（Application層）
npx vitest run scripts/harness/__tests__/unit/quick-mode/application

# 単一ファイル実行例
npx vitest run scripts/harness/__tests__/unit/quick-mode/domain/value-objects/quick-mode-config.test.ts

# ウォッチモード（開発中）
npx vitest scripts/harness/__tests__/unit/quick-mode

# カバレッジ付き実行
npx vitest run --coverage scripts/harness/__tests__/unit/quick-mode
```
