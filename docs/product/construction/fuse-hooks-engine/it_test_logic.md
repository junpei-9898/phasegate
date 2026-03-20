# ITテストロジック設計: fuse-hooks-engine

> **Unit ID**: fuse-hooks-engine
> **作成日**: 2026-03-20
> **参照**: it_test_design.md, logical_design.md

---

## 1. テストファイル構成

| ファイルパス | 対象 | ケース数 |
|-------------|------|---------|
| `scripts/harness/__tests__/integration/fuse-hooks-engine/load-hook-config-usecase.test.ts` | LoadHookConfigUseCase | 5 |
| `scripts/harness/__tests__/integration/fuse-hooks-engine/evaluate-hook-event-usecase.test.ts` | EvaluateHookEventUseCase | 7 |
| `scripts/harness/__tests__/integration/fuse-hooks-engine/check-completion-gate-usecase.test.ts` | CheckCompletionGateUseCase | 5 |
| `scripts/harness/__tests__/integration/fuse-hooks-engine/execute-fallback-hook-usecase.test.ts` | ExecuteFallbackHookUseCase | 2 |
| `scripts/harness/__tests__/integration/fuse-hooks-engine/validate-hook-yaml-usecase.test.ts` | ValidateHookYamlUseCase | 2 |
| `scripts/harness/__tests__/integration/fuse-hooks-engine/yaml-hook-config-reader-adapter.test.ts` | YamlHookConfigReaderAdapter | 4 |
| `scripts/harness/__tests__/integration/fuse-hooks-engine/completion-gate-file-adapter.test.ts` | CompletionGateFileAdapter | 3 |
| `scripts/harness/__tests__/integration/fuse-hooks-engine/shell-wrapper-adapter.test.ts` | ShellWrapperAdapter | 3 |
| `scripts/harness/__tests__/integration/fuse-hooks-engine/hook-config-load-evaluate-flow.test.ts` | フック設定ロード→評価統合フロー | 2 |
| `scripts/harness/__tests__/integration/fuse-hooks-engine/completion-gate-flow.test.ts` | 完了ゲート確認統合フロー | 2 |
| `scripts/harness/__tests__/integration/fuse-hooks-engine/hook-config-handler.test.ts` | HookConfigHandler | 3 |
| `scripts/harness/__tests__/integration/fuse-hooks-engine/completion-gate-handler.test.ts` | CompletionGateHandler | 2 |
| **合計** | | **40** |

---

## 2. モック戦略

### 2.1 外部Unitアダプタ（vi.fn()でスタブ化）

| ポート | モック方針 |
|--------|-----------|
| HookConfigReaderPort | `read: vi.fn().mockResolvedValue(Result.ok(hookYamlConfig))` |
| FuseHandlerPort | `register: vi.fn().mockResolvedValue(undefined)`, `dispatch: vi.fn()` |
| FallbackHandlerPort | `handlePreWrite: vi.fn().mockResolvedValue(hookAction)`, `handlePreRead: vi.fn()` |
| ShellWrapperPort | `execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })` |
| CompletionGatePort | `load: vi.fn().mockResolvedValue(gate)`, `save: vi.fn().mockResolvedValue(undefined)` |

### 2.2 ファイルI/O（実ファイルシステム）

`YamlHookConfigReaderAdapter`・`CompletionGateFileAdapter`・`ShellWrapperAdapter` は実際のファイルI/Oを伴うため、`os.tmpdir()` 配下の一時ディレクトリにテスト固有のサブディレクトリを作成して検証する。

```typescript
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

// テスト前の準備
const tmpDir = path.join(os.tmpdir(), `fuse-hooks-engine-test-${Date.now()}`);
await fs.mkdir(tmpDir, { recursive: true });

// テスト後のクリーンアップ
await fs.rm(tmpDir, { recursive: true, force: true });
```

### 2.3 内部ドメインサービス（実体を使用）

`HookEvaluationService` は実体のインスタンスを使用する。これによりUseCaseテストでは実ドメインロジックとUseCaseオーケストレーションを統合検証する。

### 2.4 UseCaseの依存注入パターン

```typescript
// UseCase テストの依存注入パターン例
const hookConfigReaderPort = {
  read: vi.fn().mockResolvedValue(Result.ok(validHookYamlConfig)),
};
const evaluationService = new HookEvaluationService();
const useCase = new LoadHookConfigUseCase(hookConfigReaderPort, evaluationService);
```

---

## 3. UseCaseテスト詳細ロジック

### 3.1 LoadHookConfigUseCase

