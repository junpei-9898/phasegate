# シナリオテストロジック設計: H09-02

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
describe('harness-api ci-checkコマンド', () => {
  // SC-H09-02-001
  it('harness:ci-check が "Unknown command" にならない', () => {
    // Arrange: なし
    // Act
    const actual = run('harness:ci-check');
    // Assert
    expect(actual.stderr).not.toContain('Unknown command: harness:ci-check');
  });

  // SC-H09-02-002 / SC-H09-02-003
  it('harness:ci-check がexit 0またはexit 1を返す', () => {
    // Arrange: なし
    // Act
    const actual = run('harness:ci-check');
    // Assert
    expect([0, 1]).toContain(actual.exitCode);
  });
});
```

### 2.2 DispatchCommandUseCase 統合テスト（ci-check ディスパッチ）

```typescript
target('DispatchCommandUseCase.execute', () => {
  // SC-H09-02-002
  describe('ci-checkコマンドが全バリデータ通過でstatus=passを返すこと', () => {
    context('ValidatorExecutionPortが全通過のValidatorCheckItem[]を返す場合', () => {
      it('response.status=pass・exitCode=0・data.allPassed=trueが返される', async () => {
        // Arrange
        const ports = createMockPorts();
        ports.validatorExecutionPort.runL3Validators.mockResolvedValue([
          { validatorId: 'L3-001', passed: true, errors: [] },
          { validatorId: 'L3-002', passed: true, errors: [] },
          { validatorId: 'L3-003', passed: true, errors: [] },
          { validatorId: 'L3-004', passed: true, errors: [] },
        ]);
        const useCase = new DispatchCommandUseCase(ports);
        // Act
        const actual = await useCase.execute({ commandName: 'harness:ci-check', args: [], flags: {} });
        // Assert
        expect(actual.response.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
        expect(actual.response.data?.allPassed).toBe(true);
      });
    });
  });

  // SC-H09-02-003
  describe('ci-checkコマンドが1つのバリデータ失敗でstatus=failを返すこと', () => {
    context('ValidatorExecutionPortがL3-001 failのValidatorCheckItem[]を返す場合', () => {
      it('response.status=fail・exitCode=1・data.allPassed=falseが返される', async () => {
        // Arrange
        const ports = createMockPorts();
        ports.validatorExecutionPort.runL3Validators.mockResolvedValue([
          { validatorId: 'L3-001', passed: false, errors: [{ code: 'SEC-001', message: 'security violation', level: 'error', unit: 'test' }] },
        ]);
        const useCase = new DispatchCommandUseCase(ports);
        // Act
        const actual = await useCase.execute({ commandName: 'harness:ci-check', args: [], flags: {} });
        // Assert
        expect(actual.response.status).toBe('fail');
        expect(actual.exitCode).toBe(1);
        expect(actual.response.data?.allPassed).toBe(false);
      });
    });
  });
});
```

## 3. テスト実行コマンド

```bash
# 統合テスト
npx vitest run scripts/harness/__tests__/integration/harness-api/dispatch-command-usecase.test.ts
npx vitest run scripts/harness/__tests__/integration/harness-api/validator-system-execution-adapter.test.ts

# E2Eテスト
npx vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts
```
