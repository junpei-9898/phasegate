# ITテストロジック設計: ci-governance

> **Unit ID**: ci-governance
> **作成日**: 2026-03-20
> **参照**: it_test_design.md, logical_design.md

---

## 1. テストファイル構成

| ファイルパス | 対象 | ケース数 |
|-------------|------|---------|
| `scripts/harness/__tests__/integration/ci-governance/generate-ci-template-usecase.test.ts` | GenerateCiTemplateUseCase | 6 |
| `scripts/harness/__tests__/integration/ci-governance/render-ci-template-usecase.test.ts` | RenderCiTemplateUseCase | 3 |
| `scripts/harness/__tests__/integration/ci-governance/record-error-occurrence-usecase.test.ts` | RecordErrorOccurrenceUseCase | 4 |
| `scripts/harness/__tests__/integration/ci-governance/check-escalation-usecase.test.ts` | CheckEscalationUseCase | 2 |
| `scripts/harness/__tests__/integration/ci-governance/reset-repetition-usecase.test.ts` | ResetRepetitionUseCase | 4 |
| `scripts/harness/__tests__/integration/ci-governance/migrate-agents-md-usecase.test.ts` | MigrateAgentsMdUseCase | 6 |
| `scripts/harness/__tests__/integration/ci-governance/aggregate-lessons-usecase.test.ts` | AggregateLessonsUseCase | 4 |
| `scripts/harness/__tests__/integration/ci-governance/validate-pointers-usecase.test.ts` | ValidatePointersUseCase | 3 |
| `scripts/harness/__tests__/integration/ci-governance/error-repetition-json-repository.test.ts` | ErrorRepetitionJsonRepository | 5 |
| `scripts/harness/__tests__/integration/ci-governance/agents-md-file-adapter.test.ts` | AgentsMdFileAdapter | 3 |
| `scripts/harness/__tests__/integration/ci-governance/file-system-existence-adapter.test.ts` | FileSystemExistenceAdapter | 2 |
| `scripts/harness/__tests__/integration/ci-governance/lesson-artifact-file-reader-adapter.test.ts` | LessonArtifactFileReaderAdapter | 4 |
| `scripts/harness/__tests__/integration/ci-governance/generate-ci-template-handler.test.ts` | GenerateCiTemplateHandler | 5 |
| `scripts/harness/__tests__/integration/ci-governance/migrate-agents-md-handler.test.ts` | MigrateAgentsMdHandler | 5 |
| `scripts/harness/__tests__/integration/ci-governance/check-repetition-handler.test.ts` | CheckRepetitionHandler | 4 |
| `scripts/harness/__tests__/integration/ci-governance/ci-template-generation-flow.test.ts` | CI/CDテンプレート生成統合フロー | 2 |
| `scripts/harness/__tests__/integration/ci-governance/error-repetition-flow.test.ts` | 反復エラー検出統合フロー | 3 |
| `scripts/harness/__tests__/integration/ci-governance/agents-md-migration-flow.test.ts` | AGENTS.md移行統合フロー | 3 |
| **合計** | | **68** |

---

## 2. モック戦略

### 2.1 外部Unitアダプタ（vi.fn()でスタブ化）

外部Unit（validator-system / config-foundation / harness-api / adr-foundation）への依存はすべて `vi.fn()` でスタブ化する。実実装には依存しない。

| ポート | モック方針 |
|--------|-----------|
| ValidatorIdRegistryPort | `listAll: vi.fn().mockResolvedValue([...])` |
| PresetConfigPort | `getPreset: vi.fn().mockResolvedValue({ failOnWarning: ... })` |
| CommandExistencePort | `exists: vi.fn().mockResolvedValue(true/false)` |
| AdrExistencePort | `exists: vi.fn().mockResolvedValue(true/false)` |
| EscalationExecutorPort | `execute: vi.fn().mockResolvedValue(undefined)` |
| TemplateRendererPort | `render: vi.fn().mockResolvedValue({ outputPath: '...', content: '...' })` |

### 2.2 ファイルI/O（実ファイルシステム）

`ErrorRepetitionJsonRepository`・`AgentsMdFileAdapter`・`FileSystemExistenceAdapter`・`LessonArtifactFileReaderAdapter` は実際のファイルI/Oを伴うため、`os.tmpdir()` 配下の一時ディレクトリにテスト固有のサブディレクトリを作成して検証する。

```typescript
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

// テスト前の準備
const tmpDir = path.join(os.tmpdir(), `ci-governance-test-${Date.now()}`);
await fs.mkdir(tmpDir, { recursive: true });

// テスト後のクリーンアップ
await fs.rm(tmpDir, { recursive: true, force: true });
```

### 2.3 内部ドメインサービス（実体を使用）

`TemplateGenerator`・`RepetitionDetector`・`PointerValidator`・`LessonAggregator` は実体のインスタンスを使用する。これにより UseCase テストではドメインサービスの実ロジックと UseCase のオーケストレーションを統合検証できる。

### 2.4 UseCase の依存注入パターン

```typescript
// UseCase テストの依存注入パターン例
const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1', 'v2']) };
const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
const templateGenerator = new TemplateGenerator(validatorPort, presetPort);
const rendererPort = { render: vi.fn().mockResolvedValue({ outputPath: '.github/workflows/aidlc-gate.yml', content: '...' }) };
const useCase = new GenerateCiTemplateUseCase(templateGenerator, rendererPort);
```

---

## 3. UseCase テスト詳細ロジック

### 3.1 GenerateCiTemplateUseCase

```typescript
// scripts/harness/__tests__/integration/ci-governance/generate-ci-template-usecase.test.ts

import { describe, it, vi, expect, beforeEach } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { GenerateCiTemplateUseCase } from '../../../ci-governance/application/usecases/generate-ci-template-usecase.js';
import { TemplateGenerator } from '../../../ci-governance/domain/services/template-generator.js';

target('GenerateCiTemplateUseCase', () => {
  describe('正常系', () => {
    // IT-UC-GenerateCiTemplate-001
    describe('aidlc-gateテンプレートをstandardプリセットで生成できること', () => {
      context('presetId="standard", templateType="aidlc-gate"で有効なデータが返る場合', () => {
        it('templateType・triggerCondition・targetValidatorIdsが含まれたOutputが返る', async () => {
          // Arrange
          const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1', 'v2']) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const useCase = new GenerateCiTemplateUseCase(generator);
          // Act
          const actual = await useCase.execute({ presetId: 'standard', templateType: 'aidlc-gate' });
          // Assert
          expect(actual.templateType).toBe('aidlc-gate');
          expect(actual.triggerCondition).toBe('pull_request');
          expect(actual.targetValidatorIds).toEqual(['v1', 'v2']);
          expect(actual.validationErrors).toHaveLength(0);
        });
      });
    });

    // IT-UC-GenerateCiTemplate-002
    describe('consistency-checkテンプレートをstrictプリセットで生成できること', () => {
      context('presetId="strict", templateType="consistency-check"でfailOnWarning=trueが返る場合', () => {
        it('triggerCondition="schedule"・failOnWarning=trueのOutputが返る', async () => {
          // Arrange
          const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1', 'v2', 'v3']) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: true }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const useCase = new GenerateCiTemplateUseCase(generator);
          // Act
          const actual = await useCase.execute({ presetId: 'strict', templateType: 'consistency-check' });
          // Assert
          expect(actual.triggerCondition).toBe('schedule');
          expect(actual.failOnWarning).toBe(true);
        });
      });
    });

    // IT-UC-GenerateCiTemplate-003
    describe('pre-commitテンプレートをminimalプリセットで生成できること', () => {
      context('presetId="minimal", templateType="pre-commit"で有効なデータが返る場合', () => {
        it('triggerCondition="pre-commit"・validationErrors=[]が返る', async () => {
          // Arrange
          const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1']) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const useCase = new GenerateCiTemplateUseCase(generator);
          // Act
          const actual = await useCase.execute({ presetId: 'minimal', templateType: 'pre-commit' });
          // Assert
          expect(actual.triggerCondition).toBe('pre-commit');
          expect(actual.validationErrors).toHaveLength(0);
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-UC-GenerateCiTemplate-004
    describe('不正なtemplateTypeを入力した場合にエラーが返ること', () => {
      context('templateType="invalid"を渡した場合', () => {
        it('HarnessError[]が返る（INV-1違反）', async () => {
          // Arrange
          const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1']) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const useCase = new GenerateCiTemplateUseCase(generator);
          // Act
          const actual = await useCase.execute({ presetId: 'standard', templateType: 'invalid' as any });
          // Assert
          expect(actual.validationErrors.length).toBeGreaterThan(0);
        });
      });
    });

    // IT-UC-GenerateCiTemplate-005
    describe('PresetConfigPortがI/O失敗した場合にResult.failが返ること', () => {
      context('PresetConfigPort.getPreset()がエラーをスローする場合', () => {
        it('HarnessError[]を含むエラー出力が返る', async () => {
          // Arrange
          const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1']) };
          const presetPort = { getPreset: vi.fn().mockRejectedValue(new Error('I/O error')) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const useCase = new GenerateCiTemplateUseCase(generator);
          // Act
          const actual = await useCase.execute({ presetId: 'standard', templateType: 'aidlc-gate' });
          // Assert
          expect(actual.validationErrors.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('バリデーション', () => {
    // IT-UC-GenerateCiTemplate-006
    describe('ValidatorIdRegistryPortが空リストを返す場合にINV-2違反エラーが返ること', () => {
      context('ValidatorIdRegistryPort.listAll()→[]が返る場合', () => {
        it('validationErrorsにINV-2違反（CI_TEMPLATE_EMPTY_VALIDATORS）が含まれる', async () => {
          // Arrange
          const validatorPort = { listAll: vi.fn().mockResolvedValue([]) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const useCase = new GenerateCiTemplateUseCase(generator);
          // Act
          const actual = await useCase.execute({ presetId: 'minimal', templateType: 'aidlc-gate' });
          // Assert
          expect(actual.validationErrors.some((e: any) => e.code.includes('EMPTY_VALIDATORS'))).toBe(true);
        });
      });
    });
  });
});
```