```typescript
// scripts/harness/__tests__/integration/fuse-hooks-engine/load-hook-config-usecase.test.ts

import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { LoadHookConfigUseCase } from '../../../fuse-hooks-engine/application/usecases/load-hook-config-usecase.js';
import { HookEvaluationService } from '../../../fuse-hooks-engine/domain/services/hook-evaluation-service.js';
import { HookYamlConfig } from '../../../fuse-hooks-engine/domain/value-objects/hook-yaml-config.js';

// テスト用有効なrawYAML設定
const validRawConfig = {
  version: 1,
  hooks: [
    {
      type: 'pre-write',
      files: { include: ['**/*.env'] },
      action: { type: 'block-write', config: { reason: 'Protected', notifyUser: true } },
    },
    {
      type: 'pre-read',
      files: { include: ['**/*.env'] },
      action: { type: 'allow-read', config: { maxAccessCount: 3 } },
    },
    {
      type: 'on-complete',
      files: { include: ['.harness/done/*.done'] },
      action: { type: 'trigger-completion-check', config: { gateId: 'story-gate' } },
    },
  ],
  protectedResources: ['**/*.env', '.harness/secrets/**'],
};

target('LoadHookConfigUseCase', () => {
  describe('正常系', () => {
    // IT-HF-001
    describe('有効な.harness-hooks.ymlをロードするとHookDefinition[]が返ること', () => {
      context('HookConfigReaderPortが有効なHookYamlConfigを返す場合', () => {
        it('definitions.length=3・errors=[]のOutputが返る', async () => {
          // Arrange
          const validConfig = HookYamlConfig.create(validRawConfig)._unsafeUnwrap();
          const hookConfigReaderPort = {
            read: vi.fn().mockResolvedValue({ isOk: () => true, _unsafeUnwrap: () => validConfig }),
          };
          const evaluationService = new HookEvaluationService();
          const useCase = new LoadHookConfigUseCase(hookConfigReaderPort, evaluationService);
          // Act
          const actual = await useCase.execute({ yamlPath: '.harness-hooks.yml' });
          // Assert
          expect(actual.definitions).toHaveLength(3);
          expect(actual.errors).toHaveLength(0);
        });
      });
    });

    // IT-HF-002
    describe('protectedResourcesフィールドが存在する場合にProtectedResourceListが返ること', () => {
      context('HookConfigReaderPortがprotectedResources付きHookYamlConfigを返す場合', () => {
        it('protectedResources.length=2が返る', async () => {
          // Arrange
          const validConfig = HookYamlConfig.create(validRawConfig)._unsafeUnwrap();
          const hookConfigReaderPort = {
            read: vi.fn().mockResolvedValue({ isOk: () => true, _unsafeUnwrap: () => validConfig }),
          };
          const useCase = new LoadHookConfigUseCase(hookConfigReaderPort, new HookEvaluationService());
          // Act
          const actual = await useCase.execute({ yamlPath: '.harness-hooks.yml' });
          // Assert
          expect(actual.protectedResources).toHaveLength(2);
        });
      });
    });

    // IT-HF-003
    describe('hooksが空配列のYAMLをロードすると空のdefinitions[]が返ること', () => {
      context('HookConfigReaderPortがhooks=[]のHookYamlConfigを返す場合', () => {
        it('definitions.length=0・errors=[]が返る', async () => {
          // Arrange
          const emptyConfig = HookYamlConfig.create({ version: 1, hooks: [] })._unsafeUnwrap();
          const hookConfigReaderPort = {
            read: vi.fn().mockResolvedValue({ isOk: () => true, _unsafeUnwrap: () => emptyConfig }),
          };
          const useCase = new LoadHookConfigUseCase(hookConfigReaderPort, new HookEvaluationService());
          // Act
          const actual = await useCase.execute({ yamlPath: '.harness-hooks.yml' });
          // Assert
          expect(actual.definitions).toHaveLength(0);
          expect(actual.errors).toHaveLength(0);
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-HF-004
    describe('YAML解析エラーが発生した場合にエラーが返ること', () => {
      context('HookConfigReaderPortがResult.fail([HOOK_YAML_PARSE_ERROR])を返す場合', () => {
        it('errors[]にHOOK_YAML_PARSE_ERRORが含まれること', async () => {
          // Arrange
          const hookConfigReaderPort = {
            read: vi.fn().mockResolvedValue({
              isOk: () => false,
              _unsafeUnwrapErr: () => [{ code: 'HOOK_YAML_PARSE_ERROR', message: 'Parse failed' }],
            }),
          };
          const useCase = new LoadHookConfigUseCase(hookConfigReaderPort, new HookEvaluationService());
          // Act
          const actual = await useCase.execute({ yamlPath: '.harness-hooks.yml' });
          // Assert
          expect(actual.errors.some((e) => e.code === 'HOOK_YAML_PARSE_ERROR')).toBe(true);
          expect(actual.definitions).toHaveLength(0);
        });
      });
    });

    // IT-HF-005
    describe('INV-4違反のhookエントリでエラーが返ること', () => {
      context('pre-read + block-writeのエントリが含まれる場合', () => {
        it('errors[]にHOOK_ACTION_TYPE_MISMATCHが含まれること', async () => {
          // Arrange
          const invalidRawConfig = {
            version: 1,
            hooks: [
              {
                type: 'pre-read',
                files: { include: ['**/*.ts'] },
                action: { type: 'block-write', config: { reason: 'Invalid', notifyUser: false } },
              },
            ],
          };
          const invalidConfig = HookYamlConfig.create(invalidRawConfig)._unsafeUnwrap();
          const hookConfigReaderPort = {
            read: vi.fn().mockResolvedValue({ isOk: () => true, _unsafeUnwrap: () => invalidConfig }),
          };
          const useCase = new LoadHookConfigUseCase(hookConfigReaderPort, new HookEvaluationService());
          // Act
          const actual = await useCase.execute({ yamlPath: '.harness-hooks.yml' });
          // Assert
          expect(actual.errors.some((e) => e.code === 'HOOK_ACTION_TYPE_MISMATCH')).toBe(true);
        });
      });
    });
  });
});
```

