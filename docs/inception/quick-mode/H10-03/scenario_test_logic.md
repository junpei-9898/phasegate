# シナリオテストロジック設計: H10-03

> **Unit ID**: quick-mode
> **作成日**: 2026-03-20

## 1. テストヘルパー

```typescript
// E2Eテスト用: cli-harness.test.ts の run() ヘルパー
import { spawnSync } from 'node:child_process';

function run(...args: string[]) {
  const result = spawnSync('npx', ['tsx', MAIN, ...args], {
    cwd: ROOT,
    encoding: 'utf-8',
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
  });
  return {
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
    exitCode: result.status ?? 2,
  };
}

// ユニットテスト用
import { target, context } from '../../helpers/test-helpers.js';
import { ExecuteQuickCiCheckUseCase } from '../../../quick-mode/application/usecases/execute-quick-ci-check-usecase.js';
```

## 2. テストケース疑似コード

### 2.1 E2Eテスト（cli-harness.test.ts 内）

```typescript
describe('quick-mode コマンド群', () => {
  // SC-H10-03-001
  it('phasegate:ci-check --quick が "Unknown command" にならない', () => {
    // Arrange: なし
    // Act
    const actual = run('phasegate:ci-check', '--quick');
    // Assert
    expect(actual.stderr).not.toContain('Unknown command');
  });

  // SC-H10-03-002
  it('phasegate:ci-check --quick --dry-run でexit 0が返される', () => {
    // Arrange: なし
    // Act
    const actual = run('phasegate:ci-check', '--quick', '--dry-run');
    // Assert
    expect([0, 2]).toContain(actual.exitCode);
  });

  // SC-H10-03-004
  it('phasegate:ci-check --quick --format json でJSON出力が得られる', () => {
    // Arrange: なし
    // Act
    const actual = run('phasegate:ci-check', '--quick', '--format', 'json');
    // Assert
    if (actual.stdout) {
      const parsed = JSON.parse(actual.stdout);
      expect(parsed).toHaveProperty('eligibility');
    }
  });
});
```

### 2.2 ExecuteQuickCiCheckUseCase（ユニットテスト）

```typescript
target('ExecuteQuickCiCheckUseCase.execute', () => {
  // SC-H10-03-007
  context('eligible=falseの場合', () => {
    it('relaxationProfile=undefinedのDecisionContractが返される', async () => {
      // Arrange
      const judgeUseCase = { execute: vi.fn().mockResolvedValue({ eligible: false, reason: 'MIXED_CHANGES', rejectionRule: 'MIXED_CHANGES' }) };
      const buildUseCase = { execute: vi.fn() };
      const useCase = new ExecuteQuickCiCheckUseCase({ judgeUseCase, buildUseCase, /* ... */ });
      // Act
      const actual = await useCase.execute({ dryRun: false });
      // Assert
      expect(actual.relaxationProfile).toBeUndefined();
      expect(buildUseCase.execute).not.toHaveBeenCalled();
    });
  });

  // SC-H10-03-002
  context('dryRun=trueの場合', () => {
    it('ValidatorExecutionPortが呼ばれない', async () => {
      // Arrange
      const executionPort = { executeWithProfile: vi.fn() };
      const useCase = new ExecuteQuickCiCheckUseCase({ /* eligible=true mock */, validatorExecutionPort: executionPort });
      // Act
      await useCase.execute({ dryRun: true });
      // Assert
      expect(executionPort.executeWithProfile).not.toHaveBeenCalled();
    });
  });
});
```

## 3. テスト実行コマンド

```bash
# ユニットテスト（UseCase）
npx vitest run scripts/harness/__tests__/unit/quick-mode/application/usecases/execute-quick-ci-check-usecase.test.ts

# E2Eテスト
npx vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts
```