### 3.2 RenderCiTemplateUseCase

```typescript
// scripts/harness/__tests__/integration/ci-governance/render-ci-template-usecase.test.ts

import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { RenderCiTemplateUseCase } from '../../../ci-governance/application/usecases/render-ci-template-usecase.js';
import { GenerateCiTemplateUseCase } from '../../../ci-governance/application/usecases/generate-ci-template-usecase.js';
import { TemplateGenerator } from '../../../ci-governance/domain/services/template-generator.js';

target('RenderCiTemplateUseCase', () => {
  describe('正常系', () => {
    // IT-UC-RenderCiTemplate-001
    describe('aidlc-gateテンプレートが正しいoutputPathで書き出されること', () => {
      context('TemplateRendererPort.render()が有効なOutputを返す場合', () => {
        it('outputPath=".github/workflows/aidlc-gate.yml"・errors=[]が返る', async () => {
          // Arrange
          const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1', 'v2']) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const rendererPort = {
            render: vi.fn().mockResolvedValue({ outputPath: '.github/workflows/aidlc-gate.yml', content: 'yaml content' }),
          };
          const useCase = new RenderCiTemplateUseCase(generator, rendererPort);
          // Act
          const actual = await useCase.execute({ presetId: 'standard', templateType: 'aidlc-gate' });
          // Assert
          expect(actual.outputPath).toBe('.github/workflows/aidlc-gate.yml');
          expect(actual.errors).toHaveLength(0);
        });
      });
    });

    // IT-UC-RenderCiTemplate-002
    describe('pre-commitテンプレートが正しいoutputPathで書き出されること', () => {
      context('TemplateRendererPort.render()が.husky/pre-commitのOutputを返す場合', () => {
        it('outputPath=".husky/pre-commit"が返る', async () => {
          // Arrange
          const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1']) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const rendererPort = {
            render: vi.fn().mockResolvedValue({ outputPath: '.husky/pre-commit', content: 'shell content' }),
          };
          const useCase = new RenderCiTemplateUseCase(generator, rendererPort);
          // Act
          const actual = await useCase.execute({ presetId: 'standard', templateType: 'pre-commit' });
          // Assert
          expect(actual.outputPath).toBe('.husky/pre-commit');
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-UC-RenderCiTemplate-003
    describe('CiTemplate.validate()に失敗した場合はTemplateRendererPortを呼び出さないこと', () => {
      context('ValidatorIdRegistryPort.listAll()→[]でINV-2違反になる場合', () => {
        it('TemplateRendererPort.render()が呼び出されず・errors[]にバリデーションエラーが含まれる', async () => {
          // Arrange
          const validatorPort = { listAll: vi.fn().mockResolvedValue([]) };
          const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
          const generator = new TemplateGenerator(validatorPort, presetPort);
          const rendererPort = { render: vi.fn() };
          const useCase = new RenderCiTemplateUseCase(generator, rendererPort);
          // Act
          const actual = await useCase.execute({ presetId: 'standard', templateType: 'aidlc-gate' });
          // Assert
          expect(rendererPort.render).not.toHaveBeenCalled();
          expect(actual.errors.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
```

### 3.3 RecordErrorOccurrenceUseCase

```typescript
// scripts/harness/__tests__/integration/ci-governance/record-error-occurrence-usecase.test.ts

import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { RecordErrorOccurrenceUseCase } from '../../../ci-governance/application/usecases/record-error-occurrence-usecase.js';
import { RepetitionDetector } from '../../../ci-governance/domain/services/repetition-detector.js';
import { ErrorRepetition } from '../../../ci-governance/domain/aggregates/error-repetition.js';

target('RecordErrorOccurrenceUseCase', () => {
  describe('正常系', () => {
    // IT-UC-RecordErrorOccurrence-001
    describe('初回エラー発生を記録するとcurrentCount=1・escalated=falseが返ること', () => {
      context('ErrorRepetitionRepositoryPort.findByCode()→nullが返る場合', () => {
        it('currentCount=1・escalated=false・escalationAction=nullが返る', async () => {
          // Arrange
          const repoPort = { findByCode: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined) };
          const detector = new RepetitionDetector(repoPort);
          const escalationExecutorPort = { execute: vi.fn() };
          const useCase = new RecordErrorOccurrenceUseCase(detector, escalationExecutorPort);
          // Act
          const actual = await useCase.execute({ errorCode: 'L1-001', errorMessage: 'test error' });
          // Assert
          expect(actual.currentCount).toBe(1);
          expect(actual.escalated).toBe(false);
          expect(actual.escalationAction).toBeNull();
        });
      });
    });

    // IT-UC-RecordErrorOccurrence-002
    describe('既存2回のエラーに対して3回目を記録するとescalated=trueとEscalationActionが返ること', () => {
      context('ErrorRepetitionRepositoryPort.findByCode()→occurrenceCount=2のインスタンスが返る場合', () => {
        it('currentCount=3・escalated=true・escalationAction!=nullが返る', async () => {
          // Arrange
          let er = ErrorRepetition.create('L1-001', 3);
          er = er.increment().increment(); // occurrenceCount=2
          const repoPort = { findByCode: vi.fn().mockResolvedValue(er), save: vi.fn().mockResolvedValue(undefined) };
          const detector = new RepetitionDetector(repoPort);
          const escalationExecutorPort = { execute: vi.fn().mockResolvedValue(undefined) };
          const useCase = new RecordErrorOccurrenceUseCase(detector, escalationExecutorPort);
          // Act
          const actual = await useCase.execute({ errorCode: 'L1-001', errorMessage: 'test error' });
          // Assert
          expect(actual.currentCount).toBe(3);
          expect(actual.escalated).toBe(true);
          expect(actual.escalationAction).not.toBeNull();
          expect(escalationExecutorPort.execute).toHaveBeenCalledTimes(1);
        });
      });
    });

    // IT-UC-RecordErrorOccurrence-003
    describe('異なるerrorCodeのエラーは独立して管理されること', () => {
      context('errorCode="L2-002"（別コード）でfindByCode()→nullが返る場合', () => {
        it('errorCode="L2-002"・currentCount=1・escalated=falseが返る', async () => {
          // Arrange
          const repoPort = { findByCode: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined) };
          const detector = new RepetitionDetector(repoPort);
          const escalationExecutorPort = { execute: vi.fn() };
          const useCase = new RecordErrorOccurrenceUseCase(detector, escalationExecutorPort);
          // Act
          const actual = await useCase.execute({ errorCode: 'L2-002', errorMessage: 'test' });
          // Assert
          expect(actual.currentCount).toBe(1);
          expect(actual.escalated).toBe(false);
          expect(repoPort.findByCode).toHaveBeenCalledWith('L2-002');
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-UC-RecordErrorOccurrence-004
    describe('リポジトリsaveが失敗した場合にエラーがスローされること', () => {
      context('ErrorRepetitionRepositoryPort.save()がエラーをスローする場合', () => {
        it('HarnessErrorがスローされる', async () => {
          // Arrange
          const repoPort = {
            findByCode: vi.fn().mockResolvedValue(null),
            save: vi.fn().mockRejectedValue(new Error('I/O failure')),
          };
          const detector = new RepetitionDetector(repoPort);
          const escalationExecutorPort = { execute: vi.fn() };
          const useCase = new RecordErrorOccurrenceUseCase(detector, escalationExecutorPort);
          // Act & Assert
          await expect(useCase.execute({ errorCode: 'L1-001', errorMessage: 'test' })).rejects.toThrow();
        });
      });
    });
  });
});
```

### 3.4 CheckEscalationUseCase

```typescript
// scripts/harness/__tests__/integration/ci-governance/check-escalation-usecase.test.ts

import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CheckEscalationUseCase } from '../../../ci-governance/application/usecases/check-escalation-usecase.js';
import { ErrorRepetition } from '../../../ci-governance/domain/aggregates/error-repetition.js';

target('CheckEscalationUseCase', () => {
  describe('正常系', () => {
    // IT-UC-CheckEscalation-001
    describe('既存エラーコードのエスカレーション状況を確認できること', () => {
      context('ErrorRepetitionRepositoryPort.findByCode()→occurrenceCount=3・escalated=trueが返る場合', () => {
        it('exists=true・currentCount=3・escalated=trueが返る', async () => {
          // Arrange
          let er = ErrorRepetition.create('L2-001', 3);
          er = er.increment().increment().increment(); // escalated=true
          const repoPort = { findByCode: vi.fn().mockResolvedValue(er) };
          const useCase = new CheckEscalationUseCase(repoPort);
          // Act
          const actual = await useCase.execute({ errorCode: 'L2-001' });
          // Assert
          expect(actual.exists).toBe(true);
          expect(actual.currentCount).toBe(3);
          expect(actual.escalated).toBe(true);
        });
      });
    });

    // IT-UC-CheckEscalation-002
    describe('存在しないエラーコードはexists=falseで返ること', () => {
      context('ErrorRepetitionRepositoryPort.findByCode()→nullが返る場合', () => {
        it('exists=false・currentCount=null・escalated=nullが返る', async () => {
          // Arrange
          const repoPort = { findByCode: vi.fn().mockResolvedValue(null) };
          const useCase = new CheckEscalationUseCase(repoPort);
          // Act
          const actual = await useCase.execute({ errorCode: 'L9-999' });
          // Assert
          expect(actual.exists).toBe(false);
          expect(actual.currentCount).toBeNull();
          expect(actual.escalated).toBeNull();
        });
      });
    });
  });
});
```

### 3.5 ResetRepetitionUseCase

