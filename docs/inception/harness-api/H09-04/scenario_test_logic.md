# シナリオテストロジック設計: H09-04

> **Unit ID**: harness-api
> **作成日**: 2026-03-20

## 1. テストヘルパー

```typescript
// E2Eテスト用
function run(...args: string[]) { /* 既存run()ヘルパー */ }

// 統合テスト用
import { target, context } from '../../helpers/test-helpers.js';
import { DeriveHarnessStatusUseCase } from '../../../harness-api/application/usecases/derive-harness-status-usecase.js';
import { StatusDerivationService } from '../../../harness-api/domain/services/status-derivation-service.js';
import type { ArtifactScanResult } from '../../../harness-api/domain/value-objects/artifact-scan-result.js';
```

## 2. テストケース疑似コード

### 2.1 E2Eテスト（cli-harness.test.ts 内）

```typescript
describe('harness-api statusコマンド', () => {
  // SC-H09-04-001
  it('harness:status が "Unknown command" にならない', () => {
    // Arrange: なし
    // Act
    const actual = run('harness:status');
    // Assert
    expect(actual.stderr).not.toContain('Unknown command: harness:status');
  });

  // SC-H09-04-002
  it('harness:status が exit 0 または exit 2 のみを返す（exit 1を返さない）', () => {
    // Arrange: なし
    // Act
    const actual = run('harness:status');
    // Assert
    expect(actual.exitCode).not.toBe(1);
    expect([0, 2]).toContain(actual.exitCode);
  });

  // SC-H09-04-006
  it('harness:status の出力がJSON形式である', () => {
    // Arrange: なし
    // Act
    const actual = run('harness:status');
    // Assert
    if (actual.stdout) {
      expect(() => JSON.parse(actual.stdout)).not.toThrow();
      const parsed = JSON.parse(actual.stdout);
      expect(parsed).toHaveProperty('status');
    }
  });

  // SC-H09-04-003
  it('harness:status のレスポンスにlayers[]フィールドが含まれる', () => {
    // Arrange: なし
    // Act
    const actual = run('harness:status');
    // Assert
    if (actual.exitCode === 0 && actual.stdout) {
      const parsed = JSON.parse(actual.stdout);
      expect(parsed.data?.layers).toBeDefined();
    }
  });
});
```

### 2.2 StatusDerivationService ユニットテスト

```typescript
target('StatusDerivationService.derive', () => {
  const service = new StatusDerivationService();

  // SC-H09-04-007
  it('成果物が存在するレイヤーのlastResultがpassになる', () => {
    // Arrange
    const scanResult: ArtifactScanResult = {
      scannedPaths: ['docs/', 'scripts/'],
      foundArtifacts: [
        { artifactType: 'design-doc', present: true, lastModified: '2026-03-20' },
        { artifactType: 'test-file', present: true, lastModified: '2026-03-20' },
      ],
      derivedLayerHealth: [],
    };
    // Act
    const actual = service.derive(scanResult, { preset: 'standard', layers: { L1: { enabled: true }, L2: { enabled: true }, L3: { enabled: true }, L4: { enabled: true } } });
    // Assert
    const l1Health = actual.layers.find(l => l.layerId === 'L1');
    expect(l1Health?.lastResult).toBe('pass');
  });

  // SC-H09-04-008
  it('成果物が存在しないレイヤーのlastResultがunknownになる', () => {
    // Arrange
    const scanResult: ArtifactScanResult = {
      scannedPaths: [],
      foundArtifacts: [],
      derivedLayerHealth: [],
    };
    // Act
    const actual = service.derive(scanResult, { preset: 'standard', layers: { L1: { enabled: true }, L2: { enabled: false }, L3: { enabled: false }, L4: { enabled: false } } });
    // Assert
    const l1Health = actual.layers.find(l => l.layerId === 'L1');
    expect(l1Health?.lastResult).toBe('unknown');
  });
});
```

## 3. テスト実行コマンド

```bash
# ユニットテスト
npx vitest run scripts/harness/__tests__/unit/harness-api/status-derivation-service.test.ts

# 統合テスト
npx vitest run scripts/harness/__tests__/integration/harness-api/derive-harness-status-usecase.test.ts
npx vitest run scripts/harness/__tests__/integration/harness-api/file-system-artifact-scanner-adapter.test.ts

# E2Eテスト
npx vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts
```
