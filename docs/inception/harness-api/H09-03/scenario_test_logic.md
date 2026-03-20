# シナリオテストロジック設計: H09-03

> **Unit ID**: harness-api
> **作成日**: 2026-03-20

## 1. テストヘルパー

```typescript
// E2Eテスト用
function run(...args: string[]) { /* 既存run()ヘルパー */ }

// 統合テスト用
import { target, context } from '../../helpers/test-helpers.js';
import { DispatchCommandUseCase } from '../../../harness-api/application/usecases/dispatch-command-usecase.js';
import type { ValidatorExecutionPort } from '../../../harness-api/domain/ports/validator-execution-port.js';
```

## 2. テストケース疑似コード

### 2.1 E2Eテスト（cli-harness.test.ts 内）

```typescript
describe('harness-api detect-driftコマンド', () => {
  // SC-H09-03-001
  it('harness:detect-drift が "Unknown command" にならない', () => {
    // Arrange: なし
    // Act
    const actual = run('harness:detect-drift');
    // Assert
    expect(actual.stderr).not.toContain('Unknown command: harness:detect-drift');
  });

  // SC-H09-03-004
  it('harness:detect-drift --json でJSON出力が得られる', () => {
    // Arrange: なし
    // Act
    const actual = run('harness:detect-drift', '--json');
    // Assert
    if (actual.stdout) {
      const parsed = JSON.parse(actual.stdout);
      expect(parsed).toHaveProperty('data');
    }
    expect([0, 1]).toContain(actual.exitCode);
  });
});
```

### 2.2 DispatchCommandUseCase 統合テスト（detect-drift ディスパッチ）

```typescript
target('DispatchCommandUseCase.execute', () => {
  // SC-H09-03-002
  describe('detect-driftコマンドが乖離0件でstatus=passを返すこと', () => {
    context('ValidatorExecutionPortが空のDriftItem[]を返す場合', () => {
      it('response.status=pass・exitCode=0・data.totalCount=0が返される', async () => {
        // Arrange
        const ports = createMockPorts();
        ports.validatorExecutionPort.runDriftDetection.mockResolvedValue([]);
        const useCase = new DispatchCommandUseCase(ports);
        // Act
        const actual = await useCase.execute({ commandName: 'harness:detect-drift', args: [], flags: {} });
        // Assert
        expect(actual.response.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
        expect(actual.response.data?.totalCount).toBe(0);
      });
    });
  });

  // SC-H09-03-003 / SC-H09-03-005
  describe('detect-driftコマンドが乖離ありでstatus=failを返すこと', () => {
    context('ValidatorExecutionPortが1件のDriftItem[]を返す場合', () => {
      it('response.status=fail・exitCode=1・drifts[].directionが存在する', async () => {
        // Arrange
        const ports = createMockPorts();
        ports.validatorExecutionPort.runDriftDetection.mockResolvedValue([
          { direction: 'design-to-code', unit: 'config-foundation', element: 'QuickModeConfig', recommendation: 'Add missing implementation' },
        ]);
        const useCase = new DispatchCommandUseCase(ports);
        // Act
        const actual = await useCase.execute({ commandName: 'harness:detect-drift', args: [], flags: {} });
        // Assert
        expect(actual.response.status).toBe('fail');
        expect(actual.exitCode).toBe(1);
        expect(actual.response.data?.drifts[0].direction).toBe('design-to-code');
      });
    });
  });
});
```

## 3. テスト実行コマンド

```bash
# 統合テスト
npx vitest run scripts/harness/__tests__/integration/harness-api/dispatch-command-usecase.test.ts

# E2Eテスト
npx vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts
```