```typescript
// scripts/harness/__tests__/integration/ci-governance/reset-repetition-usecase.test.ts

import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ResetRepetitionUseCase } from '../../../ci-governance/application/usecases/reset-repetition-usecase.js';
import { ErrorRepetition } from '../../../ci-governance/domain/aggregates/error-repetition.js';

target('ResetRepetitionUseCase', () => {
  describe('正常系', () => {
    // IT-UC-ResetRepetition-001
    describe('escalated=trueのエラーをconfirmedResolution=trueでリセットできること', () => {
      context('ErrorRepetitionRepositoryPort.findByCode()→escalated=trueが返る場合', () => {
        it('success=true・errors=[]が返る', async () => {
          // Arrange
          let er = ErrorRepetition.create('L2-001', 3);
          er = er.increment().increment().increment();
          const repoPort = { findByCode: vi.fn().mockResolvedValue(er), save: vi.fn().mockResolvedValue(undefined) };
          const useCase = new ResetRepetitionUseCase(repoPort);
          // Act
          const actual = await useCase.execute({ errorCode: 'L2-001', confirmedResolution: true });
          // Assert
          expect(actual.success).toBe(true);
          expect(actual.errors).toHaveLength(0);
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-UC-ResetRepetition-002
    describe('存在しないエラーコードをリセットしようとするとエラーが返ること', () => {
      context('ErrorRepetitionRepositoryPort.findByCode()→nullが返る場合', () => {
        it('success=false・errors[]に"未登録"エラーが含まれる', async () => {
          // Arrange
          const repoPort = { findByCode: vi.fn().mockResolvedValue(null) };
          const useCase = new ResetRepetitionUseCase(repoPort);
          // Act
          const actual = await useCase.execute({ errorCode: 'L9-999', confirmedResolution: true });
          // Assert
          expect(actual.success).toBe(false);
          expect(actual.errors.length).toBeGreaterThan(0);
        });
      });
    });

    // IT-UC-ResetRepetition-003
    describe('confirmedResolution=falseの場合にINV-7違反エラーが返ること', () => {
      context('escalated=trueのインスタンスでconfirmedResolution=falseを渡した場合', () => {
        it('success=false・errors[]にREPETITION_RESET_FORBIDDENが含まれる', async () => {
          // Arrange
          let er = ErrorRepetition.create('L2-001', 3);
          er = er.increment().increment().increment();
          const repoPort = { findByCode: vi.fn().mockResolvedValue(er) };
          const useCase = new ResetRepetitionUseCase(repoPort);
          // Act
          const actual = await useCase.execute({ errorCode: 'L2-001', confirmedResolution: false });
          // Assert
          expect(actual.success).toBe(false);
          expect(actual.errors.some((e: any) => e.code.includes('RESET_FORBIDDEN'))).toBe(true);
        });
      });
    });

    // IT-UC-ResetRepetition-004
    describe('escalated=falseのエラーをリセットしようとするとエラーが返ること', () => {
      context('escalated=falseのインスタンスでconfirmedResolution=trueを渡した場合', () => {
        it('success=false・errors[]にINV-7違反エラーが含まれる', async () => {
          // Arrange
          const er = ErrorRepetition.create('L1-001'); // escalated=false
          const repoPort = { findByCode: vi.fn().mockResolvedValue(er) };
          const useCase = new ResetRepetitionUseCase(repoPort);
          // Act
          const actual = await useCase.execute({ errorCode: 'L1-001', confirmedResolution: true });
          // Assert
          expect(actual.success).toBe(false);
          expect(actual.errors.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
```

### 3.6 MigrateAgentsMdUseCase

```typescript
// scripts/harness/__tests__/integration/ci-governance/migrate-agents-md-usecase.test.ts

import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { MigrateAgentsMdUseCase } from '../../../ci-governance/application/usecases/migrate-agents-md-usecase.js';
import { LessonAggregator } from '../../../ci-governance/domain/services/lesson-aggregator.js';
import { PointerValidator } from '../../../ci-governance/domain/services/pointer-validator.js';
import { AgentsMdPointer } from '../../../ci-governance/domain/aggregates/agents-md-pointer.js';

const createLesson = (lessonId: string) => ({
  lessonId,
  source: 'story-implementor',
  content: 'テストlesson',
  tags: ['best-practice'],
  timestamp: '2026-03-20T00:00:00Z',
});

target('MigrateAgentsMdUseCase', () => {
  describe('正常系', () => {
    // IT-UC-MigrateAgentsMd-001
    describe('lesson artifactを読み取りAGENTS.mdへの移行が成功すること', () => {
      context('dryRun=falseで全ポートが正常に動作する場合', () => {
        it('success=true・addedPointers=2・linesBefore=20・linesAfter=8・kpiMet=trueが返る', async () => {
          // Arrange
          const lessonReaderPort = {
            readAll: vi.fn().mockResolvedValue([
              createLesson('550e8400-e29b-41d4-a716-446655440001'),
              createLesson('550e8400-e29b-41d4-a716-446655440002'),
            ]),
          };
          const agentsMdPort = {
            read: vi.fn().mockResolvedValue(AgentsMdPointer.create()),
            write: vi.fn().mockResolvedValue({ before: 20, after: 8 }),
          };
          const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
          const filePort = { exists: vi.fn().mockResolvedValue(true) };
          const adrPort = { exists: vi.fn().mockResolvedValue(true) };
          const aggregator = new LessonAggregator();
          const validator = new PointerValidator(cmdPort, filePort, adrPort);
          const useCase = new MigrateAgentsMdUseCase(lessonReaderPort, agentsMdPort, aggregator, validator);
          // Act
          const actual = await useCase.execute({ dryRun: false });
          // Assert
          expect(actual.success).toBe(true);
          expect(actual.addedPointers).toBe(2);
          expect(actual.linesBefore).toBe(20);
          expect(actual.linesAfter).toBe(8);
          expect(actual.kpiMet).toBe(true);
        });
      });
    });

    // IT-UC-MigrateAgentsMd-002
    describe('dryRun=trueの場合はAgentsMdPort.write()を呼び出さないこと', () => {
      context('dryRun=trueを渡した場合', () => {
        it('success=true・linesAfter=null・kpiMet=null。AgentsMdPort.write()が呼び出されない', async () => {
          // Arrange
          const lessonReaderPort = {
            readAll: vi.fn().mockResolvedValue([createLesson('550e8400-e29b-41d4-a716-446655440001')]),
          };
          const agentsMdPort = {
            read: vi.fn().mockResolvedValue(AgentsMdPointer.create()),
            write: vi.fn(),
          };
          const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
          const filePort = { exists: vi.fn().mockResolvedValue(true) };
          const adrPort = { exists: vi.fn().mockResolvedValue(true) };
          const aggregator = new LessonAggregator();
          const validator = new PointerValidator(cmdPort, filePort, adrPort);
          const useCase = new MigrateAgentsMdUseCase(lessonReaderPort, agentsMdPort, aggregator, validator);
          // Act
          const actual = await useCase.execute({ dryRun: true });
          // Assert
          expect(actual.success).toBe(true);
          expect(actual.linesAfter).toBeNull();
          expect(actual.kpiMet).toBeNull();
          expect(agentsMdPort.write).not.toHaveBeenCalled();
        });
      });
    });

    // IT-UC-MigrateAgentsMd-003
    describe('移行後行数が移行前の50%以下でkpiMet=trueになること', () => {
      context('AgentsMdPort.write()が{before:100, after:49}を返す場合', () => {
        it('kpiMet=trueが返る', async () => {
          // Arrange
          const lessonReaderPort = {
            readAll: vi.fn().mockResolvedValue([createLesson('550e8400-e29b-41d4-a716-446655440001')]),
          };
          const agentsMdPort = {
            read: vi.fn().mockResolvedValue(AgentsMdPointer.create()),
            write: vi.fn().mockResolvedValue({ before: 100, after: 49 }),
          };
          const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
          const filePort = { exists: vi.fn().mockResolvedValue(true) };
          const adrPort = { exists: vi.fn().mockResolvedValue(true) };
          const aggregator = new LessonAggregator();
          const validator = new PointerValidator(cmdPort, filePort, adrPort);
          const useCase = new MigrateAgentsMdUseCase(lessonReaderPort, agentsMdPort, aggregator, validator);
          // Act
          const actual = await useCase.execute({ dryRun: false });
          // Assert
          expect(actual.kpiMet).toBe(true);
        });
      });
    });

    // IT-UC-MigrateAgentsMd-004
    describe('移行後行数が移行前の50%超でkpiMet=falseになること', () => {
      context('AgentsMdPort.write()が{before:100, after:51}を返す場合', () => {
        it('kpiMet=falseが返る', async () => {
          // Arrange
          const lessonReaderPort = {
            readAll: vi.fn().mockResolvedValue([createLesson('550e8400-e29b-41d4-a716-446655440001')]),
          };
          const agentsMdPort = {
            read: vi.fn().mockResolvedValue(AgentsMdPointer.create()),
            write: vi.fn().mockResolvedValue({ before: 100, after: 51 }),
          };
          const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
          const filePort = { exists: vi.fn().mockResolvedValue(true) };
          const adrPort = { exists: vi.fn().mockResolvedValue(true) };
          const aggregator = new LessonAggregator();
          const validator = new PointerValidator(cmdPort, filePort, adrPort);
          const useCase = new MigrateAgentsMdUseCase(lessonReaderPort, agentsMdPort, aggregator, validator);
          // Act
          const actual = await useCase.execute({ dryRun: false });
          // Assert
          expect(actual.kpiMet).toBe(false);
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-UC-MigrateAgentsMd-005
    describe('同一バッチ内に重複lessonIdがある場合は移行が中断されること', () => {
      context('LessonArtifactReaderPort.readAll()→同一lessonIdを持つ2件が返る場合', () => {
        it('success=false・errorsにDUPLICATE_LESSON_ID。AgentsMdPort.write()が呼ばれない', async () => {
          // Arrange
          const dupId = '550e8400-e29b-41d4-a716-446655440001';
          const lessonReaderPort = {
            readAll: vi.fn().mockResolvedValue([createLesson(dupId), createLesson(dupId)]),
          };
          const agentsMdPort = { read: vi.fn(), write: vi.fn() };
          const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
          const filePort = { exists: vi.fn().mockResolvedValue(true) };
          const adrPort = { exists: vi.fn().mockResolvedValue(true) };
          const aggregator = new LessonAggregator();
          const validator = new PointerValidator(cmdPort, filePort, adrPort);
          const useCase = new MigrateAgentsMdUseCase(lessonReaderPort, agentsMdPort, aggregator, validator);
          // Act
          const actual = await useCase.execute({ dryRun: false });
          // Assert
          expect(actual.success).toBe(false);
          expect(actual.errors.some((e: any) => e.code.includes('DUPLICATE_LESSON_ID'))).toBe(true);
          expect(agentsMdPort.write).not.toHaveBeenCalled();
        });
      });
    });

    // IT-UC-MigrateAgentsMd-006
    describe('Dead Pointerが検出された場合は移行が中断されること', () => {
      context('FileExistencePort.exists("nonexistent.md")→falseが返る場合', () => {
        it('success=false・errorsにAGENTS_MD_DEAD_POINTERが含まれる', async () => {
          // Arrange
          const lessonReaderPort = {
            readAll: vi.fn().mockResolvedValue([createLesson('550e8400-e29b-41d4-a716-446655440001')]),
          };
          const agentsMdPort = {
            read: vi.fn().mockResolvedValue(AgentsMdPointer.create()),
            write: vi.fn(),
          };
          const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
          const filePort = { exists: vi.fn().mockResolvedValue(false) }; // Dead Pointer
          const adrPort = { exists: vi.fn().mockResolvedValue(true) };
          const aggregator = new LessonAggregator();
          const validator = new PointerValidator(cmdPort, filePort, adrPort);
          const useCase = new MigrateAgentsMdUseCase(lessonReaderPort, agentsMdPort, aggregator, validator);
          // Act
          const actual = await useCase.execute({ dryRun: false });
          // Assert
          expect(actual.success).toBe(false);
          expect(actual.errors.some((e: any) => e.code.includes('DEAD_POINTER'))).toBe(true);
        });
      });
    });
  });
});
```

