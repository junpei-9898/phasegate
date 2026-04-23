# ユニットテストロジック設計: fuse-hooks-engine

@story-id HF1-01
@story-id HF1-02
@story-id HF1-03
@story-id HF1-04
@story-id HF1-05
> **Unit ID**: fuse-hooks-engine
> **作成日**: 2026-03-20
> **参照**: unit_test_design.md, domain_model.md

---

## 1. テストファイル構成

| ファイルパス | 対象 | ケース数 |
|-------------|------|---------|
| `scripts/harness/__tests__/unit/fuse-hooks-engine/value-objects/hook-type.test.ts` | HookType VO | 13 |
| `scripts/harness/__tests__/unit/fuse-hooks-engine/value-objects/file-pattern.test.ts` | FilePattern VO | 10 |
| `scripts/harness/__tests__/unit/fuse-hooks-engine/value-objects/hook-action.test.ts` | HookAction VO | 8 |
| `scripts/harness/__tests__/unit/fuse-hooks-engine/value-objects/magic-file.test.ts` | MagicFile VO | 6 |
| `scripts/harness/__tests__/unit/fuse-hooks-engine/value-objects/protected-resource-list.test.ts` | ProtectedResourceList VO | 7 |
| `scripts/harness/__tests__/unit/fuse-hooks-engine/value-objects/destructive-command-list.test.ts` | DestructiveCommandList VO | 7 |
| `scripts/harness/__tests__/unit/fuse-hooks-engine/value-objects/hook-yaml-config.test.ts` | HookYamlConfig VO | 7 |
| `scripts/harness/__tests__/unit/fuse-hooks-engine/aggregates/hook-definition.test.ts` | HookDefinition集約ルート | 11 |
| `scripts/harness/__tests__/unit/fuse-hooks-engine/entities/fuse-mount.test.ts` | FUSEMountエンティティ | 8 |
| `scripts/harness/__tests__/unit/fuse-hooks-engine/entities/completion-gate.test.ts` | CompletionGateエンティティ | 11 |
| `scripts/harness/__tests__/unit/fuse-hooks-engine/services/hook-evaluation-service.test.ts` | HookEvaluationServiceドメインサービス | 7 |
| **合計** | | **95** |

---

## 2. 共通ヘルパー・ファクトリ

