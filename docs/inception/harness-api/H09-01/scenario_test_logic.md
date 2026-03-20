# シナリオテストロジック設計: H09-01

> **Unit ID**: harness-api
> **作成日**: 2026-03-20

## 1. テストヘルパー

```typescript
// E2Eテスト用 run() ヘルパー（cli-harness.test.ts既存）
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

// 統合テスト用
import { target, context } from '../../helpers/test-helpers.js';
import { DispatchCommandUseCase } from '../../../harness-api/application/usecases/dispatch-command-usecase.js';
import type { PhaseGateQueryPort } from '../../../harness-api/domain/ports/phase-gate-query-port.js';
```

## 2. テストケース疑似コード

### 2.1 E2Eテスト（cli-harness.test.ts 内）

```typescript
describe('harness-api check-ready / check-phase コマンド群', () => {
  // SC-H09-01-001
  it('harness:check-ready が "Unknown command" にならない', () => {
    // Arrange: なし
    // Act
    const actual = run('harness:check-ready');
    // Assert
    expect(actual.stderr).not.toContain('Unknown command: harness:check-ready');
  });

  // SC-H09-01-004
  it('harness:check-phase が "Unknown command" にならない', () => {
    // Arrange: なし
    // Act
    const actual = run('harness:check-phase', 'config-foundation');
    // Assert
    expect(actual.stderr).not.toContain('Unknown command: harness:check-phase');
  });

  // SC-H09-01-006
  it('harness:check-phase に存在しないUnit名を指定するとexit 1が返される', () => {
    // Arrange: なし
    // Act
    const actual = run('harness:check-phase', 'nonexistent-unit');
    // Assert
    expect(actual.exitCode).toBe(1);
  });
});
```

### 2.2 DispatchCommandUseCase 統合テスト

```typescript
target('DispatchCommandUseCase.execute', () => {
  // SC-H09-01-002
  describe('check-readyコマンドが全ストーリー通過状態を返すこと', () => {
    context('PhaseGateQueryPortが3件全通過のPhaseGateStoryResult[]を返す場合', () => {
      it('response.status=pass・exitCode=0・data.allPassed=trueが返される', async () => {
        // Arrange
        const ports = createMockPorts();
        ports.phaseGateQueryPort.queryAllStories.mockResolvedValue([
          { storyId: 'H09-01', passed: true, missingPhases: [] },
          { storyId: 'H09-02', passed: true, missingPhases: [] },
          { storyId: 'H09-03', passed: true, missingPhases: [] },
        ]);
        const useCase = new DispatchCommandUseCase(ports);
        // Act
        const actual = await useCase.execute({ commandName: 'harness:check-ready', args: [], flags: {} });
        // Assert
        expect(actual.response.status).toBe('pass');
        expect(actual.exitCode).toBe(0);
        expect(actual.response.data?.allPassed).toBe(true);
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