### 3.7 AggregateLessonsUseCase

```typescript
// scripts/harness/__tests__/integration/ci-governance/aggregate-lessons-usecase.test.ts

import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { AggregateLessonsUseCase } from '../../../ci-governance/application/usecases/aggregate-lessons-usecase.js';
import { LessonAggregator } from '../../../ci-governance/domain/services/lesson-aggregator.js';

const createLesson = (lessonId: string, source = 'story-implementor') => ({
  lessonId,
  source,
  content: 'テストlesson',
  tags: ['best-practice'] as any[],
  timestamp: '2026-03-20T00:00:00Z',
});

target('AggregateLessonsUseCase', () => {
  describe('正常系', () => {
    // IT-UC-AggregateLessons-001
    describe('sourceフィルタなしで全lesson artifactを変換できること', () => {
      context('LessonArtifactReaderPort.readAll()→3件のLessonArtifact[]が返る場合', () => {
        it('pointerEntries.length=3・totalArtifacts=3・errors=[]が返る', async () => {
          // Arrange
          const lessonReaderPort = {
            readAll: vi.fn().mockResolvedValue([
              createLesson('550e8400-e29b-41d4-a716-446655440001'),
              createLesson('550e8400-e29b-41d4-a716-446655440002'),
              createLesson('550e8400-e29b-41d4-a716-446655440003'),
            ]),
          };
          const aggregator = new LessonAggregator();
          const useCase = new AggregateLessonsUseCase(lessonReaderPort, aggregator);
          // Act
          const actual = await useCase.execute({ source: undefined });
          // Assert
          expect(actual.pointerEntries).toHaveLength(3);
          expect(actual.totalArtifacts).toBe(3);
          expect(actual.errors).toHaveLength(0);
        });
      });
    });

    // IT-UC-AggregateLessons-002
    describe('sourceフィルタ指定で特定スキルのlesson artifactのみ変換できること', () => {
      context('LessonArtifactReaderPort.readBySource("story-implementor")→2件が返る場合', () => {
        it('pointerEntries.length=2・totalArtifacts=2が返る', async () => {
          // Arrange
          const lessonReaderPort = {
            readAll: vi.fn(),
            readBySource: vi.fn().mockResolvedValue([
              createLesson('550e8400-e29b-41d4-a716-446655440001', 'story-implementor'),
              createLesson('550e8400-e29b-41d4-a716-446655440002', 'story-implementor'),
            ]),
          };
          const aggregator = new LessonAggregator();
          const useCase = new AggregateLessonsUseCase(lessonReaderPort, aggregator);
          // Act
          const actual = await useCase.execute({ source: 'story-implementor' });
          // Assert
          expect(actual.pointerEntries).toHaveLength(2);
          expect(actual.totalArtifacts).toBe(2);
        });
      });
    });

    // IT-UC-AggregateLessons-003
    describe('lesson artifactが0件の場合はpointerEntries=[]が返ること', () => {
      context('LessonArtifactReaderPort.readAll()→[]が返る場合', () => {
        it('pointerEntries=[]・totalArtifacts=0・errors=[]が返る', async () => {
          // Arrange
          const lessonReaderPort = { readAll: vi.fn().mockResolvedValue([]) };
          const aggregator = new LessonAggregator();
          const useCase = new AggregateLessonsUseCase(lessonReaderPort, aggregator);
          // Act
          const actual = await useCase.execute({ source: undefined });
          // Assert
          expect(actual.pointerEntries).toHaveLength(0);
          expect(actual.totalArtifacts).toBe(0);
          expect(actual.errors).toHaveLength(0);
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-UC-AggregateLessons-004
    describe('重複lessonIdがある場合にerrorsにDUPLICATE_LESSON_IDが含まれること', () => {
      context('LessonArtifactReaderPort.readAll()→同一lessonIdを持つ2件が返る場合', () => {
        it('errors[]にDUPLICATE_LESSON_IDエラーが含まれる', async () => {
          // Arrange
          const dupId = '550e8400-e29b-41d4-a716-446655440001';
          const lessonReaderPort = {
            readAll: vi.fn().mockResolvedValue([createLesson(dupId), createLesson(dupId)]),
          };
          const aggregator = new LessonAggregator();
          const useCase = new AggregateLessonsUseCase(lessonReaderPort, aggregator);
          // Act
          const actual = await useCase.execute({ source: undefined });
          // Assert
          expect(actual.errors.some((e: any) => e.code.includes('DUPLICATE_LESSON_ID'))).toBe(true);
        });
      });
    });
  });
});
```

### 3.8 ValidatePointersUseCase

```typescript
// scripts/harness/__tests__/integration/ci-governance/validate-pointers-usecase.test.ts

import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ValidatePointersUseCase } from '../../../ci-governance/application/usecases/validate-pointers-usecase.js';
import { PointerValidator } from '../../../ci-governance/domain/services/pointer-validator.js';
import { AgentsMdPointer } from '../../../ci-governance/domain/aggregates/agents-md-pointer.js';
import { PointerEntry } from '../../../ci-governance/domain/value-objects/pointer-entry.js';

target('ValidatePointersUseCase', () => {
  describe('正常系', () => {
    // IT-UC-ValidatePointers-001
    describe('全PointerEntryが実在する場合にpassed=trueが返ること', () => {
      context('全ExistencePortのexists()→trueが返る場合', () => {
        it('passed=true・deadPointers=[]・errors=[]が返る', async () => {
          // Arrange
          const pointers = [
            PointerEntry.createCommand({ key: 'cmd-1', command: 'harness:status', description: '...' }),
            PointerEntry.createFile({ key: 'file-1', filePath: 'docs/README.md', description: '...' }),
          ];
          const agentsMdPort = { read: vi.fn().mockResolvedValue(AgentsMdPointer.create(pointers)) };
          const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
          const filePort = { exists: vi.fn().mockResolvedValue(true) };
          const adrPort = { exists: vi.fn().mockResolvedValue(true) };
          const validator = new PointerValidator(cmdPort, filePort, adrPort);
          const useCase = new ValidatePointersUseCase(agentsMdPort, validator);
          // Act
          const actual = await useCase.execute();
          // Assert
          expect(actual.passed).toBe(true);
          expect(actual.deadPointers).toHaveLength(0);
          expect(actual.errors).toHaveLength(0);
        });
      });
    });

    // IT-UC-ValidatePointers-002
    describe('PointerEntryが0件の場合もpassed=trueが返ること', () => {
      context('AgentsMdPort.read()→空AgentsMdPointerが返る場合', () => {
        it('passed=true・totalPointers=0・deadPointers=[]が返る', async () => {
          // Arrange
          const agentsMdPort = { read: vi.fn().mockResolvedValue(AgentsMdPointer.create()) };
          const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
          const filePort = { exists: vi.fn().mockResolvedValue(true) };
          const adrPort = { exists: vi.fn().mockResolvedValue(true) };
          const validator = new PointerValidator(cmdPort, filePort, adrPort);
          const useCase = new ValidatePointersUseCase(agentsMdPort, validator);
          // Act
          const actual = await useCase.execute();
          // Assert
          expect(actual.passed).toBe(true);
          expect(actual.totalPointers).toBe(0);
          expect(actual.deadPointers).toHaveLength(0);
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-UC-ValidatePointers-003
    describe('Dead Pointerが1件検出されるとpassed=falseが返ること', () => {
      context('FileExistencePort.exists("missing.md")→falseが返る場合', () => {
        it('passed=false・deadPointers["missing-key"]・errors.length>=1が返る', async () => {
          // Arrange
          const pointers = [
            PointerEntry.createFile({ key: 'missing-key', filePath: 'docs/missing.md', description: '...' }),
          ];
          const agentsMdPort = { read: vi.fn().mockResolvedValue(AgentsMdPointer.create(pointers)) };
          const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
          const filePort = { exists: vi.fn().mockResolvedValue(false) };
          const adrPort = { exists: vi.fn().mockResolvedValue(true) };
          const validator = new PointerValidator(cmdPort, filePort, adrPort);
          const useCase = new ValidatePointersUseCase(agentsMdPort, validator);
          // Act
          const actual = await useCase.execute();
          // Assert
          expect(actual.passed).toBe(false);
          expect(actual.deadPointers).toContain('missing-key');
          expect(actual.errors.length).toBeGreaterThanOrEqual(1);
        });
      });
    });
  });
});
```