```typescript
// scripts/harness/__tests__/unit/fuse-hooks-engine/factories.ts

import { target, context } from '../../../helpers/test-helpers.js';
import { HookType } from '../../../../fuse-hooks-engine/domain/value-objects/hook-type.js';
import { FilePattern } from '../../../../fuse-hooks-engine/domain/value-objects/file-pattern.js';
import { HookAction } from '../../../../fuse-hooks-engine/domain/value-objects/hook-action.js';
import { MagicFile } from '../../../../fuse-hooks-engine/domain/value-objects/magic-file.js';
import { ProtectedResourceList } from '../../../../fuse-hooks-engine/domain/value-objects/protected-resource-list.js';
import { DestructiveCommandList } from '../../../../fuse-hooks-engine/domain/value-objects/destructive-command-list.js';
import { HookDefinition } from '../../../../fuse-hooks-engine/domain/aggregates/hook-definition.js';
import { FUSEMount } from '../../../../fuse-hooks-engine/domain/entities/fuse-mount.js';
import { CompletionGate } from '../../../../fuse-hooks-engine/domain/entities/completion-gate.js';

// HookType ファクトリ
export const createHookType = (value = 'pre-write') =>
  HookType.create(value)._unsafeUnwrap();

// FilePattern ファクトリ
export const createFilePattern = (overrides: Partial<{
  includePatterns: string[];
  excludePatterns: string[];
}> = {}) =>
  FilePattern.create(
    overrides.includePatterns ?? ['**/*.ts'],
    overrides.excludePatterns ?? []
  )._unsafeUnwrap();

// HookAction ファクトリ（block-write）
export const createBlockWriteAction = (overrides: Partial<{
  reason: string;
  notifyUser: boolean;
}> = {}) =>
  HookAction.create('block-write', {
    reason: overrides.reason ?? 'Protected file',
    notifyUser: overrides.notifyUser ?? true,
  })._unsafeUnwrap();

// HookAction ファクトリ（run-shell）
export const createRunShellAction = (overrides: Partial<{
  script: string;
  timeout: number;
  failOnNonZero: boolean;
}> = {}) =>
  HookAction.create('run-shell', {
    script: overrides.script ?? 'echo hook executed',
    timeout: overrides.timeout ?? 5000,
    failOnNonZero: overrides.failOnNonZero ?? true,
  })._unsafeUnwrap();

// HookAction ファクトリ（trigger-completion-check）
export const createTriggerCompletionAction = (gateId = 'story-gate') =>
  HookAction.create('trigger-completion-check', { gateId })._unsafeUnwrap();

// MagicFile ファクトリ
export const createMagicFile = (overrides: Partial<{
  filePath: string;
  requiredFields: string[];
}> = {}) =>
  MagicFile.create(
    overrides.filePath ?? '.harness/done/HF1-01.done',
    overrides.requiredFields ?? []
  )._unsafeUnwrap();

// HookDefinition ファクトリ（pre-write + block-write）
export const createPreWriteHookDefinition = (overrides: Partial<{
  includePatterns: string[];
}> = {}) => {
  const hookType = createHookType('pre-write');
  const filePattern = createFilePattern({ includePatterns: overrides.includePatterns ?? ['**/*.ts'] });
  const hookAction = createBlockWriteAction();
  return HookDefinition.create(hookType, filePattern, hookAction)._unsafeUnwrap();
};

// HookDefinition ファクトリ（on-complete + trigger-completion-check）
export const createOnCompleteHookDefinition = () => {
  const hookType = createHookType('on-complete');
  const filePattern = createFilePattern({ includePatterns: ['.harness/done/*.done'] });
  const hookAction = createTriggerCompletionAction();
  return HookDefinition.create(hookType, filePattern, hookAction)._unsafeUnwrap();
};

// FUSEMount ファクトリ
export const createFuseMount = (mountPath = '/project/root') =>
  FUSEMount.create(mountPath);

// CompletionGate ファクトリ
export const createCompletionGate = (storyId = 'HF1-05') => {
  const magicFile = createMagicFile();
  return CompletionGate.create(storyId, magicFile);
};
```

---

## 3. 値オブジェクトテスト詳細ロジック

### 3.1 HookType

```typescript
// scripts/harness/__tests__/unit/fuse-hooks-engine/value-objects/hook-type.test.ts

import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { HookType } from '../../../../fuse-hooks-engine/domain/value-objects/hook-type.js';

target('HookType', () => {
  describe('生成テスト', () => {
    // UT-HF-001
    it('pre-writeで生成できること', () => {
      // Arrange / Act
      const actual = HookType.create('pre-write');
      // Assert
      expect(actual.isOk()).toBe(true);
      expect(actual._unsafeUnwrap().value).toBe('pre-write');
    });

    // UT-HF-002〜004（同パターン省略）

    // UT-HF-005
    it('不正な値でResult.failが返ること', () => {
      // Arrange / Act
      const actual = HookType.create('invalid');
      // Assert
      expect(actual.isErr()).toBe(true);
      expect(actual._unsafeUnwrapErr().code).toBe('HOOK_INVALID_TYPE');
    });

    // UT-HF-006
    it('空文字でResult.failが返ること', () => {
      // Arrange / Act
      const actual = HookType.create('');
      // Assert
      expect(actual.isErr()).toBe(true);
    });
  });

  describe('matchesEventテスト', () => {
    // UT-HF-007
    context('hookType=pre-writeのとき', () => {
      it('writeイベントにマッチすること', () => {
        // Arrange
        const hookType = HookType.create('pre-write')._unsafeUnwrap();
        // Act
        const actual = hookType.matchesEvent('write');
        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-HF-008
    context('hookType=pre-writeのとき', () => {
      it('readイベントにマッチしないこと', () => {
        // Arrange
        const hookType = HookType.create('pre-write')._unsafeUnwrap();
        // Act
        const actual = hookType.matchesEvent('read');
        // Assert
        expect(actual).toBe(false);
      });
    });

    // UT-HF-009
    context('hookType=pre-readのとき', () => {
      it('readイベントにマッチすること', () => {
        // Arrange
        const hookType = HookType.create('pre-read')._unsafeUnwrap();
        // Act
        const actual = hookType.matchesEvent('read');
        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-HF-010, UT-HF-011（同パターン省略）
  });

  describe('等値性テスト', () => {
    // UT-HF-012
    it('同一valueのHookTypeがequals=trueを返すこと', () => {
      // Arrange
      const a = HookType.create('pre-write')._unsafeUnwrap();
      const b = HookType.create('pre-write')._unsafeUnwrap();
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    // UT-HF-013
    it('異なるvalueのHookTypeがequals=falseを返すこと', () => {
      // Arrange
      const a = HookType.create('pre-write')._unsafeUnwrap();
      const b = HookType.create('pre-read')._unsafeUnwrap();
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

---

### 3.2 FilePattern

```typescript
// scripts/harness/__tests__/unit/fuse-hooks-engine/value-objects/file-pattern.test.ts