---

### 3.2 EvaluateHookEventUseCase

```typescript
// scripts/harness/__tests__/integration/fuse-hooks-engine/evaluate-hook-event-usecase.test.ts

import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { EvaluateHookEventUseCase } from '../../../fuse-hooks-engine/application/usecases/evaluate-hook-event-usecase.js';
import { HookEvaluationService } from '../../../fuse-hooks-engine/domain/services/hook-evaluation-service.js';
import { createPreWriteHookDefinition } from '../unit/factories.js';

target('EvaluateHookEventUseCase', () => {
  describe('正常系（FUSEモード）', () => {
    // IT-HF-006
    describe('mounted状態でblock-writeフックにマッチしてblocked=trueが返ること', () => {
      context('filePath=".env", eventType="write", mountStatus="mounted"の場合', () => {
        it('blocked=true・actions=[block-write]・errors=[]が返る', async () => {
          // Arrange
          const fuseHandlerPort = { dispatch: vi.fn() };
          const shellWrapperPort = { execute: vi.fn() };
          const definitions = [createPreWriteHookDefinition({ includePatterns: ['**/*.env'] })];
          const evaluationService = new HookEvaluationService();
          const useCase = new EvaluateHookEventUseCase(fuseHandlerPort, shellWrapperPort, evaluationService);
          // Act
          const actual = await useCase.execute({
            filePath: '.env',
            eventType: 'write',
            mountStatus: 'mounted',
            definitions,
          });
          // Assert
          expect(actual.blocked).toBe(true);
          expect(actual.actions).toHaveLength(1);
          expect(actual.actions[0].actionType).toBe('block-write');
          expect(actual.errors).toHaveLength(0);
        });
      });
    });

    // IT-HF-007
    describe('mounted状態でどのフックにもマッチしない場合blocked=falseが返ること', () => {
      context('filePath="src/utils.ts"（**.envパターン不一致）の場合', () => {
        it('blocked=false・actions=[]・errors=[]が返る', async () => {
          // Arrange
          const fuseHandlerPort = { dispatch: vi.fn() };
          const shellWrapperPort = { execute: vi.fn() };
          const definitions = [createPreWriteHookDefinition({ includePatterns: ['**/*.env'] })];
          const evaluationService = new HookEvaluationService();
          const useCase = new EvaluateHookEventUseCase(fuseHandlerPort, shellWrapperPort, evaluationService);
          // Act
          const actual = await useCase.execute({
            filePath: 'src/utils.ts',
            eventType: 'write',
            mountStatus: 'mounted',
            definitions,
          });
          // Assert
          expect(actual.blocked).toBe(false);
          expect(actual.actions).toHaveLength(0);
          expect(actual.errors).toHaveLength(0);
        });
      });
    });

    // IT-HF-008
    describe('run-shellアクションのフックにマッチした場合にShellWrapperPortが呼ばれること', () => {
      context('post-writeフック（run-shell）が登録されているとき', () => {
        it('ShellWrapperPort.execute()が1回呼ばれること', async () => {
          // Arrange
          const fuseHandlerPort = { dispatch: vi.fn() };
          const shellWrapperPort = {
            execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
          };
          // post-writeフック定義を作成（run-shellアクション）
          const definitions = [/* post-write + run-shell フック定義 */];
          const evaluationService = new HookEvaluationService();
          const useCase = new EvaluateHookEventUseCase(fuseHandlerPort, shellWrapperPort, evaluationService);
          // Act
          await useCase.execute({
            filePath: 'src/index.ts',
            eventType: 'write',
            mountStatus: 'mounted',
            definitions,
          });
          // Assert
          expect(shellWrapperPort.execute).toHaveBeenCalledOnce();
        });
      });
    });
  });

  describe('正常系（フォールバックモード）', () => {
    // IT-HF-009
    describe('fallback=L1状態でFallbackHandlerPort経由でブロックされること', () => {
      context('mountStatus="fallback", fallbackMode="L1"の場合', () => {
        it('blocked=true・errors=[]が返る', async () => {
          // Arrange
          const fallbackHandlerPort = {
            handlePreWrite: vi.fn().mockResolvedValue({
              actionType: 'block-write',
              config: { reason: 'L1 fallback block', notifyUser: true },
            }),
          };
          const useCase = new EvaluateHookEventUseCase(null, null, new HookEvaluationService(), fallbackHandlerPort);
          // Act
          const actual = await useCase.execute({
            filePath: '.env',
            eventType: 'write',
            mountStatus: 'fallback',
            fallbackMode: 'L1',
            definitions: [],
          });
          // Assert
          expect(actual.blocked).toBe(true);
          expect(actual.errors).toHaveLength(0);
        });
      });
    });

    // IT-HF-010
    describe('fallback=L4状態ではactions=[]が返ること', () => {
      context('mountStatus="fallback", fallbackMode="L4"の場合', () => {
        it('blocked=false・actions=[]が返る', async () => {
          // Arrange
          const fallbackHandlerPort = {
            handlePreWrite: vi.fn().mockResolvedValue(null), // L4は機能なし
          };
          const useCase = new EvaluateHookEventUseCase(null, null, new HookEvaluationService(), fallbackHandlerPort);
          // Act
          const actual = await useCase.execute({
            filePath: '.env',
            eventType: 'write',
            mountStatus: 'fallback',
            fallbackMode: 'L4',
            definitions: [],
          });
          // Assert
          expect(actual.blocked).toBe(false);
          expect(actual.actions).toHaveLength(0);
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-HF-011
    describe('mountStatus="error"状態ではFUSE_MOUNT_ERRORが返ること', () => {
      context('FUSEマウントエラー状態の場合', () => {
        it('errors[]にFUSE_MOUNT_ERRORが含まれること', async () => {
          // Arrange
          const useCase = new EvaluateHookEventUseCase(null, null, new HookEvaluationService(), null);
          // Act
          const actual = await useCase.execute({
            filePath: '.env',
            eventType: 'write',
            mountStatus: 'error',
            definitions: [],
          });
          // Assert
          expect(actual.errors.some((e) => e.code === 'FUSE_MOUNT_ERROR')).toBe(true);
        });
      });
    });
  });
});
```