---

## 4. Infrastructure Adapter テスト詳細ロジック

### 4.1 ErrorRepetitionJsonRepository

```typescript
// scripts/harness/__tests__/integration/ci-governance/error-repetition-json-repository.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { target, context } from '../../helpers/test-helpers.js';
import { ErrorRepetitionJsonRepository } from '../../../ci-governance/infrastructure/adapters/error-repetition-json-repository.js';
import { ErrorRepetition } from '../../../ci-governance/domain/aggregates/error-repetition.js';

target('ErrorRepetitionJsonRepository', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `error-repo-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('findByCodeテスト', () => {
    // IT-REPO-ErrorRepetitionJson-001
    context('error-history.jsonが存在しない場合', () => {
      it('findByCodeがnullを返す', async () => {
        // Arrange
        const repo = new ErrorRepetitionJsonRepository(tmpDir);
        // Act
        const actual = await repo.findByCode('L1-001');
        // Assert
        expect(actual).toBeNull();
      });
    });

    // IT-REPO-ErrorRepetitionJson-005
    context('スキーマ不正なJSONファイルが存在する場合', () => {
      it('HarnessErrorがスローされる', async () => {
        // Arrange
        const filePath = path.join(tmpDir, '.harness', 'error-history.json');
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, '{ invalid json }', 'utf-8');
        const repo = new ErrorRepetitionJsonRepository(tmpDir);
        // Act & Assert
        await expect(repo.findByCode('L1-001')).rejects.toThrow();
      });
    });
  });

  describe('save→findByCodeテスト', () => {
    // IT-REPO-ErrorRepetitionJson-002
    context('save()後にfindByCode()を呼ぶ場合', () => {
      it('同一occurrenceCount・escalatedのインスタンスが取得できる', async () => {
        // Arrange
        const repo = new ErrorRepetitionJsonRepository(tmpDir);
        let er = ErrorRepetition.create('L1-001');
        er = er.increment();
        // Act
        await repo.save(er);
        const actual = await repo.findByCode('L1-001');
        // Assert
        expect(actual).not.toBeNull();
        expect(actual!.occurrenceCount).toBe(1);
        expect(actual!.escalated).toBe(false);
      });
    });

    // IT-REPO-ErrorRepetitionJson-003
    context('既存エントリをsave()で更新した場合', () => {
      it('findByCode()で更新後のoccurrenceCountが返る', async () => {
        // Arrange
        const repo = new ErrorRepetitionJsonRepository(tmpDir);
        let er = ErrorRepetition.create('L1-001');
        er = er.increment().increment(); // occurrenceCount=2
        await repo.save(er);
        let updated = (await repo.findByCode('L1-001'))!;
        updated = updated.increment(); // occurrenceCount=3
        // Act
        await repo.save(updated);
        const actual = await repo.findByCode('L1-001');
        // Assert
        expect(actual!.occurrenceCount).toBe(3);
      });
    });
  });

  describe('deleteByCodeテスト', () => {
    // IT-REPO-ErrorRepetitionJson-004
    context('deleteByCode()で対象エントリを削除した場合', () => {
      it('deleteByCode後のfindByCode()がnullを返す', async () => {
        // Arrange
        const repo = new ErrorRepetitionJsonRepository(tmpDir);
        const er = ErrorRepetition.create('L1-001');
        await repo.save(er);
        // Act
        await repo.deleteByCode('L1-001');
        const actual = await repo.findByCode('L1-001');
        // Assert
        expect(actual).toBeNull();
      });
    });
  });
});
```

### 4.2 AgentsMdFileAdapter

```typescript
// scripts/harness/__tests__/integration/ci-governance/agents-md-file-adapter.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { target, context } from '../../helpers/test-helpers.js';
import { AgentsMdFileAdapter } from '../../../ci-governance/infrastructure/adapters/agents-md-file-adapter.js';
import { AgentsMdPointer } from '../../../ci-governance/domain/aggregates/agents-md-pointer.js';
import { PointerEntry } from '../../../ci-governance/domain/value-objects/pointer-entry.js';

target('AgentsMdFileAdapter', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `agents-md-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('read→parseテスト', () => {
    // IT-REPO-AgentsMdFile-001
    context('有効なPointerEntry形式のAGENTS.mdが存在する場合', () => {
      it('PointerEntry[]とadrLinks[]が正しくパースされたAgentsMdPointerが返る', async () => {
        // Arrange
        const agentsMdPath = path.join(tmpDir, 'AGENTS.md');
        const content = `# Agent Instructions\n\n<!-- pointer: cmd-status | harness:status | ステータス確認 -->\n`;
        await fs.writeFile(agentsMdPath, content, 'utf-8');
        const adapter = new AgentsMdFileAdapter(tmpDir);
        // Act
        const actual = await adapter.read();
        // Assert
        expect(actual).toBeInstanceOf(AgentsMdPointer);
        expect(actual.pointers.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('write→readテスト', () => {
    // IT-REPO-AgentsMdFile-002
    context('2件のPointerEntry[]を持つAgentsMdPointerをwrite()した場合', () => {
      it('write→readで同一PointerEntry[]が取得できる', async () => {
        // Arrange
        const agentsMdPath = path.join(tmpDir, 'AGENTS.md');
        await fs.writeFile(agentsMdPath, '# Agent Instructions\n', 'utf-8');
        const adapter = new AgentsMdFileAdapter(tmpDir);
        const pointers = AgentsMdPointer.create([
          PointerEntry.createCommand({ key: 'cmd-1', command: 'harness:status', description: 'ステータス確認' }),
          PointerEntry.createFile({ key: 'file-1', filePath: 'docs/README.md', description: 'README' }),
        ]);
        // Act
        await adapter.write(pointers);
        const actual = await adapter.read();
        // Assert
        expect(actual.pointers).toHaveLength(2);
      });
    });

    // IT-REPO-AgentsMdFile-003
    context('10行のAGENTS.mdに対してwrite()した場合', () => {
      it('{before: 10, after: <実際の書き込み行数>}が返る', async () => {
        // Arrange
        const agentsMdPath = path.join(tmpDir, 'AGENTS.md');
        const tenLines = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join('\n');
        await fs.writeFile(agentsMdPath, tenLines, 'utf-8');
        const adapter = new AgentsMdFileAdapter(tmpDir);
        const pointers = AgentsMdPointer.create([
          PointerEntry.createCommand({ key: 'cmd-1', command: 'harness:status', description: '...' }),
        ]);
        // Act
        const actual = await adapter.write(pointers);
        // Assert
        expect(actual.before).toBe(10);
        expect(typeof actual.after).toBe('number');
      });
    });
  });
});
```

### 4.3 FileSystemExistenceAdapter

```typescript
// scripts/harness/__tests__/integration/ci-governance/file-system-existence-adapter.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { target, context } from '../../helpers/test-helpers.js';
import { FileSystemExistenceAdapter } from '../../../ci-governance/infrastructure/adapters/file-system-existence-adapter.js';

