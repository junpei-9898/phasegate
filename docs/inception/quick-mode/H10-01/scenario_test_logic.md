# シナリオテストロジック設計: H10-01

> **Unit ID**: quick-mode
> **作成日**: 2026-03-20

## 1. テストヘルパー

```typescript
// scripts/harness/__tests__/helpers/test-helpers.ts の target/context を使用
import { target, context } from '../../helpers/test-helpers.js';

// 統合テスト用: HarnessConfigQuickModeConfigAdapter
import { HarnessConfigQuickModeConfigAdapter } from '../../../quick-mode/infrastructure/adapters/harness-config-quick-mode-config-adapter.js';

// ユニットテスト用: QuickModeJudgmentEngine
import { QuickModeJudgmentEngine } from '../../../quick-mode/domain/services/quick-mode-judgment-engine.js';
import { ChangedFile } from '../../../quick-mode/domain/value-objects/changed-file.js';
import { QuickModeConfig } from '../../../quick-mode/domain/value-objects/quick-mode-config.js';
```

## 2. テストケース疑似コード

### 2.1 QuickModeJudgmentEngine — 適用可否判定（ユニットテスト）

```typescript
target('QuickModeJudgmentEngine.judge', () => {
  const engine = new QuickModeJudgmentEngine();
  const defaultConfig = QuickModeConfig.create({
    allowedCategories: ['bugfix', 'docs', 'test', 'config'],
    maintainedLayers: ['L1', 'L2-002', 'L2-003', 'L3-001'],
    relaxedGates: ['L2-001', 'L3-002', 'L3-003', 'L3-004', 'L4'],
  });

  // SC-H10-01-001
  it('bugfix/docs/test/configのみの変更でeligible=trueを返す', () => {
    // Arrange
    const changedFiles = [
      ChangedFile.create('src/utils.ts', 'MODIFY'),       // bugfix
      ChangedFile.create('docs/readme.md', 'MODIFY'),     // docs
    ];
    // Act
    const actual = engine.judge(changedFiles, defaultConfig);
    // Assert
    expect(actual.eligible).toBe(true);
    expect(actual.rejectionRule).toBeUndefined();
  });

  // SC-H10-01-002
  it('allowedCategories外（domain）のファイルが混在する場合にMIXED_CHANGESで拒否される', () => {
    // Arrange
    const changedFiles = [
      ChangedFile.create('src/utils.ts', 'MODIFY'),
      ChangedFile.create('scripts/harness/quick-mode/domain/services/engine.ts', 'MODIFY'),
    ];
    // Act
    const actual = engine.judge(changedFiles, defaultConfig);
    // Assert
    expect(actual.eligible).toBe(false);
    expect(actual.rejectionRule).toBe('MIXED_CHANGES');
  });

  // SC-H10-01-003
  it('domain/配下のCREATEファイルがあるとNEW_DOMAINで拒否される', () => {
    // Arrange
    const changedFiles = [
      ChangedFile.create('scripts/harness/quick-mode/domain/value-objects/new-vo.ts', 'CREATE'),
    ];
    // Act
    const actual = engine.judge(changedFiles, defaultConfig);
    // Assert
    expect(actual.eligible).toBe(false);
    expect(actual.rejectionRule).toBe('NEW_DOMAIN');
  });

  // SC-H10-01-004
  it('*port.tsファイルの変更でAPI_CONTRACTで拒否される', () => {
    // Arrange
    const changedFiles = [
      ChangedFile.create('scripts/harness/quick-mode/domain/ports/changed-files-port.ts', 'MODIFY'),
    ];
    // Act
    const actual = engine.judge(changedFiles, defaultConfig);
    // Assert
    expect(actual.eligible).toBe(false);
    expect(actual.rejectionRule).toBe('API_CONTRACT');
  });

  // SC-H10-01-006
  it('空のChangedFile[]でeligible=trueを返す', () => {
    // Arrange
    const changedFiles: readonly ChangedFile[] = [];
    // Act
    const actual = engine.judge(changedFiles, defaultConfig);
    // Assert
    expect(actual.eligible).toBe(true);
  });

  // SC-H10-01-007
  it('MIXED_CHANGESとNEW_DOMAIN両方該当する場合にMIXED_CHANGESが優先される', () => {
    // Arrange
    const changedFiles = [
      ChangedFile.create('src/utils.ts', 'MODIFY'),
      ChangedFile.create('scripts/harness/quick-mode/domain/new-entity.ts', 'CREATE'),
    ];
    // Act
    const actual = engine.judge(changedFiles, defaultConfig);
    // Assert
    expect(actual.rejectionRule).toBe('MIXED_CHANGES');
  });
});
```

### 2.2 HarnessConfigQuickModeConfigAdapter — 設定読み取り（統合テスト）

```typescript
target('HarnessConfigQuickModeConfigAdapter', () => {
  // SC-H10-01-005
  it('quickModeセクションなしのharness.config.jsonでデフォルト設定が返される', () => {
    // Arrange
    const adapter = new HarnessConfigQuickModeConfigAdapter({ configPath: '/path/to/config-without-quickmode.json' });
    // Act
    const actual = adapter.getQuickModeConfig();
    // Assert
    expect(actual.allowedCategories).toEqual(['bugfix', 'docs', 'test', 'config']);
  });
});
```

## 3. テスト実行コマンド

```bash
# ユニットテスト
npx vitest run scripts/harness/__tests__/unit/quick-mode/domain/

# 統合テスト
npx vitest run scripts/harness/__tests__/integration/quick-mode/harness-config-quick-mode-config-adapter.test.ts
```