import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { FilePattern } from '../../../../fuse-hooks-engine/domain/value-objects/file-pattern.js';

target('FilePattern', () => {
  describe('生成テスト', () => {
    // UT-HF-014
    it('有効なincludePatternsで生成できること', () => {
      // Arrange / Act
      const actual = FilePattern.create(['**/*.ts']);
      // Assert
      expect(actual.isOk()).toBe(true);
      expect(actual._unsafeUnwrap().includePatterns).toEqual(['**/*.ts']);
    });

    // UT-HF-016
    it('includePatternsが空配列でResult.failが返ること', () => {
      // Arrange / Act
      const actual = FilePattern.create([]);
      // Assert
      expect(actual.isErr()).toBe(true);
      expect(actual._unsafeUnwrapErr().code).toBe('HOOK_EMPTY_INCLUDE_PATTERN');
    });

    // UT-HF-017
    it('不正なglob形式でResult.failが返ること', () => {
      // Arrange / Act
      const actual = FilePattern.create(['[invalid']);
      // Assert
      expect(actual.isErr()).toBe(true);
    });
  });

  describe('testメソッドテスト', () => {
    // UT-HF-018
    context('includePatterns=["**/*.md"]のとき', () => {
      it('docs/README.mdがマッチすること', () => {
        // Arrange
        const pattern = FilePattern.create(['**/*.md'])._unsafeUnwrap();
        // Act
        const actual = pattern.test('docs/README.md');
        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-HF-019
    context('includePatterns=["**/*.ts"]のとき', () => {
      it('src/index.jsがマッチしないこと', () => {
        // Arrange
        const pattern = FilePattern.create(['**/*.ts'])._unsafeUnwrap();
        // Act
        const actual = pattern.test('src/index.js');
        // Assert
        expect(actual).toBe(false);
      });
    });

    // UT-HF-020
    context('excludePatterns=["**/*.spec.ts"]が設定されているとき', () => {
      it('foo.spec.tsがexcludeにマッチしてfalseを返すこと', () => {
        // Arrange
        const pattern = FilePattern.create(['**/*.ts'], ['**/*.spec.ts'])._unsafeUnwrap();
        // Act
        const actual = pattern.test('foo.spec.ts');
        // Assert
        expect(actual).toBe(false);
      });
    });

    // UT-HF-021
    context('includeにマッチしexcludeにマッチしないとき', () => {
      it('src/index.tsがtrueを返すこと', () => {
        // Arrange
        const pattern = FilePattern.create(['**/*.ts'], ['**/*.spec.ts'])._unsafeUnwrap();
        // Act
        const actual = pattern.test('src/index.ts');
        // Assert
        expect(actual).toBe(true);
      });
    });
  });

  // 等値性テスト UT-HF-022, UT-HF-023（省略パターン同様）
});
```

---

### 3.3 DestructiveCommandList（重要度高のため詳細記載）

```typescript
// scripts/harness/__tests__/unit/fuse-hooks-engine/value-objects/destructive-command-list.test.ts

import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { DestructiveCommandList } from '../../../../fuse-hooks-engine/domain/value-objects/destructive-command-list.js';

target('DestructiveCommandList', () => {
  describe('生成テスト', () => {
    // UT-HF-045
    it('有効なコマンドリストで生成できること', () => {
      // Arrange / Act
      const actual = DestructiveCommandList.create([
        { command: 'rm', dangerousOptions: ['-rf', '-fr'] },
      ]);
      // Assert
      expect(actual.isOk()).toBe(true);
      expect(actual._unsafeUnwrap().commands).toHaveLength(1);
    });

    // UT-HF-046
    it('空のコマンドリストで生成できること', () => {
      // Arrange / Act
      const actual = DestructiveCommandList.create([]);
      // Assert
      expect(actual.isOk()).toBe(true);
    });

    // UT-HF-047
    it('コマンド名が空文字でResult.failが返ること（INV-13）', () => {
      // Arrange / Act
      const actual = DestructiveCommandList.create([
        { command: '', dangerousOptions: [] },
      ]);
      // Assert
      expect(actual.isErr()).toBe(true);
    });
  });

  describe('isDestructiveメソッドテスト', () => {
    // UT-HF-048
    context('rm -rf が危険コマンドとして登録されているとき', () => {
      it('"rm -rf /tmp/foo" が破壊的コマンドと判定されること', () => {
        // Arrange
        const list = DestructiveCommandList.create([
          { command: 'rm', dangerousOptions: ['-rf'] },
        ])._unsafeUnwrap();
        // Act
        const actual = list.isDestructive('rm -rf /tmp/foo');
        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-HF-049
    context('rm -rf が危険コマンドとして登録されているとき', () => {
      it('"rm -i /tmp/foo" が安全と判定されること', () => {
        // Arrange
        const list = DestructiveCommandList.create([
          { command: 'rm', dangerousOptions: ['-rf'] },
        ])._unsafeUnwrap();
        // Act
        const actual = list.isDestructive('rm -i /tmp/foo');
        // Assert
        expect(actual).toBe(false);
      });
    });

    // UT-HF-050
    context('"git reset --hard" が危険コマンドとして登録されているとき', () => {
      it('"git reset --hard HEAD" が破壊的コマンドと判定されること', () => {
        // Arrange
        const list = DestructiveCommandList.create([
          { command: 'git', dangerousOptions: ['reset --hard'] },
        ])._unsafeUnwrap();
        // Act
        const actual = list.isDestructive('git reset --hard HEAD');
        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-HF-051
    context('空のコマンドリストのとき', () => {
      it('"rm -rf /tmp" が安全と判定されること', () => {
        // Arrange
        const list = DestructiveCommandList.create([])._unsafeUnwrap();
        // Act
        const actual = list.isDestructive('rm -rf /tmp');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
```

---

## 4. 集約ルート・エンティティテスト詳細ロジック

### 4.1 HookDefinition（INV-4/INV-5の詳細）

```typescript
// scripts/harness/__tests__/unit/fuse-hooks-engine/aggregates/hook-definition.test.ts

import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { HookDefinition } from '../../../../fuse-hooks-engine/domain/aggregates/hook-definition.js';
import { HookType } from '../../../../fuse-hooks-engine/domain/value-objects/hook-type.js';
import { FilePattern } from '../../../../fuse-hooks-engine/domain/value-objects/file-pattern.js';
import { HookAction } from '../../../../fuse-hooks-engine/domain/value-objects/hook-action.js';
import { createPreWriteHookDefinition, createFilePattern, createHookType, createBlockWriteAction, createRunShellAction, createTriggerCompletionAction } from '../factories.js';

target('HookDefinition', () => {
  describe('生成テスト', () => {
    // UT-HF-059
    it('pre-write + block-writeで正常に生成されること', () => {
      // Arrange
      const hookType = HookType.create('pre-write')._unsafeUnwrap();
      const filePattern = FilePattern.create(['**/*.ts'])._unsafeUnwrap();
      const hookAction = HookAction.create('block-write', { reason: 'Protected', notifyUser: true })._unsafeUnwrap();
      // Act
      const actual = HookDefinition.create(hookType, filePattern, hookAction);
      // Assert
      expect(actual.isOk()).toBe(true);
      expect(actual._unsafeUnwrap().hookId).toMatch(/^[0-9a-f-]{36}$/); // UUID形式
    });

    // UT-HF-063: INV-4違反（pre-read + block-write）
    context('hookType=pre-readでactionType=block-writeのとき', () => {
      it('INV-4違反でResult.failが返ること', () => {
        // Arrange
        const hookType = HookType.create('pre-read')._unsafeUnwrap();
        const filePattern = FilePattern.create(['**/*.ts'])._unsafeUnwrap();
        const hookAction = HookAction.create('block-write', { reason: 'Invalid', notifyUser: false })._unsafeUnwrap();
        // Act
        const actual = HookDefinition.create(hookType, filePattern, hookAction);
        // Assert
        expect(actual.isErr()).toBe(true);
        expect(actual._unsafeUnwrapErr()[0].code).toBe('HOOK_ACTION_TYPE_MISMATCH');
      });
    });

    // UT-HF-064: INV-5違反（on-complete + run-shell）
    context('hookType=on-completeでactionType=run-shellのとき', () => {
      it('INV-5違反でResult.failが返ること', () => {
        // Arrange
        const hookType = HookType.create('on-complete')._unsafeUnwrap();
        const filePattern = FilePattern.create(['.harness/done/*.done'])._unsafeUnwrap();
        const hookAction = HookAction.create('run-shell', { script: 'echo done', timeout: 3000, failOnNonZero: true })._unsafeUnwrap();
        // Act
        const actual = HookDefinition.create(hookType, filePattern, hookAction);
        // Assert
        expect(actual.isErr()).toBe(true);
        expect(actual._unsafeUnwrapErr()[0].code).toBe('HOOK_ACTION_TYPE_MISMATCH');
      });
    });
  });

  describe('matchesメソッドテスト', () => {
    // UT-HF-065
    context('pre-writeフック(**.ts)のとき', () => {
      it('src/index.tsのwriteイベントにマッチすること', () => {
        // Arrange
        const hookDef = createPreWriteHookDefinition({ includePatterns: ['**/*.ts'] });
        // Act
        const actual = hookDef.matches('src/index.ts', 'write');
        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-HF-066
    context('pre-writeフック(**.ts)のとき', () => {
      it('docs/README.mdのwriteイベントにマッチしないこと', () => {
        // Arrange
        const hookDef = createPreWriteHookDefinition({ includePatterns: ['**/*.ts'] });
        // Act
        const actual = hookDef.matches('docs/README.md', 'write');
        // Assert
        expect(actual).toBe(false);
      });
    });

    // UT-HF-067
    context('pre-writeフック(**.ts)のとき', () => {
      it('src/index.tsのreadイベントにマッチしないこと（イベント種別不一致）', () => {
        // Arrange
        const hookDef = createPreWriteHookDefinition({ includePatterns: ['**/*.ts'] });
        // Act
        const actual = hookDef.matches('src/index.ts', 'read');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
```

---

### 4.2 CompletionGate（状態遷移の詳細）

```typescript
// scripts/harness/__tests__/unit/fuse-hooks-engine/entities/completion-gate.test.ts

import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { CompletionGate } from '../../../../fuse-hooks-engine/domain/entities/completion-gate.js';
import { MagicFile } from '../../../../fuse-hooks-engine/domain/value-objects/magic-file.js';
import { createMagicFile, createCompletionGate } from '../factories.js';

target('CompletionGate', () => {
  describe('生成テスト', () => {
    // UT-HF-078
    it('初期状態がpending・checkedAt=null・failureReason=nullで生成されること', () => {
      // Arrange / Act
      const actual = createCompletionGate('HF1-05');
      // Assert
      expect(actual.status).toBe('pending');
      expect(actual.checkedAt).toBeNull();
      expect(actual.failureReason).toBeNull();
    });
  });

  describe('状態遷移テスト', () => {
    // UT-HF-079
    context('pending状態のとき', () => {
      it('startCheck()でstatus=checkingに遷移すること', () => {
        // Arrange
        const gate = createCompletionGate();
        // Act
        gate.startCheck();
        // Assert
        expect(gate.status).toBe('checking');
      });
    });

    // UT-HF-080
    context('checking状態のとき', () => {
      it('passed()でstatus=passed・checkedAtが非nullになること（INV-8）', () => {
        // Arrange
        const gate = createCompletionGate();
        gate.startCheck();
        // Act
        gate.passed();
        // Assert
        expect(gate.status).toBe('passed');
        expect(gate.checkedAt).not.toBeNull();
        expect(gate.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO8601形式
      });
    });

    // UT-HF-081
    context('checking状態のとき', () => {
      it('fail(reason)でstatus=failed・failureReasonが設定されること（INV-9）', () => {
        // Arrange
        const gate = createCompletionGate();
        gate.startCheck();
        // Act
        gate.fail('magic file not found');
        // Assert
        expect(gate.status).toBe('failed');
        expect(gate.failureReason).toBe('magic file not found');
      });
    });

    // UT-HF-082
    context('checking状態のとき', () => {
      it('fail("")でエラーがスローされること（INV-9: 空文字reason禁止）', () => {
        // Arrange
        const gate = createCompletionGate();
        gate.startCheck();
        // Act / Assert
        expect(() => gate.fail('')).toThrow();
      });
    });
  });

  describe('canRecheckメソッドテスト', () => {
    // UT-HF-083
    it('pending状態ではcanRecheck()がtrueを返すこと', () => {
      // Arrange
      const gate = createCompletionGate();
      // Act
      const actual = gate.canRecheck();
      // Assert
      expect(actual).toBe(true);
    });

    // UT-HF-084
    it('failed状態ではcanRecheck()がtrueを返すこと', () => {
      // Arrange
      const gate = createCompletionGate();
      gate.startCheck();
      gate.fail('not found');
      // Act
      const actual = gate.canRecheck();
      // Assert
      expect(actual).toBe(true);
    });

    // UT-HF-085
    it('passed状態ではcanRecheck()がfalseを返すこと', () => {
      // Arrange
      const gate = createCompletionGate();
      gate.startCheck();
      gate.passed();
      // Act
      const actual = gate.canRecheck();
      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

---

## 5. ドメインサービステスト詳細ロジック

### 5.1 HookEvaluationService

```typescript
// scripts/harness/__tests__/unit/fuse-hooks-engine/services/hook-evaluation-service.test.ts

import { describe, it, expect } from 'vitest';
import { target, context } from '../../../helpers/test-helpers.js';
import { HookEvaluationService } from '../../../../fuse-hooks-engine/domain/services/hook-evaluation-service.js';
import { HookType } from '../../../../fuse-hooks-engine/domain/value-objects/hook-type.js';
import { FilePattern } from '../../../../fuse-hooks-engine/domain/value-objects/file-pattern.js';
import { HookAction } from '../../../../fuse-hooks-engine/domain/value-objects/hook-action.js';
import { HookDefinition } from '../../../../fuse-hooks-engine/domain/aggregates/hook-definition.js';
import {
  createPreWriteHookDefinition,
  createOnCompleteHookDefinition,
} from '../factories.js';

target('HookEvaluationService', () => {
  describe('evaluateメソッドテスト', () => {
    // UT-HF-088
    context('pre-writeフック(**.ts)が登録されているとき', () => {
      it('src/index.tsのwriteイベントでblock-write HookActionが返ること', () => {
        // Arrange
        const service = new HookEvaluationService();
        const definitions = [createPreWriteHookDefinition({ includePatterns: ['**/*.ts'] })];
        // Act
        const actual = service.evaluate('src/index.ts', 'write', definitions);
        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].actionType).toBe('block-write');
      });
    });

    // UT-HF-089
    context('pre-writeフック(**.ts)が登録されているとき', () => {
      it('docs/README.mdのwriteイベントでアクションが返らないこと', () => {
        // Arrange
        const service = new HookEvaluationService();
        const definitions = [createPreWriteHookDefinition({ includePatterns: ['**/*.ts'] })];
        // Act
        const actual = service.evaluate('docs/README.md', 'write', definitions);
        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    // UT-HF-090
    context('pre-readフック(**.env)が登録されているとき', () => {
      it('.envのreadイベントでallow-read HookActionが返ること', () => {
        // Arrange
        const service = new HookEvaluationService();
        const hookType = HookType.create('pre-read')._unsafeUnwrap();
        const filePattern = FilePattern.create(['**/*.env'])._unsafeUnwrap();
        const hookAction = HookAction.create('allow-read', { maxAccessCount: 3 })._unsafeUnwrap();
        const definitions = [HookDefinition.create(hookType, filePattern, hookAction)._unsafeUnwrap()];
        // Act
        const actual = service.evaluate('.env', 'read', definitions);
        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].actionType).toBe('allow-read');
      });
    });

    // UT-HF-091
    context('HookDefinitionが空配列のとき', () => {
      it('アクションが返らないこと', () => {
        // Arrange
        const service = new HookEvaluationService();
        // Act
        const actual = service.evaluate('src/index.ts', 'write', []);
        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    // UT-HF-092
    context('pre-writeフックとpost-writeフック両方が登録されているとき', () => {
      it('src/index.tsのwriteイベントで2件のHookActionが返ること', () => {
        // Arrange
        const service = new HookEvaluationService();
        const preWriteDef = createPreWriteHookDefinition({ includePatterns: ['**/*.ts'] });
        const hookType = HookType.create('post-write')._unsafeUnwrap();
        const filePattern = FilePattern.create(['**/*.ts'])._unsafeUnwrap();
        const hookAction = HookAction.create('run-shell', { script: 'echo done', timeout: 3000, failOnNonZero: true })._unsafeUnwrap();
        const postWriteDef = HookDefinition.create(hookType, filePattern, hookAction)._unsafeUnwrap();
        const definitions = [preWriteDef, postWriteDef];
        // Act
        const actual = service.evaluate('src/index.ts', 'write', definitions);
        // Assert
        expect(actual).toHaveLength(2);
      });
    });

    // UT-HF-093
    context('on-completeフック(.harness/done/*.done)が登録されているとき', () => {
      it('.harness/done/HF1-01.doneのwriteイベントでtrigger-completion-checkが返ること', () => {
        // Arrange
        const service = new HookEvaluationService();
        const definitions = [createOnCompleteHookDefinition()];
        // Act
        const actual = service.evaluate('.harness/done/HF1-01.done', 'write', definitions);
        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].actionType).toBe('trigger-completion-check');
      });
    });

    // UT-HF-094
    context('pre-writeフック(**.ts)が登録されているとき', () => {
      it('src/index.tsのreadイベントでアクションが返らないこと（イベント種別不一致）', () => {
        // Arrange
        const service = new HookEvaluationService();
        const definitions = [createPreWriteHookDefinition({ includePatterns: ['**/*.ts'] })];
        // Act
        const actual = service.evaluate('src/index.ts', 'read', definitions);
        // Assert
        expect(actual).toHaveLength(0);
      });
    });
  });
});
```