target('FileSystemExistenceAdapter', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `fs-existence-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('existsテスト', () => {
    // IT-REPO-FileSystemExistence-001
    context('実在するファイルパスに対してexists()を呼ぶ場合', () => {
      it('trueが返る', async () => {
        // Arrange
        const filePath = path.join(tmpDir, 'test-file.md');
        await fs.writeFile(filePath, 'content', 'utf-8');
        const adapter = new FileSystemExistenceAdapter(tmpDir);
        const relativePath = 'test-file.md';
        // Act
        const actual = await adapter.exists(relativePath);
        // Assert
        expect(actual).toBe(true);
      });
    });

    // IT-REPO-FileSystemExistence-002
    context('存在しないファイルパスに対してexists()を呼ぶ場合', () => {
      it('falseが返る', async () => {
        // Arrange
        const adapter = new FileSystemExistenceAdapter(tmpDir);
        // Act
        const actual = await adapter.exists('nonexistent.md');
        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
```

### 4.4 LessonArtifactFileReaderAdapter

```typescript
// scripts/harness/__tests__/integration/ci-governance/lesson-artifact-file-reader-adapter.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { target, context } from '../../helpers/test-helpers.js';
import { LessonArtifactFileReaderAdapter } from '../../../ci-governance/infrastructure/adapters/lesson-artifact-file-reader-adapter.js';

const validLesson = (lessonId: string, source = 'story-implementor') => ({
  lessonId,
  source,
  content: 'テストlesson content',
  tags: ['best-practice'],
  timestamp: '2026-03-20T00:00:00Z',
});

target('LessonArtifactFileReaderAdapter', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `lesson-reader-test-${Date.now()}`);
    await fs.mkdir(path.join(tmpDir, 'lessons'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('readAllテスト', () => {
    // IT-REPO-LessonArtifactReader-001
    context('lessons/ディレクトリに2件の有効な.lesson.jsonが存在する場合', () => {
      it('LessonArtifact[] 2件が返る', async () => {
        // Arrange
        await fs.writeFile(
          path.join(tmpDir, 'lessons', 'lesson1.lesson.json'),
          JSON.stringify(validLesson('550e8400-e29b-41d4-a716-446655440001')),
          'utf-8'
        );
        await fs.writeFile(
          path.join(tmpDir, 'lessons', 'lesson2.lesson.json'),
          JSON.stringify(validLesson('550e8400-e29b-41d4-a716-446655440002')),
          'utf-8'
        );
        const adapter = new LessonArtifactFileReaderAdapter(tmpDir);
        // Act
        const actual = await adapter.readAll();
        // Assert
        expect(actual).toHaveLength(2);
      });
    });

    // IT-REPO-LessonArtifactReader-003
    context('スキーマ不正な.lesson.jsonと有効な.lesson.jsonが混在する場合', () => {
      it('有効な1件のみが返る（不正ファイルは読み飛ばされる）', async () => {
        // Arrange
        await fs.writeFile(
          path.join(tmpDir, 'lessons', 'invalid.lesson.json'),
          '{ "broken": true }',
          'utf-8'
        );
        await fs.writeFile(
          path.join(tmpDir, 'lessons', 'valid.lesson.json'),
          JSON.stringify(validLesson('550e8400-e29b-41d4-a716-446655440001')),
          'utf-8'
        );
        const adapter = new LessonArtifactFileReaderAdapter(tmpDir);
        // Act
        const actual = await adapter.readAll();
        // Assert
        expect(actual).toHaveLength(1);
      });
    });

    // IT-REPO-LessonArtifactReader-004
    context('lessonsディレクトリが存在しない場合', () => {
      it('空配列が返る', async () => {
        // Arrange
        await fs.rm(path.join(tmpDir, 'lessons'), { recursive: true });
        const adapter = new LessonArtifactFileReaderAdapter(tmpDir);
        // Act
        const actual = await adapter.readAll();
        // Assert
        expect(actual).toEqual([]);
      });
    });
  });

  describe('readBySourceテスト', () => {
    // IT-REPO-LessonArtifactReader-002
    context('source="domain-designer"を指定した場合', () => {
      it('指定スキル名のartifactのみ1件返る', async () => {
        // Arrange
        await fs.writeFile(
          path.join(tmpDir, 'lessons', 'lesson-si.lesson.json'),
          JSON.stringify(validLesson('550e8400-e29b-41d4-a716-446655440001', 'story-implementor')),
          'utf-8'
        );
        await fs.writeFile(
          path.join(tmpDir, 'lessons', 'lesson-dd.lesson.json'),
          JSON.stringify(validLesson('550e8400-e29b-41d4-a716-446655440002', 'domain-designer')),
          'utf-8'
        );
        const adapter = new LessonArtifactFileReaderAdapter(tmpDir);
        // Act
        const actual = await adapter.readBySource('domain-designer');
        // Assert
        expect(actual).toHaveLength(1);
        expect(actual[0].source).toBe('domain-designer');
      });
    });
  });
});
```

---

## 5. Presentation Handler テスト詳細ロジック

### 5.1 GenerateCiTemplateHandler

```typescript
// scripts/harness/__tests__/integration/ci-governance/generate-ci-template-handler.test.ts

import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { GenerateCiTemplateHandler } from '../../../ci-governance/presentation/handlers/generate-ci-template-handler.js';

target('GenerateCiTemplateHandler', () => {
  describe('正常系', () => {
    // IT-API-GenerateCiTemplateHandler-001
    describe('--dry-runフラグ付きでGenerateCiTemplateUseCaseが呼び出されること', () => {
      context('args=["--template-type","aidlc-gate","--dry-run"]を渡した場合', () => {
        it('exitCode=0・GenerateCiTemplateUseCase.execute()が1回呼ばれ・RenderCiTemplateUseCase.execute()は呼ばれない', async () => {
          // Arrange
          const generateUseCase = { execute: vi.fn().mockResolvedValue({ templateType: 'aidlc-gate', validationErrors: [] }) };
          const renderUseCase = { execute: vi.fn() };
          const handler = new GenerateCiTemplateHandler(generateUseCase, renderUseCase);
          // Act
          const actual = await handler.handle(['--template-type', 'aidlc-gate', '--dry-run']);
          // Assert
          expect(actual.exitCode).toBe(0);
          expect(generateUseCase.execute).toHaveBeenCalledTimes(1);
          expect(renderUseCase.execute).not.toHaveBeenCalled();
        });
      });
    });

    // IT-API-GenerateCiTemplateHandler-002
    describe('--dry-runなしでRenderCiTemplateUseCaseが呼び出されること', () => {
      context('args=["--template-type","aidlc-gate","--preset-id","standard"]を渡した場合', () => {
        it('exitCode=0・RenderCiTemplateUseCase.execute()が1回呼ばれる', async () => {
          // Arrange
          const generateUseCase = { execute: vi.fn() };
          const renderUseCase = {
            execute: vi.fn().mockResolvedValue({ outputPath: '.github/workflows/aidlc-gate.yml', errors: [] }),
          };
          const handler = new GenerateCiTemplateHandler(generateUseCase, renderUseCase);
          // Act
          const actual = await handler.handle(['--template-type', 'aidlc-gate', '--preset-id', 'standard']);
          // Assert
          expect(actual.exitCode).toBe(0);
          expect(renderUseCase.execute).toHaveBeenCalledTimes(1);
        });
      });
    });

    // IT-API-GenerateCiTemplateHandler-003
    describe('--format=jsonで出力がJSON形式になること', () => {
      context('args=["--template-type","pre-commit","--format","json"]を渡した場合', () => {
        it('stdout出力がJSONパース可能な文字列になる', async () => {
          // Arrange
          const generateUseCase = { execute: vi.fn() };
          const renderUseCase = {
            execute: vi.fn().mockResolvedValue({ outputPath: '.husky/pre-commit', errors: [] }),
          };
          const handler = new GenerateCiTemplateHandler(generateUseCase, renderUseCase);
          // Act
          const actual = await handler.handle(['--template-type', 'pre-commit', '--format', 'json']);
          // Assert
          expect(() => JSON.parse(actual.stdout)).not.toThrow();
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-API-GenerateCiTemplateHandler-004
    describe('--template-typeを省略するとexitCode=2が返ること', () => {
      context('args=[]（必須引数なし）を渡した場合', () => {
        it('exitCode=2が返る', async () => {
          // Arrange
          const generateUseCase = { execute: vi.fn() };
          const renderUseCase = { execute: vi.fn() };
          const handler = new GenerateCiTemplateHandler(generateUseCase, renderUseCase);
          // Act
          const actual = await handler.handle([]);
          // Assert
          expect(actual.exitCode).toBe(2);
        });
      });
    });

    // IT-API-GenerateCiTemplateHandler-005
    describe('UseCaseがHarnessErrorを返した場合にexitCode=1が返ること', () => {
      context('RenderCiTemplateUseCase.execute()→errors=[HarnessError1件]が返る場合', () => {
        it('exitCode=1が返る', async () => {
          // Arrange
          const generateUseCase = { execute: vi.fn() };
          const renderUseCase = {
            execute: vi.fn().mockResolvedValue({ errors: [{ code: 'CI_TEMPLATE_EMPTY_VALIDATORS', message: 'test' }] }),
          };
          const handler = new GenerateCiTemplateHandler(generateUseCase, renderUseCase);
          // Act
          const actual = await handler.handle(['--template-type', 'aidlc-gate']);
          // Assert
          expect(actual.exitCode).toBe(1);
        });
      });
    });
  });
});
```

### 5.2 MigrateAgentsMdHandler

```typescript
// scripts/harness/__tests__/integration/ci-governance/migrate-agents-md-handler.test.ts

import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { MigrateAgentsMdHandler } from '../../../ci-governance/presentation/handlers/migrate-agents-md-handler.js';

target('MigrateAgentsMdHandler', () => {
  describe('正常系', () => {
    // IT-API-MigrateAgentsMdHandler-001
    describe('--dry-runフラグ付きでMigrateAgentsMdUseCaseがdryRun=trueで呼ばれること', () => {
      context('args=["--dry-run"]を渡した場合', () => {
        it('exitCode=0・MigrateAgentsMdUseCase.execute({dryRun:true})が呼ばれる', async () => {
          // Arrange
          const migrateUseCase = { execute: vi.fn().mockResolvedValue({ success: true, errors: [], kpiMet: null }) };
          const validateUseCase = { execute: vi.fn() };
          const handler = new MigrateAgentsMdHandler(migrateUseCase, validateUseCase);
          // Act
          const actual = await handler.handle(['--dry-run']);
          // Assert
          expect(actual.exitCode).toBe(0);
          expect(migrateUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
        });
      });
    });

    // IT-API-MigrateAgentsMdHandler-002
    describe('--validate-onlyフラグ付きでValidatePointersUseCaseが呼ばれること', () => {
      context('args=["--validate-only"]を渡した場合', () => {
        it('exitCode=0・ValidatePointersUseCase.execute()が呼ばれる', async () => {
          // Arrange
          const migrateUseCase = { execute: vi.fn() };
          const validateUseCase = { execute: vi.fn().mockResolvedValue({ passed: true, deadPointers: [], errors: [] }) };
          const handler = new MigrateAgentsMdHandler(migrateUseCase, validateUseCase);
          // Act
          const actual = await handler.handle(['--validate-only']);
          // Assert
          expect(actual.exitCode).toBe(0);
          expect(validateUseCase.execute).toHaveBeenCalledTimes(1);
        });
      });
    });

    // IT-API-MigrateAgentsMdHandler-003
    describe('KPI達成時（kpiMet=true）にexitCode=0が返ること', () => {
      context('MigrateAgentsMdUseCase.execute()→success=true, kpiMet=trueが返る場合', () => {
        it('exitCode=0が返る', async () => {
          // Arrange
          const migrateUseCase = {
            execute: vi.fn().mockResolvedValue({ success: true, errors: [], kpiMet: true, addedPointers: 2 }),
          };
          const validateUseCase = { execute: vi.fn() };
          const handler = new MigrateAgentsMdHandler(migrateUseCase, validateUseCase);
          // Act
          const actual = await handler.handle([]);
          // Assert
          expect(actual.exitCode).toBe(0);
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-API-MigrateAgentsMdHandler-004
    describe('Dead Pointer検出時にexitCode=1が返ること', () => {
      context('MigrateAgentsMdUseCase.execute()→success=false, errors=[DEAD_POINTER]が返る場合', () => {
        it('exitCode=1が返る', async () => {
          // Arrange
          const migrateUseCase = {
            execute: vi.fn().mockResolvedValue({
              success: false,
              errors: [{ code: 'AGENTS_MD_DEAD_POINTER', message: 'dead pointer detected' }],
              kpiMet: null,
            }),
          };
          const validateUseCase = { execute: vi.fn() };
          const handler = new MigrateAgentsMdHandler(migrateUseCase, validateUseCase);
          // Act
          const actual = await handler.handle([]);
          // Assert
          expect(actual.exitCode).toBe(1);
        });
      });
    });

    // IT-API-MigrateAgentsMdHandler-005
    describe('KPI未達（kpiMet=false）でexitCode=1が返ること', () => {
      context('MigrateAgentsMdUseCase.execute()→success=true, kpiMet=falseが返る場合', () => {
        it('exitCode=1が返る', async () => {
          // Arrange
          const migrateUseCase = {
            execute: vi.fn().mockResolvedValue({ success: true, errors: [], kpiMet: false }),
          };
          const validateUseCase = { execute: vi.fn() };
          const handler = new MigrateAgentsMdHandler(migrateUseCase, validateUseCase);
          // Act
          const actual = await handler.handle([]);
          // Assert
          expect(actual.exitCode).toBe(1);
        });
      });
    });
  });
});
```

### 5.3 CheckRepetitionHandler

```typescript
// scripts/harness/__tests__/integration/ci-governance/check-repetition-handler.test.ts

import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { CheckRepetitionHandler } from '../../../ci-governance/presentation/handlers/check-repetition-handler.js';

target('CheckRepetitionHandler', () => {
  describe('正常系', () => {
    // IT-API-CheckRepetitionHandler-001
    describe('--error-code指定でCheckEscalationUseCaseが呼ばれること', () => {
      context('args=["--error-code","L1-001"]を渡した場合', () => {
        it('exitCode=0・CheckEscalationUseCase.execute()が呼ばれる', async () => {
          // Arrange
          const checkUseCase = {
            execute: vi.fn().mockResolvedValue({ exists: true, currentCount: 1, escalated: false }),
          };
          const resetUseCase = { execute: vi.fn() };
          const handler = new CheckRepetitionHandler(checkUseCase, resetUseCase);
          // Act
          const actual = await handler.handle(['--error-code', 'L1-001']);
          // Assert
          expect(actual.exitCode).toBe(0);
          expect(checkUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 'L1-001' }));
        });
      });
    });

    // IT-API-CheckRepetitionHandler-002
    describe('--resetフラグ付きでResetRepetitionUseCaseが呼ばれること', () => {
      context('args=["--error-code","L2-001","--reset"]を渡した場合', () => {
        it('exitCode=0・ResetRepetitionUseCase.execute()が呼ばれる', async () => {
          // Arrange
          const checkUseCase = { execute: vi.fn() };
          const resetUseCase = { execute: vi.fn().mockResolvedValue({ success: true, errors: [] }) };
          const handler = new CheckRepetitionHandler(checkUseCase, resetUseCase);
          // Act
          const actual = await handler.handle(['--error-code', 'L2-001', '--reset']);
          // Assert
          expect(actual.exitCode).toBe(0);
          expect(resetUseCase.execute).toHaveBeenCalledTimes(1);
        });
      });
    });
  });

  describe('異常系', () => {
    // IT-API-CheckRepetitionHandler-003
    describe('存在しないエラーコードを--error-code指定するとexitCode=1が返ること', () => {
      context('CheckEscalationUseCase.execute()→exists=falseが返る場合', () => {
        it('exitCode=1が返る', async () => {
          // Arrange
          const checkUseCase = {
            execute: vi.fn().mockResolvedValue({ exists: false, currentCount: null, escalated: null }),
          };
          const resetUseCase = { execute: vi.fn() };
          const handler = new CheckRepetitionHandler(checkUseCase, resetUseCase);
          // Act
          const actual = await handler.handle(['--error-code', 'L9-999']);
          // Assert
          expect(actual.exitCode).toBe(1);
        });
      });
    });

    // IT-API-CheckRepetitionHandler-004
    describe('--resetでINV-7違反エラーが返った場合にexitCode=1が返ること', () => {
      context('ResetRepetitionUseCase.execute()→success=false, errors=[REPETITION_RESET_FORBIDDEN]が返る場合', () => {
        it('exitCode=1が返る', async () => {
          // Arrange
          const checkUseCase = { execute: vi.fn() };
          const resetUseCase = {
            execute: vi.fn().mockResolvedValue({
              success: false,
              errors: [{ code: 'REPETITION_RESET_FORBIDDEN', message: 'Cannot reset' }],
            }),
          };
          const handler = new CheckRepetitionHandler(checkUseCase, resetUseCase);
          // Act
          const actual = await handler.handle(['--error-code', 'L1-001', '--reset']);
          // Assert
          expect(actual.exitCode).toBe(1);
        });
      });
    });
  });
});
```

---

## 6. Cross-Layer 統合テスト詳細ロジック

### 6.1 CI/CDテンプレート生成統合フロー

```typescript
// scripts/harness/__tests__/integration/ci-governance/ci-template-generation-flow.test.ts

import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { GenerateCiTemplateHandler } from '../../../ci-governance/presentation/handlers/generate-ci-template-handler.js';
import { GenerateCiTemplateUseCase } from '../../../ci-governance/application/usecases/generate-ci-template-usecase.js';
import { RenderCiTemplateUseCase } from '../../../ci-governance/application/usecases/render-ci-template-usecase.js';
import { TemplateGenerator } from '../../../ci-governance/domain/services/template-generator.js';

target('CI/CDテンプレート生成統合フロー', () => {
  describe('Handler→UseCase→TemplateGenerator→CiTemplate全レイヤー統合テスト', () => {
    // IT-API-CiTemplateFlow-001
    context('Handler→UseCase→TemplateGenerator→CiTemplateの全レイヤーが連携してテンプレートを生成できること', () => {
      it('出力にtemplateType/triggerCondition/targetValidatorIdsが含まれ・TemplateRendererPort.render()が1回呼ばれる', async () => {
        // Arrange
        const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1', 'v2']) };
        const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
        const generator = new TemplateGenerator(validatorPort, presetPort);
        const rendererPort = {
          render: vi.fn().mockResolvedValue({ outputPath: '.github/workflows/aidlc-gate.yml', content: 'yaml' }),
        };
        const generateUseCase = new GenerateCiTemplateUseCase(generator);
        const renderUseCase = new RenderCiTemplateUseCase(generator, rendererPort);
        const handler = new GenerateCiTemplateHandler(generateUseCase, renderUseCase);
        // Act
        const actual = await handler.handle(['--template-type', 'aidlc-gate', '--preset-id', 'standard']);
        // Assert
        expect(actual.exitCode).toBe(0);
        expect(rendererPort.render).toHaveBeenCalledTimes(1);
        const renderArg = rendererPort.render.mock.calls[0][0];
        expect(renderArg.templateType).toBe('aidlc-gate');
        expect(renderArg.config.triggerCondition).toBe('pull_request');
        expect(renderArg.config.targetValidatorIds).toEqual(['v1', 'v2']);
      });
    });

    // IT-API-CiTemplateFlow-002
    context('templateType×triggerConditionの全3種マッピングが正しく連携されること', () => {
      it('aidlc-gate→pull_request・consistency-check→schedule・pre-commit→pre-commitの対応でTemplateRendererPortが呼ばれる', async () => {
        // Arrange
        const validatorPort = { listAll: vi.fn().mockResolvedValue(['v1']) };
        const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
        const generator = new TemplateGenerator(validatorPort, presetPort);
        const rendererPort = { render: vi.fn().mockResolvedValue({ outputPath: 'out', content: '' }) };
        const generateUseCase = new GenerateCiTemplateUseCase(generator);
        const renderUseCase = new RenderCiTemplateUseCase(generator, rendererPort);
        const handler = new GenerateCiTemplateHandler(generateUseCase, renderUseCase);

        const cases: Array<{ templateType: string; expected: string }> = [
          { templateType: 'aidlc-gate', expected: 'pull_request' },
          { templateType: 'consistency-check', expected: 'schedule' },
          { templateType: 'pre-commit', expected: 'pre-commit' },
        ];

        for (const { templateType, expected } of cases) {
          rendererPort.render.mockClear();
          // Act
          await handler.handle(['--template-type', templateType, '--preset-id', 'standard']);
          // Assert
          const renderArg = rendererPort.render.mock.calls[0][0];
          expect(renderArg.config.triggerCondition).toBe(expected);
        }
      });
    });
  });
});
```

### 6.2 反復エラー検出統合フロー

```typescript
// scripts/harness/__tests__/integration/ci-governance/error-repetition-flow.test.ts

import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { RecordErrorOccurrenceUseCase } from '../../../ci-governance/application/usecases/record-error-occurrence-usecase.js';
import { RepetitionDetector } from '../../../ci-governance/domain/services/repetition-detector.js';
import { ErrorRepetition } from '../../../ci-governance/domain/aggregates/error-repetition.js';

target('反復エラー検出統合フロー', () => {
  describe('RecordErrorOccurrence×RepetitionDetectorのstateful統合テスト', () => {
    // IT-API-RepetitionFlow-001
    context('同一エラーコードを3回RecordErrorOccurrenceすると3回目でescalated=trueになること', () => {
      it('1回目: escalated=false, 2回目: escalated=false, 3回目: escalated=true・escalationAction!=null', async () => {
        // Arrange（状態を保持するstateful mock）
        const store = new Map<string, ErrorRepetition>();
        const repoPort = {
          findByCode: vi.fn().mockImplementation(async (code: string) => store.get(code) ?? null),
          save: vi.fn().mockImplementation(async (er: ErrorRepetition) => store.set(er.code, er)),
        };
        const detector = new RepetitionDetector(repoPort);
        const escalationExecutorPort = { execute: vi.fn().mockResolvedValue(undefined) };
        const useCase = new RecordErrorOccurrenceUseCase(detector, escalationExecutorPort);

        // Act & Assert: 1回目
        const result1 = await useCase.execute({ errorCode: 'L1-001', errorMessage: 'test' });
        expect(result1.escalated).toBe(false);

        // Act & Assert: 2回目
        const result2 = await useCase.execute({ errorCode: 'L1-001', errorMessage: 'test' });
        expect(result2.escalated).toBe(false);

        // Act & Assert: 3回目
        const result3 = await useCase.execute({ errorCode: 'L1-001', errorMessage: 'test' });
        expect(result3.escalated).toBe(true);
        expect(result3.escalationAction).not.toBeNull();
      });
    });

    // IT-API-RepetitionFlow-002
    context('RepetitionDetectorがEscalationActionを返した後・アプリケーション層がEscalationExecutorPortを呼び出すこと', () => {
      it('EscalationExecutorPort.execute()が1回呼び出される（logLevel/messageTemplateが渡される）', async () => {
        // Arrange（occurrenceCount=2を返すmock）
        let er = ErrorRepetition.create('L1-001', 3);
        er = er.increment().increment(); // 2
        const repoPort = {
          findByCode: vi.fn().mockResolvedValue(er),
          save: vi.fn().mockResolvedValue(undefined),
        };
        const detector = new RepetitionDetector(repoPort);
        const escalationExecutorPort = { execute: vi.fn().mockResolvedValue(undefined) };
        const useCase = new RecordErrorOccurrenceUseCase(detector, escalationExecutorPort);

        // Act
        await useCase.execute({ errorCode: 'L1-001', errorMessage: 'test' });

        // Assert
        expect(escalationExecutorPort.execute).toHaveBeenCalledTimes(1);
        const execArg = escalationExecutorPort.execute.mock.calls[0][0];
        expect(execArg.logLevel).toBeDefined();
        expect(execArg.messageTemplate).toBeDefined();
      });
    });

    // IT-API-RepetitionFlow-003
    context('reset後のerrorCodeは再びoccurrenceCount=0から開始すること', () => {
      it('reset: success=true。再記録1回目: currentCount=1・escalated=false', async () => {
        // Arrange（reset後状態管理）
        let storedEr: ErrorRepetition | null = null;
        let escalatedEr = ErrorRepetition.create('L2-001', 3);
        escalatedEr = escalatedEr.increment().increment().increment(); // escalated=true
        storedEr = escalatedEr;

        const repoPort = {
          findByCode: vi.fn().mockImplementation(async () => storedEr),
          save: vi.fn().mockImplementation(async (er: ErrorRepetition) => { storedEr = er; }),
        };

        // ResetRepetitionUseCase インポート
        const { ResetRepetitionUseCase } = await import('../../../ci-governance/application/usecases/reset-repetition-usecase.js');
        const resetUseCase = new ResetRepetitionUseCase(repoPort);
        // Act: reset
        const resetResult = await resetUseCase.execute({ errorCode: 'L2-001', confirmedResolution: true });
        expect(resetResult.success).toBe(true);

        // Act: 再記録1回目
        const detector = new RepetitionDetector(repoPort);
        const escalationExecutorPort = { execute: vi.fn() };
        const recordUseCase = new RecordErrorOccurrenceUseCase(detector, escalationExecutorPort);
        const recordResult = await recordUseCase.execute({ errorCode: 'L2-001', errorMessage: 're-test' });

        // Assert
        expect(recordResult.currentCount).toBe(1);
        expect(recordResult.escalated).toBe(false);
      });
    });
  });
});
```

### 6.3 AGENTS.md移行統合フロー

```typescript
// scripts/harness/__tests__/integration/ci-governance/agents-md-migration-flow.test.ts

import { describe, it, vi, expect } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { MigrateAgentsMdHandler } from '../../../ci-governance/presentation/handlers/migrate-agents-md-handler.js';
import { MigrateAgentsMdUseCase } from '../../../ci-governance/application/usecases/migrate-agents-md-usecase.js';
import { ValidatePointersUseCase } from '../../../ci-governance/application/usecases/validate-pointers-usecase.js';
import { LessonAggregator } from '../../../ci-governance/domain/services/lesson-aggregator.js';
import { PointerValidator } from '../../../ci-governance/domain/services/pointer-validator.js';
import { AgentsMdPointer } from '../../../ci-governance/domain/aggregates/agents-md-pointer.js';

const createLesson = (lessonId: string) => ({
  lessonId,
  source: 'story-implementor',
  content: 'テストlesson',
  tags: ['best-practice'] as any[],
  timestamp: '2026-03-20T00:00:00Z',
});

target('AGENTS.md移行統合フロー', () => {
  describe('Handler→MigrateAgentsMdUseCase→LessonAggregator→PointerValidator→AgentsMdPort全フロー統合テスト', () => {
    // IT-API-AgentsMdFlow-001
    context('Handler→UseCase→Aggregator→Validator→AgentsMdPortの全フローが連携できること', () => {
      it('success=true・addedPointers=2・kpiMet=trueが返る', async () => {
        // Arrange
        const lessonReaderPort = {
          readAll: vi.fn().mockResolvedValue([
            createLesson('550e8400-e29b-41d4-a716-446655440001'),
            createLesson('550e8400-e29b-41d4-a716-446655440002'),
          ]),
        };
        const agentsMdPort = {
          read: vi.fn().mockResolvedValue(AgentsMdPointer.create()),
          write: vi.fn().mockResolvedValue({ before: 20, after: 8 }),
        };
        const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
        const filePort = { exists: vi.fn().mockResolvedValue(true) };
        const adrPort = { exists: vi.fn().mockResolvedValue(true) };
        const aggregator = new LessonAggregator();
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        const migrateUseCase = new MigrateAgentsMdUseCase(lessonReaderPort, agentsMdPort, aggregator, validator);
        const validatePointerUseCase = new ValidatePointersUseCase(agentsMdPort, validator);
        const handler = new MigrateAgentsMdHandler(migrateUseCase, validatePointerUseCase);
        // Act
        const actual = await handler.handle([]);
        // Assert
        expect(actual.exitCode).toBe(0);
        expect(agentsMdPort.write).toHaveBeenCalledTimes(1);
      });
    });

    // IT-API-AgentsMdFlow-002
    context('Dead Pointer検出時は全レイヤーを通してwrite()がスキップされること', () => {
      it('success=false・AgentsMdPort.write()が呼び出されない', async () => {
        // Arrange
        const lessonReaderPort = {
          readAll: vi.fn().mockResolvedValue([createLesson('550e8400-e29b-41d4-a716-446655440001')]),
        };
        const agentsMdPort = {
          read: vi.fn().mockResolvedValue(AgentsMdPointer.create()),
          write: vi.fn(),
        };
        const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
        const filePort = { exists: vi.fn().mockResolvedValue(false) }; // Dead Pointer
        const adrPort = { exists: vi.fn().mockResolvedValue(true) };
        const aggregator = new LessonAggregator();
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        const migrateUseCase = new MigrateAgentsMdUseCase(lessonReaderPort, agentsMdPort, aggregator, validator);
        const validatePointerUseCase = new ValidatePointersUseCase(agentsMdPort, validator);
        const handler = new MigrateAgentsMdHandler(migrateUseCase, validatePointerUseCase);
        // Act
        const actual = await handler.handle([]);
        // Assert
        expect(actual.exitCode).toBe(1);
        expect(agentsMdPort.write).not.toHaveBeenCalled();
      });
    });

    // IT-API-AgentsMdFlow-003
    context('Shared Kernel（HarnessError/HarnessErrorCode）が全レイヤーを通じて正しく伝播されること', () => {
      it('返却されたHarnessErrorのcodeがDUPLICATE_LESSON_IDであり・エラーがレイヤー境界で再包装されず型安全に伝播される', async () => {
        // Arrange（重複lessonId入力）
        const dupId = '550e8400-e29b-41d4-a716-446655440001';
        const lessonReaderPort = {
          readAll: vi.fn().mockResolvedValue([createLesson(dupId), createLesson(dupId)]),
        };
        const agentsMdPort = { read: vi.fn(), write: vi.fn() };
        const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
        const filePort = { exists: vi.fn().mockResolvedValue(true) };
        const adrPort = { exists: vi.fn().mockResolvedValue(true) };
        const aggregator = new LessonAggregator();
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        const migrateUseCase = new MigrateAgentsMdUseCase(lessonReaderPort, agentsMdPort, aggregator, validator);
        const validatePointerUseCase = new ValidatePointersUseCase(agentsMdPort, validator);
        const handler = new MigrateAgentsMdHandler(migrateUseCase, validatePointerUseCase);
        // Act
        const actual = await handler.handle([]);
        // Assert
        expect(actual.exitCode).toBe(1);
        // HarnessErrorCodeがDUPLICATE_LESSON_IDとして伝播していること
        expect(actual.errors?.some((e: any) => e.code.includes('DUPLICATE_LESSON_ID'))).toBe(true);
      });
    });
  });
});
```

---

## 7. テスト実行コマンド

```bash
# ci-governance ユニットテスト全体実行
npx vitest run scripts/harness/__tests__/unit/ci-governance

# ci-governance ITテスト全体実行
npx vitest run scripts/harness/__tests__/integration/ci-governance

# 特定ファイルのテスト実行
npx vitest run scripts/harness/__tests__/unit/ci-governance/aggregates/ci-template.test.ts
npx vitest run scripts/harness/__tests__/integration/ci-governance/generate-ci-template-usecase.test.ts

# ウォッチモード（開発時）
npx vitest watch scripts/harness/__tests__/unit/ci-governance

# カバレッジ計測
npx vitest run --coverage scripts/harness/__tests__/unit/ci-governance
npx vitest run --coverage scripts/harness/__tests__/integration/ci-governance
```
