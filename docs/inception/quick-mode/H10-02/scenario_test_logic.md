# シナリオテストロジック設計: H10-02

> **Unit ID**: quick-mode
> **作成日**: 2026-03-20

## 1. テストヘルパー

```typescript
import { target, context } from '../../helpers/test-helpers.js';
import { ValidatorRelaxationService } from '../../../quick-mode/domain/services/validator-relaxation-service.js';
import { QuickModeConfig } from '../../../quick-mode/domain/value-objects/quick-mode-config.js';
import { BuildRelaxationProfileUseCase } from '../../../quick-mode/application/usecases/build-relaxation-profile-usecase.js';
import { ValidatorSystemValidatorIdRegistryAdapter } from '../../../quick-mode/infrastructure/adapters/validator-system-validator-id-registry-adapter.js';
```

## 2. テストケース疑似コード

### 2.1 ValidatorRelaxationService — プロファイル生成（ユニットテスト）

```typescript
target('ValidatorRelaxationService.build', () => {
  const service = new ValidatorRelaxationService();
  const defaultConfig = QuickModeConfig.create({
    allowedCategories: ['bugfix', 'docs', 'test', 'config'],
    maintainedLayers: ['L1', 'L2-002', 'L2-003', 'L3-001'],
    relaxedGates: ['L2-001', 'L3-002', 'L3-003', 'L3-004', 'L4'],
  });
  const allValidatorIds = [
    'L1-001', 'L1-002', 'L1-003', 'L1-004', 'L1-005', 'L1-006', 'L1-007', 'L1-008',
    'L2-001', 'L2-002', 'L2-003',
    'L3-001', 'L3-002', 'L3-003', 'L3-004',
    'L4-001', 'L4-002', 'L4-003',
  ];

  // SC-H10-02-001
  it('デフォルト設定でValidatorRelaxationProfileが生成される', () => {
    // Arrange: 上記 defaultConfig, allValidatorIds
    // Act
    const actual = service.build(defaultConfig, allValidatorIds);
    // Assert
    expect(actual).toBeDefined();
  });

  // SC-H10-02-002
  it('L1は全維持（l1.all=true）', () => {
    // Act
    const actual = service.build(defaultConfig, allValidatorIds);
    // Assert
    expect(actual.l1.all).toBe(true);
  });

  // SC-H10-02-003, SC-H10-02-004
  it('デフォルト設定でL2-001がスキップされL2-002,L2-003が維持される', () => {
    // Act
    const actual = service.build(defaultConfig, allValidatorIds);
    // Assert
    expect(actual.l2.skipped).toContain('L2-001');
    expect(actual.l2.maintained).toContain('L2-002');
    expect(actual.l2.maintained).toContain('L2-003');
  });

  // SC-H10-02-005
  it('デフォルト設定でL3-001のみ維持される', () => {
    // Act
    const actual = service.build(defaultConfig, allValidatorIds);
    // Assert
    expect(actual.l3.maintained).toEqual(['L3-001']);
    expect(actual.l3.skipped).toContain('L3-002');
  });

  // SC-H10-02-007
  it('levelDependencyRelaxedは常にfalse', () => {
    // Act
    const actual = service.build(defaultConfig, allValidatorIds);
    // Assert
    expect(actual.levelDependencyRelaxed).toBe(false);
  });

  // SC-H10-02-008
  it('phaseExecution.twoPhaseRequiredは常にfalse', () => {
    // Act
    const actual = service.build(defaultConfig, allValidatorIds);
    // Assert
    expect(actual.phaseExecution.twoPhaseRequired).toBe(false);
  });
});
```

### 2.2 BuildRelaxationProfileUseCase — eligible=false時のエラー（ユニットテスト）

```typescript
target('BuildRelaxationProfileUseCase.execute', () => {
  // SC-H10-02-009
  context('eligibility.eligible=falseの場合', () => {
    it('QuickModeNotEligibleErrorが投げられる', async () => {
      // Arrange
      const useCase = new BuildRelaxationProfileUseCase({ /* mock ports */ });
      const eligibility = { eligible: false, reason: 'MIXED_CHANGES', rejectionRule: 'MIXED_CHANGES' };
      // Act & Assert
      await expect(useCase.execute({ eligibility })).rejects.toThrow('QuickModeNotEligibleError');
    });
  });
});
```

### 2.3 ValidatorSystemValidatorIdRegistryAdapter（統合テスト）

```typescript
target('ValidatorSystemValidatorIdRegistryAdapter', () => {
  // SC-H10-02-010
  it('全ValidatorId（L1-001〜L4-003）が返される', () => {
    // Arrange
    const adapter = new ValidatorSystemValidatorIdRegistryAdapter();
    // Act
    const actual = adapter.getAllValidatorIds();
    // Assert
    expect(actual).toContain('L1-001');
    expect(actual).toContain('L4-003');
    expect(actual.length).toBeGreaterThanOrEqual(15);
  });
});
```

## 3. テスト実行コマンド

```bash
# ユニットテスト
npx vitest run scripts/harness/__tests__/unit/quick-mode/domain/services/validator-relaxation-service.test.ts

# 統合テスト
npx vitest run scripts/harness/__tests__/integration/quick-mode/validator-system-validator-id-registry-adapter.test.ts
```