---

### 3.3 CheckCompletionGateUseCase

```typescript
// scripts/harness/__tests__/integration/fuse-hooks-engine/check-completion-gate-usecase.test.ts

import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { target, context } from '../../helpers/test-helpers.js';
import { CheckCompletionGateUseCase } from '../../../fuse-hooks-engine/application/usecases/check-completion-gate-usecase.js';
import { CompletionGate } from '../../../fuse-hooks-engine/domain/entities/completion-gate.js';
import { MagicFile } from '../../../fuse-hooks-engine/domain/value-objects/magic-file.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `fuse-hooks-engine-gate-test-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

target('CheckCompletionGateUseCase', () => {
  describe('正常系', () => {
    // IT-HF-013
    describe('マジックファイルが存在する場合にgateStatus="passed"が返ること', () => {
      context('storyId="HF1-05"でマジックファイルがtmpdirに存在する場合', () => {
        it('gateStatus="passed"・checkedAtが非null・failureReason=nullが返る', async () => {
          // Arrange
          const magicFilePath = path.join(tmpDir, 'HF1-05.done');
          await fs.writeFile(magicFilePath, JSON.stringify({ storyId: 'HF1-05', completedAt: '2026-03-20T00:00:00Z' }));
          const magicFile = MagicFile.create(magicFilePath)._unsafeUnwrap();
          const pendingGate = CompletionGate.create('HF1-05', magicFile);
          const completionGatePort = {
            load: vi.fn().mockResolvedValue(pendingGate),
            save: vi.fn().mockResolvedValue(undefined),
          };
          const useCase = new CheckCompletionGateUseCase(completionGatePort);
          // Act
          const actual = await useCase.execute({
            storyId: 'HF1-05',
            magicFilePath,
          });
          // Assert
          expect(actual.gateStatus).toBe('passed');
          expect(actual.checkedAt).not.toBeNull();
          expect(actual.failureReason).toBeNull();
          expect(actual.errors).toHaveLength(0);
        });
      });
    });

    // IT-HF-014
    describe('マジックファイルが存在しない場合にgateStatus="failed"が返ること', () => {
      context('storyId="HF1-05"でマジックファイルが存在しない場合', () => {
        it('gateStatus="failed"・failureReasonが非nullが返る', async () => {
          // Arrange
          const magicFilePath = path.join(tmpDir, 'HF1-05.done'); // 作成しない
          const magicFile = MagicFile.create(magicFilePath)._unsafeUnwrap();
          const pendingGate = CompletionGate.create('HF1-05', magicFile);
          const completionGatePort = {
            load: vi.fn().mockResolvedValue(pendingGate),
            save: vi.fn().mockResolvedValue(undefined),
          };
          const useCase = new CheckCompletionGateUseCase(completionGatePort);
          // Act
          const actual = await useCase.execute({
            storyId: 'HF1-05',
            magicFilePath,
          });
          // Assert
          expect(actual.gateStatus).toBe('failed');
          expect(actual.failureReason).toContain('magic file not found');
        });
      });
    });

    // IT-HF-015
    describe('passed状態のGateに対してcanRecheck()=falseで再チェックがスキップされること', () => {
      context('既存のpassed状態のGateが存在する場合', () => {
        it('gateStatus="passed"のままでsave()が呼ばれないこと', async () => {
          // Arrange
          const magicFile = MagicFile.create('.harness/done/HF1-05.done')._unsafeUnwrap();
          const passedGate = CompletionGate.create('HF1-05', magicFile);
          passedGate.startCheck();
          passedGate.passed();
          const completionGatePort = {
            load: vi.fn().mockResolvedValue(passedGate),
            save: vi.fn().mockResolvedValue(undefined),
          };
          const useCase = new CheckCompletionGateUseCase(completionGatePort);
          // Act
          const actual = await useCase.execute({ storyId: 'HF1-05', magicFilePath: '.harness/done/HF1-05.done' });
          // Assert
          expect(actual.gateStatus).toBe('passed');
          expect(completionGatePort.save).not.toHaveBeenCalled();
        });
      });
    });

    // IT-HF-016
    describe('failed状態のGateに対してcanRecheck()=trueで再チェックが実行されること', () => {
      context('既存のfailed状態のGateが存在し、マジックファイルを作成した場合', () => {
        it('再チェックが成功してgateStatus="passed"になること', async () => {
          // Arrange
          const magicFilePath = path.join(tmpDir, 'HF1-04.done');
          await fs.writeFile(magicFilePath, JSON.stringify({ storyId: 'HF1-04', completedAt: '2026-03-20T00:00:00Z' }));
          const magicFile = MagicFile.create(magicFilePath)._unsafeUnwrap();
          const failedGate = CompletionGate.create('HF1-04', magicFile);
          failedGate.startCheck();
          failedGate.fail('magic file not found');
          const completionGatePort = {
            load: vi.fn().mockResolvedValue(failedGate),
            save: vi.fn().mockResolvedValue(undefined),
          };
          const useCase = new CheckCompletionGateUseCase(completionGatePort);
          // Act
          const actual = await useCase.execute({ storyId: 'HF1-04', magicFilePath });
          // Assert
          expect(actual.gateStatus).toBe('passed');
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-HF-017
    describe('CompletionGatePortのsaveが失敗した場合にCOMPLETION_GATE_IO_ERRORが返ること', () => {
      context('save()がエラーをスローする場合', () => {
        it('errors[]にCOMPLETION_GATE_IO_ERRORが含まれること', async () => {
          // Arrange
          const magicFilePath = path.join(tmpDir, 'HF1-05.done');
          await fs.writeFile(magicFilePath, '{}');
          const magicFile = MagicFile.create(magicFilePath)._unsafeUnwrap();
          const pendingGate = CompletionGate.create('HF1-05', magicFile);
          const completionGatePort = {
            load: vi.fn().mockResolvedValue(pendingGate),
            save: vi.fn().mockRejectedValue(new Error('IO error')),
          };
          const useCase = new CheckCompletionGateUseCase(completionGatePort);
          // Act
          const actual = await useCase.execute({ storyId: 'HF1-05', magicFilePath });
          // Assert
          expect(actual.errors.some((e) => e.code === 'COMPLETION_GATE_IO_ERROR')).toBe(true);
        });
      });
    });
  });
});
```

---

## 4. Infrastructure Adapterテスト詳細ロジック

### 4.1 YamlHookConfigReaderAdapter

```typescript
// scripts/harness/__tests__/integration/fuse-hooks-engine/yaml-hook-config-reader-adapter.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { target, context } from '../../helpers/test-helpers.js';
import { YamlHookConfigReaderAdapter } from '../../../fuse-hooks-engine/infrastructure/adapters/yaml-hook-config-reader-adapter.js';

const VALID_YAML = `
version: 1
hooks:
  - type: pre-write
    files:
      include:
        - "**/*.env"
    action:
      type: block-write
      config:
        reason: "Sensitive file"
        notifyUser: true
protectedResources:
  - "**/*.env"
`.trim();

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `yaml-reader-test-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

target('YamlHookConfigReaderAdapter', () => {
  // IT-HF-022
  describe('有効なYAMLファイルを読み取りHookYamlConfigを返せること', () => {
    context('有効なフォーマットのYAMLファイルが存在する場合', () => {
      it('Result.ok(HookYamlConfig)が返りhooks.length=1になること', async () => {
        // Arrange
        const yamlPath = path.join(tmpDir, '.harness-hooks.yml');
        await fs.writeFile(yamlPath, VALID_YAML);
        const adapter = new YamlHookConfigReaderAdapter();
        // Act
        const actual = await adapter.read(yamlPath);
        // Assert
        expect(actual.isOk()).toBe(true);
        expect(actual._unsafeUnwrap().hooks).toHaveLength(1);
      });
    });
  });

  // IT-HF-023
  describe('存在しないYAMLファイルパスでエラーが返ること', () => {
    context('YAMLファイルが存在しない場合', () => {
      it('Result.fail([HOOK_YAML_NOT_FOUND])が返ること', async () => {
        // Arrange
        const adapter = new YamlHookConfigReaderAdapter();
        // Act
        const actual = await adapter.read(path.join(tmpDir, 'nonexistent.yml'));
        // Assert
        expect(actual.isErr()).toBe(true);
        expect(actual._unsafeUnwrapErr()[0].code).toBe('HOOK_YAML_NOT_FOUND');
      });
    });
  });

  // IT-HF-024
  describe('YAML構文エラーファイルでHOOK_YAML_PARSE_ERRORが返ること', () => {
    context('YAML構文が不正なファイルの場合', () => {
      it('Result.fail([HOOK_YAML_PARSE_ERROR])が返ること', async () => {
        // Arrange
        const yamlPath = path.join(tmpDir, 'invalid.yml');
        await fs.writeFile(yamlPath, '{ invalid yaml: [unclosed');
        const adapter = new YamlHookConfigReaderAdapter();
        // Act
        const actual = await adapter.read(yamlPath);
        // Assert
        expect(actual.isErr()).toBe(true);
        expect(actual._unsafeUnwrapErr()[0].code).toBe('HOOK_YAML_PARSE_ERROR');
      });
    });
  });

  // IT-HF-025
  describe('AJVスキーマバリデーション失敗でHOOK_YAML_SCHEMA_ERRORが返ること', () => {
    context('versionフィールドが存在しないYAMLの場合', () => {
      it('Result.fail([HOOK_YAML_SCHEMA_ERROR])が返ること', async () => {
        // Arrange
        const yamlPath = path.join(tmpDir, 'no-version.yml');
        await fs.writeFile(yamlPath, 'hooks: []');
        const adapter = new YamlHookConfigReaderAdapter();
        // Act
        const actual = await adapter.read(yamlPath);
        // Assert
        expect(actual.isErr()).toBe(true);
        expect(actual._unsafeUnwrapErr()[0].code).toBe('HOOK_YAML_SCHEMA_ERROR');
      });
    });
  });
});
```

---

### 4.2 ShellWrapperAdapter（重要度高のため詳細記載）

```typescript
// scripts/harness/__tests__/integration/fuse-hooks-engine/shell-wrapper-adapter.test.ts

import { describe, it, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ShellWrapperAdapter } from '../../../fuse-hooks-engine/infrastructure/adapters/shell-wrapper-adapter.js';
import { DestructiveCommandList } from '../../../fuse-hooks-engine/domain/value-objects/destructive-command-list.js';

target('ShellWrapperAdapter', () => {
  // IT-HF-029
  describe('安全なスクリプトをexecuteするとexitCode=0・stdoutが返ること', () => {
    context('echo helloスクリプトを実行する場合', () => {
      it('exitCode=0・stdout="hello\\n"が返ること', async () => {
        // Arrange
        const destructiveList = DestructiveCommandList.create([])._unsafeUnwrap();
        const adapter = new ShellWrapperAdapter(destructiveList);
        // Act
        const actual = await adapter.execute('echo hello', { timeout: 5000, failOnNonZero: true });
        // Assert
        expect(actual.exitCode).toBe(0);
        expect(actual.stdout.trim()).toBe('hello');
      });
    });
  });

  // IT-HF-030
  describe('破壊的コマンドを含むスクリプトでDESTRUCTIVE_COMMAND_BLOCKEDが返ること', () => {
    context('rm -rfが危険コマンドとして登録されているとき', () => {
      it('DESTRUCTIVE_COMMAND_BLOCKEDエラーがスローされること', async () => {
        // Arrange
        const destructiveList = DestructiveCommandList.create([
          { command: 'rm', dangerousOptions: ['-rf'] },
        ])._unsafeUnwrap();
        const adapter = new ShellWrapperAdapter(destructiveList);
        // Act / Assert
        await expect(
          adapter.execute('rm -rf /tmp/test', { timeout: 5000, failOnNonZero: true })
        ).rejects.toMatchObject({ code: 'DESTRUCTIVE_COMMAND_BLOCKED' });
      });
    });
  });

  // IT-HF-031
  describe('exitCode=1のスクリプトでfailOnNonZero=trueのときSHELL_HOOK_FAILEDが返ること', () => {
    context('exit 1スクリプトとfailOnNonZero=trueの場合', () => {
      it('SHELL_HOOK_FAILEDエラーがスローされること', async () => {
        // Arrange
        const destructiveList = DestructiveCommandList.create([])._unsafeUnwrap();
        const adapter = new ShellWrapperAdapter(destructiveList);
        // Act / Assert
        await expect(
          adapter.execute('exit 1', { timeout: 5000, failOnNonZero: true })
        ).rejects.toMatchObject({ code: 'SHELL_HOOK_FAILED' });
      });
    });
  });
});
```

---

## 5. 統合フローテスト詳細ロジック

### 5.1 フック設定ロード→評価統合フロー

```typescript
// scripts/harness/__tests__/integration/fuse-hooks-engine/hook-config-load-evaluate-flow.test.ts

import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { LoadHookConfigUseCase } from '../../../fuse-hooks-engine/application/usecases/load-hook-config-usecase.js';
import { EvaluateHookEventUseCase } from '../../../fuse-hooks-engine/application/usecases/evaluate-hook-event-usecase.js';
import { HookEvaluationService } from '../../../fuse-hooks-engine/domain/services/hook-evaluation-service.js';
import { HookYamlConfig } from '../../../fuse-hooks-engine/domain/value-objects/hook-yaml-config.js';

target('フック設定ロード→評価統合フロー', () => {
  // IT-HF-032
  describe('YAMLをロードしてwriteイベントを評価し、フックが適用されること', () => {
    context('**.envのpre-writeフックが定義され、.envへのwriteイベントが発生する場合', () => {
      it('LoadHookConfigUseCase→EvaluateHookEventUseCaseの連続呼び出しでblocked=trueが返る', async () => {
        // Arrange
        const rawConfig = {
          version: 1,
          hooks: [{
            type: 'pre-write',
            files: { include: ['**/*.env'] },
            action: { type: 'block-write', config: { reason: 'Protected', notifyUser: true } },
          }],
        };
        const config = HookYamlConfig.create(rawConfig)._unsafeUnwrap();
        const hookConfigReaderPort = {
          read: vi.fn().mockResolvedValue({ isOk: () => true, _unsafeUnwrap: () => config }),
        };
        const evaluationService = new HookEvaluationService();
        const loadUseCase = new LoadHookConfigUseCase(hookConfigReaderPort, evaluationService);
        const evaluateUseCase = new EvaluateHookEventUseCase(null, null, evaluationService, null);

        // Act: Step 1 - ロード
        const loadResult = await loadUseCase.execute({ yamlPath: '.harness-hooks.yml' });
        // Act: Step 2 - 評価
        const actual = await evaluateUseCase.execute({
          filePath: '.env',
          eventType: 'write',
          mountStatus: 'mounted',
          definitions: loadResult.definitions,
        });

        // Assert
        expect(actual.blocked).toBe(true);
        expect(actual.errors).toHaveLength(0);
      });
    });
  });

  // IT-HF-033
  describe('YAMLをロードして該当なしのwriteイベントを評価し、blocked=falseが返ること', () => {
    context('src/utils.ts（**.envパターン不一致）へのwriteイベントの場合', () => {
      it('blocked=false・actions=[]が返る', async () => {
        // Arrange
        const rawConfig = {
          version: 1,
          hooks: [{
            type: 'pre-write',
            files: { include: ['**/*.env'] },
            action: { type: 'block-write', config: { reason: 'Protected', notifyUser: true } },
          }],
        };
        const config = HookYamlConfig.create(rawConfig)._unsafeUnwrap();
        const hookConfigReaderPort = {
          read: vi.fn().mockResolvedValue({ isOk: () => true, _unsafeUnwrap: () => config }),
        };
        const evaluationService = new HookEvaluationService();
        const loadUseCase = new LoadHookConfigUseCase(hookConfigReaderPort, evaluationService);
        const evaluateUseCase = new EvaluateHookEventUseCase(null, null, evaluationService, null);

        // Act
        const loadResult = await loadUseCase.execute({ yamlPath: '.harness-hooks.yml' });
        const actual = await evaluateUseCase.execute({
          filePath: 'src/utils.ts',
          eventType: 'write',
          mountStatus: 'mounted',
          definitions: loadResult.definitions,
        });

        // Assert
        expect(actual.blocked).toBe(false);
        expect(actual.actions).toHaveLength(0);
      });
    });
  });
});
```

---

### 5.2 完了ゲート確認統合フロー

```typescript
// scripts/harness/__tests__/integration/fuse-hooks-engine/completion-gate-flow.test.ts

import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { target, context } from '../../helpers/test-helpers.js';
import { EvaluateHookEventUseCase } from '../../../fuse-hooks-engine/application/usecases/evaluate-hook-event-usecase.js';
import { CheckCompletionGateUseCase } from '../../../fuse-hooks-engine/application/usecases/check-completion-gate-usecase.js';
import { HookEvaluationService } from '../../../fuse-hooks-engine/domain/services/hook-evaluation-service.js';
import { CompletionGate } from '../../../fuse-hooks-engine/domain/entities/completion-gate.js';
import { MagicFile } from '../../../fuse-hooks-engine/domain/value-objects/magic-file.js';
import { createOnCompleteHookDefinition } from '../unit/factories.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `completion-gate-flow-test-${Date.now()}`);
  await fs.mkdir(path.join(tmpDir, 'done'), { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

target('完了ゲート確認統合フロー', () => {
  // IT-HF-034
  describe('on-completeフックのマッチ→CheckCompletionGateUseCaseの呼び出し→passedになること', () => {
    context('on-completeフックが登録されていて、マジックファイルが存在する場合', () => {
      it('EvaluateHookEventUseCase→CheckCompletionGateUseCaseの連続成功でpassedが返る', async () => {
        // Arrange
        const magicFilePath = path.join(tmpDir, 'done', 'HF1-05.done');
        await fs.writeFile(magicFilePath, JSON.stringify({ storyId: 'HF1-05', completedAt: '2026-03-20T00:00:00Z' }));

        const definitions = [createOnCompleteHookDefinition()];
        const evaluationService = new HookEvaluationService();
        const evaluateUseCase = new EvaluateHookEventUseCase(null, null, evaluationService, null);

        const magicFile = MagicFile.create(magicFilePath)._unsafeUnwrap();
        const pendingGate = CompletionGate.create('HF1-05', magicFile);
        const completionGatePort = {
          load: vi.fn().mockResolvedValue(pendingGate),
          save: vi.fn().mockResolvedValue(undefined),
        };
        const checkUseCase = new CheckCompletionGateUseCase(completionGatePort);

        // Act: Step 1 - FUSEイベント評価（on-completeフックマッチ確認）
        const evalResult = await evaluateUseCase.execute({
          filePath: magicFilePath,
          eventType: 'write',
          mountStatus: 'mounted',
          definitions,
        });

        // Step 2 - 完了ゲート確認
        const actual = await checkUseCase.execute({
          storyId: 'HF1-05',
          magicFilePath,
        });

        // Assert
        expect(evalResult.actions[0].actionType).toBe('trigger-completion-check');
        expect(actual.gateStatus).toBe('passed');
      });
    });
  });

  // IT-HF-035
  describe('完了ゲートの初回作成→failed→再チェック→passedの状態遷移が行われること', () => {
    context('3ステップの状態遷移シナリオ', () => {
      it('pending→failed→passedの3ステップ状態遷移が成功すること', async () => {
        // Arrange
        const magicFilePath = path.join(tmpDir, 'done', 'HF1-05.done');
        const magicFile = MagicFile.create(magicFilePath)._unsafeUnwrap();

        // Step 1: 初回作成（pending）
        const pendingGate = CompletionGate.create('HF1-05', magicFile);
        let savedGate = pendingGate;
        const completionGatePort = {
          load: vi.fn().mockImplementation(async () => savedGate),
          save: vi.fn().mockImplementation(async (gate: CompletionGate) => { savedGate = gate; }),
        };
        const checkUseCase = new CheckCompletionGateUseCase(completionGatePort);

        // Act: Step 1 - マジックファイルなしで失敗
        const step1Result = await checkUseCase.execute({ storyId: 'HF1-05', magicFilePath });
        expect(step1Result.gateStatus).toBe('failed');

        // Act: Step 2 - マジックファイルを作成して再チェック
        await fs.writeFile(magicFilePath, JSON.stringify({ storyId: 'HF1-05', completedAt: '2026-03-20T00:00:00Z' }));
        const step2Result = await checkUseCase.execute({ storyId: 'HF1-05', magicFilePath });

        // Assert
        expect(step2Result.gateStatus).toBe('passed');
        expect(step2Result.checkedAt).not.toBeNull();
      });
    });
  });
});
```
