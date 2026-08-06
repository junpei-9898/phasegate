# ユニットテストロジック設計: ci-governance

@story-id H13-01
@story-id H13-02
@story-id H13-03
> **Unit ID**: ci-governance
> **作成日**: 2026-03-20
> **参照**: unit_test_design.md, domain_model.md

---

## 1. テストファイル構成

| ファイルパス | 対象 | ケース数 |
|-------------|------|---------|
| `scripts/harness/__tests__/unit/ci-governance/value-objects/template-config.test.ts` | TemplateConfig VO | 10 |
| `scripts/harness/__tests__/unit/ci-governance/value-objects/escalation-action.test.ts` | EscalationAction VO | 10 |
| `scripts/harness/__tests__/unit/ci-governance/value-objects/repetition-reset-condition.test.ts` | RepetitionResetCondition VO | 4 |
| `scripts/harness/__tests__/unit/ci-governance/value-objects/pointer-entry.test.ts` | PointerEntry VO | 11 |
| `scripts/harness/__tests__/unit/ci-governance/aggregates/ci-template.test.ts` | CiTemplate集約ルート | 14 |
| `scripts/harness/__tests__/unit/ci-governance/aggregates/error-repetition.test.ts` | ErrorRepetition集約ルート | 16 |
| `scripts/harness/__tests__/unit/ci-governance/aggregates/agents-md-pointer.test.ts` | AgentsMdPointer集約ルート | 12 |
| `scripts/harness/__tests__/unit/ci-governance/services/template-generator.test.ts` | TemplateGeneratorドメインサービス | 8 |
| `scripts/harness/__tests__/unit/ci-governance/services/repetition-detector.test.ts` | RepetitionDetectorドメインサービス | 5 |
| `scripts/harness/__tests__/unit/ci-governance/services/pointer-validator.test.ts` | PointerValidatorドメインサービス | 8 |
| `scripts/harness/__tests__/unit/ci-governance/services/lesson-aggregator.test.ts` | LessonAggregatorドメインサービス | 7 |
| **合計** | | **105** |

> 上表 11 ファイルのケース数はすべて実測と一致（WI-365 で計測）。ただし
> `__tests__/unit/ci-governance/` にはこのほかに 5 ファイル（計 29 ケース）が実在する:
> `services/integrity-checker.test.ts`(6) / `value-objects/baseline-entry.test.ts`(6) /
> `value-objects/baseline-snapshot.test.ts`(6) / `value-objects/design-phase.test.ts`(6) /
> `value-objects/integrity-manifest.test.ts`(5)。
> 上表の 105 は H13-01..03 スコープの合計で、ディレクトリ全体は 134 ケース。

---

## 2. 共通ヘルパー・ファクトリ

テストヘルパーのインポートパターン:

```typescript
import { target, context } from '../../../helpers/test-helpers.js';
import { describe, it, vi, expect } from 'vitest';
```

### 2.1 値オブジェクト用ファクトリ

```typescript
// TemplateConfig ファクトリ
export const createTemplateConfig = (overrides: Partial<{
  targetValidatorIds: string[];
  triggerCondition: 'pull_request' | 'schedule' | 'pre-commit';
  failOnWarning: boolean;
}> = {}): TemplateConfig =>
  TemplateConfig.create({
    targetValidatorIds: ['v1'],
    triggerCondition: 'pull_request',
    failOnWarning: false,
    ...overrides,
  });

// EscalationAction ファクトリ
export const createEscalationAction = (overrides: Partial<{
  logLevel: 'warn' | 'error';
  messageTemplate: string;
}> = {}): EscalationAction =>
  EscalationAction.create({
    logLevel: 'warn',
    messageTemplate: 'Error {errorCode} occurred {count} times',
    ...overrides,
  });

// RepetitionResetCondition ファクトリ
export const createRepetitionResetCondition = (resetOnResolution = true): RepetitionResetCondition =>
  RepetitionResetCondition.create({ resetOnResolution });

// PointerEntry (CommandPointer) ファクトリ
export const createCommandPointerEntry = (overrides: Partial<{
  key: string;
  command: string;
  description: string;
}> = {}): PointerEntry =>
  PointerEntry.createCommand({
    key: 'cmd-status',
    command: 'phasegate:status',
    description: 'ステータス確認コマンド',
    ...overrides,
  });

// PointerEntry (FilePointer) ファクトリ
export const createFilePointerEntry = (overrides: Partial<{
  key: string;
  filePath: string;
  description: string;
}> = {}): PointerEntry =>
  PointerEntry.createFile({
    key: 'file-readme',
    filePath: 'docs/README.md',
    description: 'READMEファイル',
    ...overrides,
  });

// LessonArtifact ファクトリ
export const createLessonArtifact = (overrides: Partial<{
  lessonId: string;
  source: string;
  content: string;
  tags: string[];
  timestamp: string;
}> = {}): LessonArtifact => ({
  lessonId: '550e8400-e29b-41d4-a716-446655440001',
  source: 'story-implementor',
  content: 'ドメインサービスは状態を持たず、ポート経由のみでI/Oを行うこと',
  tags: ['best-practice'],
  timestamp: '2026-03-20T00:00:00Z',
  ...overrides,
});
```

### 2.2 集約ルート用ファクトリ

```typescript
// CiTemplate ファクトリ
export const createCiTemplate = (overrides: Partial<{
  templateType: 'aidlc-gate' | 'consistency-check' | 'pre-commit';
  presetRef: string;
}> = {}): CiTemplate =>
  CiTemplate.create(
    overrides.templateType ?? 'aidlc-gate',
    overrides.presetRef ?? 'standard'
  );

// config注入済みCiTemplateファクトリ
export const createConfiguredCiTemplate = (overrides: Partial<{
  templateType: 'aidlc-gate' | 'consistency-check' | 'pre-commit';
  presetRef: string;
  targetValidatorIds: string[];
}> = {}): CiTemplate => {
  const template = createCiTemplate(overrides);
  const config = createTemplateConfig({
    targetValidatorIds: overrides.targetValidatorIds ?? ['v1'],
  });
  return template.withConfig(config);
};

// ErrorRepetition ファクトリ
export const createErrorRepetition = (overrides: Partial<{
  code: string;
  threshold: number;
}> = {}): ErrorRepetition =>
  ErrorRepetition.create(
    overrides.code ?? 'L1-001',
    overrides.threshold
  );

// AgentsMdPointer ファクトリ
export const createAgentsMdPointer = (overrides: Partial<{
  pointers: PointerEntry[];
  adrLinks: string[];
}> = {}): AgentsMdPointer =>
  AgentsMdPointer.create(
    overrides.pointers ?? [],
    overrides.adrLinks ?? []
  );
```

### 2.3 ドメインサービス用モックファクトリ

```typescript
// ValidatorIdRegistryPort モック
export const createValidatorIdRegistryPortMock = (validatorIds = ['v1', 'v2']) => ({
  listAll: vi.fn().mockResolvedValue(validatorIds),
});

// PresetConfigPort モック
export const createPresetConfigPortMock = (failOnWarning = false) => ({
  getPreset: vi.fn().mockResolvedValue({ failOnWarning }),
});

// ErrorRepetitionRepositoryPort モック
export const createErrorRepetitionRepositoryPortMock = (existing: ErrorRepetition | null = null) => ({
  findByCode: vi.fn().mockResolvedValue(existing),
  save: vi.fn().mockResolvedValue(undefined),
});

// CommandExistencePort モック
export const createCommandExistencePortMock = (exists = true) => ({
  exists: vi.fn().mockResolvedValue(exists),
});

// FileExistencePort モック
export const createFileExistencePortMock = (exists = true) => ({
  exists: vi.fn().mockResolvedValue(exists),
});

// AdrExistencePort モック
export const createAdrExistencePortMock = (exists = true) => ({
  exists: vi.fn().mockResolvedValue(exists),
});
```

---

## 3. テストケース詳細ロジック

### 3.1 TemplateConfig

```typescript
// scripts/harness/__tests__/unit/ci-governance/value-objects/template-config.test.ts

import { target, context } from '../../../helpers/test-helpers.js';
import { describe, it, expect } from 'vitest';
import { TemplateConfig } from '../../../../ci-governance/domain/value-objects/template-config.js';
import { createTemplateConfig } from '../../../helpers/test-helpers.js';

target('TemplateConfig', () => {
  describe('生成テスト', () => {
    // UT-TC-001
    context('targetValidatorIds=["v1"], triggerCondition="pull_request", failOnWarning=falseを渡した場合', () => {
      it('正常にTemplateConfigが生成される', () => {
        // Arrange
        const input = { targetValidatorIds: ['v1'], triggerCondition: 'pull_request' as const, failOnWarning: false };
        // Act
        const actual = TemplateConfig.create(input);
        // Assert
        expect(actual.targetValidatorIds).toEqual(['v1']);
        expect(actual.triggerCondition).toBe('pull_request');
        expect(actual.failOnWarning).toBe(false);
      });
    });

    // UT-TC-002
    context('targetValidatorIds=["v1","v2","v3"], triggerCondition="schedule", failOnWarning=trueを渡した場合', () => {
      it('複数ValidatorIdでTemplateConfigが生成される', () => {
        // Arrange
        const input = { targetValidatorIds: ['v1', 'v2', 'v3'], triggerCondition: 'schedule' as const, failOnWarning: true };
        // Act
        const actual = TemplateConfig.create(input);
        // Assert
        expect(actual.targetValidatorIds).toHaveLength(3);
        expect(actual.failOnWarning).toBe(true);
      });
    });

    // UT-TC-003
    context('triggerCondition="pre-commit"を渡した場合', () => {
      it('pre-commitのTemplateConfigが生成される', () => {
        // Arrange
        const input = { targetValidatorIds: ['v1'], triggerCondition: 'pre-commit' as const, failOnWarning: false };
        // Act
        const actual = TemplateConfig.create(input);
        // Assert
        expect(actual.triggerCondition).toBe('pre-commit');
      });
    });

    // UT-TC-004
    context('targetValidatorIds=[]（空リスト）を渡した場合', () => {
      it('INV-2違反でエラーがスローされる', () => {
        // Arrange
        const input = { targetValidatorIds: [], triggerCondition: 'pull_request' as const, failOnWarning: false };
        // Act & Assert
        expect(() => TemplateConfig.create(input)).toThrow();
      });
    });

    // UT-TC-005
    context('triggerCondition="push"（不正値）を渡した場合', () => {
      it('TriggerCondition不正値でエラーがスローされる', () => {
        // Arrange
        const input = { targetValidatorIds: ['v1'], triggerCondition: 'push' as any, failOnWarning: false };
        // Act & Assert
        expect(() => TemplateConfig.create(input)).toThrow();
      });
    });
  });

  describe('不変条件テスト', () => {
    // UT-TC-006
    context('targetValidatorIds=[]でcreateを呼ぶ場合（INV-2）', () => {
      it('生成が失敗する', () => {
        // Arrange
        const input = { targetValidatorIds: [], triggerCondition: 'pull_request' as const, failOnWarning: false };
        // Act & Assert
        expect(() => TemplateConfig.create(input)).toThrow();
      });
    });

    // UT-TC-007
    context('生成後にtargetValidatorIdsを変更しようとした場合', () => {
      it('変更が反映されない（immutable）', () => {
        // Arrange
        const actual = createTemplateConfig({ targetValidatorIds: ['v1'] });
        const original = actual.targetValidatorIds.slice();
        // Act
        (actual.targetValidatorIds as any).push('v2');
        // Assert
        expect(actual.targetValidatorIds).toEqual(original);
      });
    });
  });

  describe('等値性テスト', () => {
    // UT-TC-008
    context('同一フィールドを持つ2つのTemplateConfigを比較した場合', () => {
      it('equals()がtrueを返す', () => {
        // Arrange
        const a = createTemplateConfig({ targetValidatorIds: ['v1'], triggerCondition: 'pull_request', failOnWarning: false });
        const b = createTemplateConfig({ targetValidatorIds: ['v1'], triggerCondition: 'pull_request', failOnWarning: false });
        // Act
        const actual = a.equals(b);
        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-TC-009
    context('failOnWarningのみ異なる2つのTemplateConfigを比較した場合', () => {
      it('equals()がfalseを返す', () => {
        // Arrange
        const a = createTemplateConfig({ failOnWarning: false });
        const b = createTemplateConfig({ failOnWarning: true });
        // Act
        const actual = a.equals(b);
        // Assert
        expect(actual).toBe(false);
      });
    });

    // UT-TC-010
    context('targetValidatorIdsの内容が同一だが順序が異なる2つのTemplateConfigを比較した場合', () => {
      it('equals()がtrueを返す（順序非依存）', () => {
        // Arrange
        const a = createTemplateConfig({ targetValidatorIds: ['v1', 'v2'] });
        const b = createTemplateConfig({ targetValidatorIds: ['v2', 'v1'] });
        // Act
        const actual = a.equals(b);
        // Assert
        expect(actual).toBe(true);
      });
    });
  });
});
```

### 3.2 EscalationAction

```typescript
// scripts/harness/__tests__/unit/ci-governance/value-objects/escalation-action.test.ts

import { target, context } from '../../../helpers/test-helpers.js';
import { describe, it, expect } from 'vitest';
import { EscalationAction } from '../../../../ci-governance/domain/value-objects/escalation-action.js';
import { createEscalationAction } from '../../../helpers/test-helpers.js';

target('EscalationAction', () => {
  describe('生成テスト', () => {
    // UT-EA-001
    context('logLevel="warn", 有効なmessageTemplateを渡した場合', () => {
      it('正常にEscalationActionが生成される', () => {
        // Arrange & Act
        const actual = EscalationAction.create({ logLevel: 'warn', messageTemplate: 'Error {errorCode} occurred {count} times' });
        // Assert
        expect(actual.logLevel).toBe('warn');
        expect(actual.messageTemplate).toBe('Error {errorCode} occurred {count} times');
      });
    });

    // UT-EA-002
    context('logLevel="error"を渡した場合', () => {
      it('logLevel="error"のEscalationActionが生成される', () => {
        // Arrange & Act
        const actual = EscalationAction.create({ logLevel: 'error', messageTemplate: 'Critical: {errorCode} x{count}' });
        // Assert
        expect(actual.logLevel).toBe('error');
      });
    });

    // UT-EA-003
    context('messageTemplate=""（空文字）を渡した場合', () => {
      it('空文字不可エラーがスローされる', () => {
        // Arrange & Act & Assert
        expect(() => EscalationAction.create({ logLevel: 'warn', messageTemplate: '' })).toThrow();
      });
    });

    // UT-EA-004
    context('logLevel="info"（不正値）を渡した場合', () => {
      it('EscalationLogLevel不正値エラーがスローされる', () => {
        // Arrange & Act & Assert
        expect(() => EscalationAction.create({ logLevel: 'info' as any, messageTemplate: 'test' })).toThrow();
      });
    });
  });

  describe('不変条件テスト', () => {
    // UT-EA-005
    context('messageTemplate=""でcreateを呼ぶ場合', () => {
      it('生成が失敗する', () => {
        // Arrange & Act & Assert
        expect(() => EscalationAction.create({ logLevel: 'warn', messageTemplate: '' })).toThrow();
      });
    });

    // UT-EA-006
    context('logLevel="debug"を渡した場合', () => {
      it('生成が失敗する', () => {
        // Arrange & Act & Assert
        expect(() => EscalationAction.create({ logLevel: 'debug' as any, messageTemplate: 'test' })).toThrow();
      });
    });
  });

  describe('formatMessageテスト', () => {
    // UT-EA-007
    context('messageTemplate="Error {errorCode} x{count}"にerrorCode・countを渡した場合', () => {
      it('"Error L1-001 x3"が返る', () => {
        // Arrange
        const action = EscalationAction.create({ logLevel: 'warn', messageTemplate: 'Error {errorCode} x{count}' });
        // Act
        const actual = action.formatMessage({ errorCode: 'L1-001', count: 3 });
        // Assert
        expect(actual).toBe('Error L1-001 x3');
      });
    });

    // UT-EA-008
    context('テンプレートに{errorCode}プレースホルダーがない場合', () => {
      it('テンプレートそのままが返る（置換なし）', () => {
        // Arrange
        const action = EscalationAction.create({ logLevel: 'warn', messageTemplate: 'Fixed message' });
        // Act
        const actual = action.formatMessage({ errorCode: 'L1-001', count: 1 });
        // Assert
        expect(actual).toBe('Fixed message');
      });
    });
  });

  describe('等値性テスト', () => {
    // UT-EA-009
    context('同一logLevel・messageTemplateを持つ2つのEscalationActionを比較した場合', () => {
      it('equals()がtrueを返す', () => {
        // Arrange
        const a = createEscalationAction();
        const b = createEscalationAction();
        // Act
        const actual = a.equals(b);
        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-EA-010
    context('logLevelが異なる2つのEscalationActionを比較した場合', () => {
      it('equals()がfalseを返す', () => {
        // Arrange
        const a = createEscalationAction({ logLevel: 'warn' });
        const b = createEscalationAction({ logLevel: 'error' });
        // Act
        const actual = a.equals(b);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
```

### 3.3 RepetitionResetCondition

```typescript
// scripts/harness/__tests__/unit/ci-governance/value-objects/repetition-reset-condition.test.ts

import { target, context } from '../../../helpers/test-helpers.js';
import { describe, it, expect } from 'vitest';
import { RepetitionResetCondition } from '../../../../ci-governance/domain/value-objects/repetition-reset-condition.js';

target('RepetitionResetCondition', () => {
  describe('生成テスト', () => {
    // UT-RRC-001
    context('resetOnResolution=trueを渡した場合', () => {
      it('正常にRepetitionResetConditionが生成される', () => {
        // Arrange & Act
        const actual = RepetitionResetCondition.create({ resetOnResolution: true });
        // Assert
        expect(actual.resetOnResolution).toBe(true);
      });
    });

    // UT-RRC-002
    context('resetOnResolution=falseを渡した場合', () => {
      it('resetOnResolution=falseのRepetitionResetConditionが生成される', () => {
        // Arrange & Act
        const actual = RepetitionResetCondition.create({ resetOnResolution: false });
        // Assert
        expect(actual.resetOnResolution).toBe(false);
      });
    });
  });

  describe('等値性テスト', () => {
    // UT-RRC-003
    context('同一resetOnResolutionを持つ2つのRepetitionResetConditionを比較した場合', () => {
      it('equals()がtrueを返す', () => {
        // Arrange
        const a = RepetitionResetCondition.create({ resetOnResolution: true });
        const b = RepetitionResetCondition.create({ resetOnResolution: true });
        // Act
        const actual = a.equals(b);
        // Assert
        expect(actual).toBe(true);
      });
    });

    // UT-RRC-004
    context('resetOnResolutionが異なる2つのRepetitionResetConditionを比較した場合', () => {
      it('equals()がfalseを返す', () => {
        // Arrange
        const a = RepetitionResetCondition.create({ resetOnResolution: true });
        const b = RepetitionResetCondition.create({ resetOnResolution: false });
        // Act
        const actual = a.equals(b);
        // Assert
        expect(actual).toBe(false);
      });
    });
  });
});
```

### 3.4 PointerEntry

```typescript
// scripts/harness/__tests__/unit/ci-governance/value-objects/pointer-entry.test.ts

import { target, context } from '../../../helpers/test-helpers.js';
import { describe, it, expect } from 'vitest';
import { PointerEntry } from '../../../../ci-governance/domain/value-objects/pointer-entry.js';

target('PointerEntry', () => {
  describe('CommandPointer生成テスト', () => {
    // UT-PE-001
    context('有効なkey・command・descriptionを渡した場合', () => {
      it('type="command"のPointerEntryが生成される', () => {
        // Arrange & Act
        const actual = PointerEntry.createCommand({ key: 'cmd-status', command: 'phasegate:status', description: 'ステータス確認' });
        // Assert
        expect(actual.type).toBe('command');
        expect(actual.key).toBe('cmd-status');
      });
    });

    // UT-PE-002
    context('key=""（空文字）を渡した場合', () => {
      it('key空文字不可エラーがスローされる', () => {
        // Arrange & Act & Assert
        expect(() => PointerEntry.createCommand({ key: '', command: 'phasegate:lint', description: '...' })).toThrow();
      });
    });

    // UT-PE-003
    context('command=""（空文字）を渡した場合', () => {
      it('command空文字不可エラーがスローされる', () => {
        // Arrange & Act & Assert
        expect(() => PointerEntry.createCommand({ key: 'k', command: '', description: '...' })).toThrow();
      });
    });
  });

  describe('FilePointer生成テスト', () => {
    // UT-PE-004
    context('有効なkey・filePath（相対パス）・descriptionを渡した場合', () => {
      it('type="file"のPointerEntryが生成される', () => {
        // Arrange & Act
        const actual = PointerEntry.createFile({ key: 'file-readme', filePath: 'docs/README.md', description: 'README' });
        // Assert
        expect(actual.type).toBe('file');
        expect(actual.key).toBe('file-readme');
      });
    });

    // UT-PE-005
    context('filePath="/absolute/path.md"（絶対パス）を渡した場合', () => {
      it('INV-11違反で絶対パス不正エラーがスローされる', () => {
        // Arrange & Act & Assert
        expect(() => PointerEntry.createFile({ key: 'file-abs', filePath: '/absolute/path.md', description: '...' })).toThrow();
      });
    });

    // UT-PE-006
    context('key=""（空文字）のFilePointerを生成しようとした場合', () => {
      it('key空文字不可エラーがスローされる', () => {
        // Arrange & Act & Assert
        expect(() => PointerEntry.createFile({ key: '', filePath: 'docs/foo.md', description: '...' })).toThrow();
      });
    });
  });

  describe('不変条件テスト', () => {
    // UT-PE-007
    context('filePath="/Users/foo/bar.md"（絶対パス）でFilePointerを生成しようとした場合（INV-11）', () => {
      it('生成が失敗する', () => {
        // Arrange & Act & Assert
        expect(() => PointerEntry.createFile({ key: 'k', filePath: '/Users/foo/bar.md', description: '...' })).toThrow();
      });
    });
  });

  describe('判別メソッドテスト', () => {
    // UT-PE-008
    context('CommandPointerに対してisCommand()を呼ぶ場合', () => {
      it('trueを返す', () => {
        // Arrange
        const actual = PointerEntry.createCommand({ key: 'cmd-1', command: 'phasegate:status', description: '...' });
        // Assert
        expect(actual.isCommand()).toBe(true);
      });
    });

    // UT-PE-009
    context('CommandPointerに対してisFile()を呼ぶ場合', () => {
      it('falseを返す', () => {
        // Arrange
        const actual = PointerEntry.createCommand({ key: 'cmd-1', command: 'phasegate:status', description: '...' });
        // Assert
        expect(actual.isFile()).toBe(false);
      });
    });

    // UT-PE-010
    context('FilePointerに対してisFile()を呼ぶ場合', () => {
      it('trueを返す', () => {
        // Arrange
        const actual = PointerEntry.createFile({ key: 'file-1', filePath: 'docs/foo.md', description: '...' });
        // Assert
        expect(actual.isFile()).toBe(true);
      });
    });

    // UT-PE-011
    context('FilePointerに対してisCommand()を呼ぶ場合', () => {
      it('falseを返す', () => {
        // Arrange
        const actual = PointerEntry.createFile({ key: 'file-1', filePath: 'docs/foo.md', description: '...' });
        // Assert
        expect(actual.isCommand()).toBe(false);
      });
    });
  });
});
```

### 3.5 CiTemplate

```typescript
// scripts/harness/__tests__/unit/ci-governance/aggregates/ci-template.test.ts

import { target, context } from '../../../helpers/test-helpers.js';
import { describe, it, expect } from 'vitest';
import { CiTemplate } from '../../../../ci-governance/domain/aggregates/ci-template.js';
import { createCiTemplate, createTemplateConfig, createConfiguredCiTemplate } from '../../../helpers/test-helpers.js';

target('CiTemplate', () => {
  describe('生成テスト（create）', () => {
    // UT-CT-001
    context('templateType="aidlc-gate", presetRef="standard"を渡した場合', () => {
      it('config=null・isConfigured()=falseのCiTemplateが生成される', () => {
        // Arrange & Act
        const actual = CiTemplate.create('aidlc-gate', 'standard');
        // Assert
        expect(actual.templateType).toBe('aidlc-gate');
        expect(actual.isConfigured()).toBe(false);
      });
    });

    // UT-CT-002
    context('templateType="consistency-check", presetRef="minimal"を渡した場合', () => {
      it('CiTemplateが生成される', () => {
        // Arrange & Act
        const actual = CiTemplate.create('consistency-check', 'minimal');
        // Assert
        expect(actual.templateType).toBe('consistency-check');
      });
    });

    // UT-CT-003
    context('templateType="pre-commit", presetRef="strict"を渡した場合', () => {
      it('CiTemplateが生成される', () => {
        // Arrange & Act
        const actual = CiTemplate.create('pre-commit', 'strict');
        // Assert
        expect(actual.templateType).toBe('pre-commit');
      });
    });

    // UT-CT-004
    context('templateType="invalid-type"（不正値）を渡した場合', () => {
      it('CiGovernanceDomainErrorがスローされる（INV-1違反）', () => {
        // Arrange & Act & Assert
        expect(() => CiTemplate.create('invalid-type' as any, 'standard')).toThrow();
      });
    });

    // UT-CT-005
    context('presetRef=""（空文字）を渡した場合', () => {
      it('エラーがスローされる', () => {
        // Arrange & Act & Assert
        expect(() => CiTemplate.create('aidlc-gate', '')).toThrow();
      });
    });
  });

  describe('withConfigテスト', () => {
    // UT-CT-006
    context('有効なTemplateConfig（targetValidatorIds=["v1"]）を注入した場合', () => {
      it('isConfigured()=trueのCiTemplateが返る（新インスタンス）', () => {
        // Arrange
        const template = createCiTemplate();
        const config = createTemplateConfig({ targetValidatorIds: ['v1'] });
        // Act
        const actual = template.withConfig(config);
        // Assert
        expect(actual.isConfigured()).toBe(true);
        expect(actual).not.toBe(template);
      });
    });

    // UT-CT-007
    context('targetValidatorIds=[]のTemplateConfigを注入した場合', () => {
      it('CiGovernanceDomainErrorがスローされる（INV-2違反）', () => {
        // Arrange
        const template = createCiTemplate();
        // Act & Assert
        expect(() => template.withConfig({ targetValidatorIds: [], triggerCondition: 'pull_request', failOnWarning: false } as any)).toThrow();
      });
    });

    // UT-CT-008
    context('withConfig()を2回連続で呼び出した場合', () => {
      it('後のwithConfig()の設定で上書きされた新インスタンスが返る', () => {
        // Arrange
        const template = createCiTemplate();
        const config1 = createTemplateConfig({ targetValidatorIds: ['v1'] });
        const config2 = createTemplateConfig({ targetValidatorIds: ['v2', 'v3'] });
        // Act
        const first = template.withConfig(config1);
        const actual = first.withConfig(config2);
        // Assert
        expect(actual.config!.targetValidatorIds).toEqual(['v2', 'v3']);
      });
    });
  });

  describe('不変条件テスト', () => {
    // UT-CT-009
    context('templateType="schedule"（INV-1違反）でcreateを呼ぶ場合', () => {
      it('エラーがスローされる', () => {
        // Arrange & Act & Assert
        expect(() => CiTemplate.create('schedule' as any, 'standard')).toThrow();
      });
    });

    // UT-CT-010
    context('withConfig()に空のtargetValidatorIds（INV-2違反）を渡した場合', () => {
      it('エラーがスローされる', () => {
        // Arrange
        const template = createCiTemplate();
        const invalidConfig = { targetValidatorIds: [], triggerCondition: 'pull_request', failOnWarning: false } as any;
        // Act & Assert
        expect(() => template.withConfig(invalidConfig)).toThrow();
      });
    });
  });

  describe('validateテスト', () => {
    // UT-CT-011
    context('有効なconfig注入済みCiTemplateに対してvalidate()を呼ぶ場合', () => {
      it('HarnessError[]が空配列を返す（検証通過）', () => {
        // Arrange
        const actual = createConfiguredCiTemplate();
        // Act
        const errors = actual.validate();
        // Assert
        expect(errors).toHaveLength(0);
      });
    });

    // UT-CT-012
    context('config=null（withConfig()未呼び出し）のCiTemplateに対してvalidate()を呼ぶ場合', () => {
      it('"設定未注入"エラーを含むHarnessError[]が返る', () => {
        // Arrange
        const actual = createCiTemplate();
        // Act
        const errors = actual.validate();
        // Assert
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('isConfiguredテスト', () => {
    // UT-CT-013
    context('create()直後のCiTemplateに対してisConfigured()を呼ぶ場合', () => {
      it('falseを返す', () => {
        // Arrange
        const actual = createCiTemplate();
        // Assert
        expect(actual.isConfigured()).toBe(false);
      });
    });

    // UT-CT-014
    context('withConfig()適用後のCiTemplateに対してisConfigured()を呼ぶ場合', () => {
      it('trueを返す', () => {
        // Arrange
        const actual = createConfiguredCiTemplate();
        // Assert
        expect(actual.isConfigured()).toBe(true);
      });
    });
  });
});
```

### 3.6 ErrorRepetition

```typescript
// scripts/harness/__tests__/unit/ci-governance/aggregates/error-repetition.test.ts

import { target, context } from '../../../helpers/test-helpers.js';
import { describe, it, expect } from 'vitest';
import { ErrorRepetition } from '../../../../ci-governance/domain/aggregates/error-repetition.js';
import { createErrorRepetition } from '../../../helpers/test-helpers.js';

target('ErrorRepetition', () => {
  describe('生成テスト（create）', () => {
    // UT-ER-001
    context('code="L1-001"をthresholdデフォルトで生成した場合', () => {
      it('occurrenceCount=0・escalated=false・threshold=3で生成される', () => {
        // Arrange & Act
        const actual = ErrorRepetition.create('L1-001');
        // Assert
        expect(actual.occurrenceCount).toBe(0);
        expect(actual.escalated).toBe(false);
        expect(actual.threshold).toBe(3);
      });
    });

    // UT-ER-002
    context('code="L2-002", threshold=5を渡した場合', () => {
      it('threshold=5のErrorRepetitionが生成される', () => {
        // Arrange & Act
        const actual = ErrorRepetition.create('L2-002', 5);
        // Assert
        expect(actual.threshold).toBe(5);
        expect(actual.escalated).toBe(false);
      });
    });

    // UT-ER-003
    context('デフォルト生成時のEscalationActionを確認した場合', () => {
      it('logLevel="warn"のEscalationActionが設定される', () => {
        // Arrange & Act
        const actual = createErrorRepetition();
        // Assert
        expect(actual.getEscalationAction().logLevel).toBe('warn');
      });
    });

    // UT-ER-004
    context('デフォルト生成時のRepetitionResetConditionを確認した場合', () => {
      it('resetOnResolution=trueのRepetitionResetConditionが設定される', () => {
        // Arrange & Act
        const actual = createErrorRepetition();
        // Assert
        expect(actual.resetCondition.resetOnResolution).toBe(true);
      });
    });
  });

  describe('incrementテスト', () => {
    // UT-ER-005
    context('初期状態のErrorRepetitionに対してincrement()を呼ぶ場合', () => {
      it('occurrenceCount=1・escalated=falseになる', () => {
        // Arrange
        const er = createErrorRepetition();
        // Act
        const actual = er.increment();
        // Assert
        expect(actual.occurrenceCount).toBe(1);
        expect(actual.escalated).toBe(false);
      });
    });

    // UT-ER-006
    context('occurrenceCount=2（threshold=3）の状態でincrement()を呼ぶ場合', () => {
      it('occurrenceCount=3・escalated=trueになる（INV-6成立）', () => {
        // Arrange
        let er = createErrorRepetition({ threshold: 3 });
        er = er.increment(); // 1
        er = er.increment(); // 2
        // Act
        const actual = er.increment(); // 3
        // Assert
        expect(actual.occurrenceCount).toBe(3);
        expect(actual.escalated).toBe(true);
      });
    });

    // UT-ER-007
    context('occurrenceCount=1（threshold=3）の状態でincrement()を呼ぶ場合', () => {
      it('occurrenceCount=2・escalated=falseのまま（threshold未達）', () => {
        // Arrange
        let er = createErrorRepetition();
        er = er.increment(); // 1
        // Act
        const actual = er.increment(); // 2
        // Assert
        expect(actual.occurrenceCount).toBe(2);
        expect(actual.escalated).toBe(false);
      });
    });

    // UT-ER-008
    context('既にescalated=trueの状態でincrement()を呼ぶ場合', () => {
      it('occurrenceCount=4・escalated=trueのまま', () => {
        // Arrange
        let er = createErrorRepetition({ threshold: 3 });
        er = er.increment().increment().increment(); // occurrenceCount=3, escalated=true
        // Act
        const actual = er.increment(); // 4
        // Assert
        expect(actual.occurrenceCount).toBe(4);
        expect(actual.escalated).toBe(true);
      });
    });
  });

  describe('isEscalatedテスト', () => {
    // UT-ER-009
    context('初期状態（escalated=false）でisEscalated()を呼ぶ場合', () => {
      it('falseを返す', () => {
        // Arrange
        const actual = createErrorRepetition();
        // Assert
        expect(actual.isEscalated()).toBe(false);
      });
    });

    // UT-ER-010
    context('3回increment後（threshold=3）にisEscalated()を呼ぶ場合', () => {
      it('trueを返す', () => {
        // Arrange
        let actual = createErrorRepetition({ threshold: 3 });
        actual = actual.increment().increment().increment();
        // Assert
        expect(actual.isEscalated()).toBe(true);
      });
    });
  });

  describe('resetテスト', () => {
    // UT-ER-011
    context('escalated=true・resetOnResolution=trueの状態でreset()を呼ぶ場合', () => {
      it('occurrenceCount=0・escalated=falseにリセットされる', () => {
        // Arrange
        let er = createErrorRepetition({ threshold: 3 });
        er = er.increment().increment().increment(); // escalated=true
        // Act
        const actual = er.reset();
        // Assert
        expect(actual.occurrenceCount).toBe(0);
        expect(actual.escalated).toBe(false);
      });
    });

    // UT-ER-012
    context('escalated=falseの状態でreset()を呼ぶ場合', () => {
      it('CiGovernanceDomainErrorがスローされる（INV-7違反）', () => {
        // Arrange
        const er = createErrorRepetition(); // escalated=false
        // Act & Assert
        expect(() => er.reset()).toThrow();
      });
    });

    // UT-ER-013
    context('escalated=true・resetOnResolution=falseの状態でreset()を呼ぶ場合', () => {
      it('CiGovernanceDomainErrorがスローされる（INV-7違反）', () => {
        // Arrange
        let er = ErrorRepetition.createWithCondition('L1-001', 3, { resetOnResolution: false });
        er = er.increment().increment().increment(); // escalated=true
        // Act & Assert
        expect(() => er.reset()).toThrow();
      });
    });
  });

  describe('不変条件テスト', () => {
    // UT-ER-014
    context('負値のoccurrenceCountを直接持つインスタンスを生成しようとした場合（INV-5）', () => {
      it('エラー状態になる', () => {
        // Arrange & Act & Assert
        expect(() => ErrorRepetition.createWithCount('L1-001', -1, 3)).toThrow();
      });
    });

    // UT-ER-015
    context('increment()後にINV-6整合性を確認した場合', () => {
      it('escalated=trueのとき必ずoccurrenceCount>=threshold', () => {
        // Arrange
        let er = createErrorRepetition({ threshold: 3 });
        er = er.increment().increment().increment();
        // Assert
        expect(er.escalated).toBe(true);
        expect(er.occurrenceCount).toBeGreaterThanOrEqual(er.threshold);
      });
    });
  });

  describe('getEscalationActionテスト', () => {
    // UT-ER-016
    context('有効なErrorRepetitionに対してgetEscalationAction()を呼ぶ場合', () => {
      it('設定済みのEscalationAction VOが返る', () => {
        // Arrange
        const er = createErrorRepetition();
        // Act
        const actual = er.getEscalationAction();
        // Assert
        expect(actual).toBeDefined();
        expect(actual.logLevel).toBeDefined();
        expect(actual.messageTemplate).toBeDefined();
      });
    });
  });
});
```

### 3.7 AgentsMdPointer

```typescript
// scripts/harness/__tests__/unit/ci-governance/aggregates/agents-md-pointer.test.ts

import { target, context } from '../../../helpers/test-helpers.js';
import { describe, it, expect } from 'vitest';
import { AgentsMdPointer } from '../../../../ci-governance/domain/aggregates/agents-md-pointer.js';
import { createAgentsMdPointer, createCommandPointerEntry, createFilePointerEntry } from '../../../helpers/test-helpers.js';

target('AgentsMdPointer', () => {
  describe('生成テスト（create）', () => {
    // UT-AMP-001
    context('引数なしでcreateを呼ぶ場合', () => {
      it('pointers=[]・adrLinks=[]の空AgentsMdPointerが生成される', () => {
        // Arrange & Act
        const actual = AgentsMdPointer.create();
        // Assert
        expect(actual.pointers).toHaveLength(0);
        expect(actual.adrLinks).toHaveLength(0);
      });
    });

    // UT-AMP-002
    context('有効なPointerEntry[]（key一意）を渡した場合', () => {
      it('指定PointerEntry[]でAgentsMdPointerが生成される', () => {
        // Arrange
        const pointers = [
          createCommandPointerEntry({ key: 'cmd-1' }),
          createFilePointerEntry({ key: 'file-1' }),
        ];
        // Act
        const actual = AgentsMdPointer.create(pointers);
        // Assert
        expect(actual.pointers).toHaveLength(2);
      });
    });

    // UT-AMP-003
    context('key重複のPointerEntry[]を渡した場合', () => {
      it('CiGovernanceDomainErrorがスローされる（INV-8違反）', () => {
        // Arrange
        const pointers = [
          createCommandPointerEntry({ key: 'same-key' }),
          createFilePointerEntry({ key: 'same-key' }),
        ];
        // Act & Assert
        expect(() => AgentsMdPointer.create(pointers)).toThrow();
      });
    });
  });

  describe('addPointerテスト', () => {
    // UT-AMP-004
    context('空AgentsMdPointerに新規CommandPointerをaddPointer()した場合', () => {
      it('pointers.length=1になる', () => {
        // Arrange
        const pointer = createAgentsMdPointer();
        const entry = createCommandPointerEntry();
        // Act
        const actual = pointer.addPointer(entry);
        // Assert
        expect(actual.pointers).toHaveLength(1);
      });
    });

    // UT-AMP-005
    context('既存keyと異なるkeyのPointerEntryをaddPointer()した場合', () => {
      it('正常に追加される（pointers.length増加）', () => {
        // Arrange
        const pointer = createAgentsMdPointer({
          pointers: [createCommandPointerEntry({ key: 'existing-key' })],
        });
        const newEntry = createFilePointerEntry({ key: 'new-key' });
        // Act
        const actual = pointer.addPointer(newEntry);
        // Assert
        expect(actual.pointers).toHaveLength(2);
      });
    });

    // UT-AMP-006
    context('既存keyと同一keyのPointerEntryをaddPointer()した場合', () => {
      it('CiGovernanceDomainErrorがスローされる（INV-8違反）', () => {
        // Arrange
        const pointer = createAgentsMdPointer({
          pointers: [createCommandPointerEntry({ key: 'dup-key' })],
        });
        const dupEntry = createFilePointerEntry({ key: 'dup-key' });
        // Act & Assert
        expect(() => pointer.addPointer(dupEntry)).toThrow();
      });
    });
  });

  describe('replacePointerテスト', () => {
    // UT-AMP-007
    context('既存keyのPointerEntryをreplacePointer()した場合', () => {
      it('既存エントリが新エントリに置換される（pointers.length変化なし）', () => {
        // Arrange
        const pointer = createAgentsMdPointer({
          pointers: [createCommandPointerEntry({ key: 'cmd-1', command: 'harness:old' })],
        });
        const newEntry = createCommandPointerEntry({ key: 'cmd-1', command: 'harness:new' });
        // Act
        const actual = pointer.replacePointer(newEntry);
        // Assert
        expect(actual.pointers).toHaveLength(1);
        expect((actual.pointers[0] as any).command).toBe('harness:new');
      });
    });

    // UT-AMP-008
    context('存在しないkeyのPointerEntryをreplacePointer()した場合', () => {
      it('新規追加として扱われる（pointers.length増加）', () => {
        // Arrange
        const pointer = createAgentsMdPointer({
          pointers: [createCommandPointerEntry({ key: 'existing' })],
        });
        const newEntry = createFilePointerEntry({ key: 'new-key' });
        // Act
        const actual = pointer.replacePointer(newEntry);
        // Assert
        expect(actual.pointers).toHaveLength(2);
      });
    });
  });

  describe('validateテスト（構造的不変条件）', () => {
    // UT-AMP-009
    context('有効なpointers（相対パスのFilePointer含む）を持つAgentsMdPointerに対してvalidate()を呼ぶ場合', () => {
      it('HarnessError[]が空配列を返す（検証通過）', () => {
        // Arrange
        const pointer = createAgentsMdPointer({
          pointers: [createFilePointerEntry({ filePath: 'docs/readme.md' })],
        });
        // Act
        const actual = pointer.validate();
        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    // UT-AMP-010
    context('絶対パスのfilePathを持つFilePointerを含むAgentsMdPointerに対してvalidate()を呼ぶ場合', () => {
      it('INV-11違反のHarnessErrorを含むHarnessError[]が返る', () => {
        // Arrange（絶対パスPointerEntryを強制的に内部状態に持たせる場合はinternal APIを利用）
        const pointer = AgentsMdPointer.createForTest([
          { type: 'file', key: 'abs-path', filePath: '/absolute/path.md', description: '...' },
        ]);
        // Act
        const actual = pointer.validate();
        // Assert
        expect(actual.length).toBeGreaterThan(0);
      });
    });
  });

  describe('不変条件テスト', () => {
    // UT-AMP-011
    context('同一keyを持つ2つのPointerEntryをaddPointer()で順番に追加しようとした場合（INV-8）', () => {
      it('2件目のaddPointer()でエラーがスローされる', () => {
        // Arrange
        const pointer = createAgentsMdPointer();
        const entry1 = createCommandPointerEntry({ key: 'dup' });
        const entry2 = createFilePointerEntry({ key: 'dup' });
        // Act
        const withFirst = pointer.addPointer(entry1);
        // Assert
        expect(() => withFirst.addPointer(entry2)).toThrow();
      });
    });
  });
});
```

### 3.8 TemplateGenerator

```typescript
// scripts/harness/__tests__/unit/ci-governance/services/template-generator.test.ts

import { target, context } from '../../../helpers/test-helpers.js';
import { describe, it, expect, vi } from 'vitest';
import { TemplateGenerator } from '../../../../ci-governance/domain/services/template-generator.js';
import {
  createValidatorIdRegistryPortMock,
  createPresetConfigPortMock,
} from '../../../helpers/test-helpers.js';

target('TemplateGenerator', () => {
  describe('generateConfigテスト', () => {
    // UT-TG-001
    context('presetId="standard"・templateType="aidlc-gate"でpresetとvalidatorIdが有効な場合', () => {
      it('triggerCondition="pull_request"のResult.ok(TemplateConfig)が返る', async () => {
        // Arrange
        const validatorPort = createValidatorIdRegistryPortMock(['v1', 'v2']);
        const presetPort = createPresetConfigPortMock(false);
        const generator = new TemplateGenerator(validatorPort, presetPort);
        // Act
        const actual = await generator.generateConfig('standard', 'aidlc-gate');
        // Assert
        expect(actual.isOk()).toBe(true);
        expect(actual.value.triggerCondition).toBe('pull_request');
        expect(actual.value.targetValidatorIds).toEqual(['v1', 'v2']);
      });
    });

    // UT-TG-002
    context('templateType="consistency-check"で有効なデータが返る場合', () => {
      it('triggerCondition="schedule"のTemplateConfigが返る', async () => {
        // Arrange
        const validatorPort = createValidatorIdRegistryPortMock(['v1']);
        const presetPort = createPresetConfigPortMock(true);
        const generator = new TemplateGenerator(validatorPort, presetPort);
        // Act
        const actual = await generator.generateConfig('standard', 'consistency-check');
        // Assert
        expect(actual.isOk()).toBe(true);
        expect(actual.value.triggerCondition).toBe('schedule');
        expect(actual.value.failOnWarning).toBe(true);
      });
    });

    // UT-TG-003
    context('templateType="pre-commit"・presetId="minimal"で有効なデータが返る場合', () => {
      it('triggerCondition="pre-commit"のTemplateConfigが返る', async () => {
        // Arrange
        const validatorPort = createValidatorIdRegistryPortMock(['v1']);
        const presetPort = createPresetConfigPortMock(false);
        const generator = new TemplateGenerator(validatorPort, presetPort);
        // Act
        const actual = await generator.generateConfig('minimal', 'pre-commit');
        // Assert
        expect(actual.isOk()).toBe(true);
        expect(actual.value.triggerCondition).toBe('pre-commit');
      });
    });

    // UT-TG-004
    context('PresetConfigPortがI/O失敗した場合', () => {
      it('Result.fail(HarnessError[])が返る', async () => {
        // Arrange
        const validatorPort = createValidatorIdRegistryPortMock();
        const presetPort = { getPreset: vi.fn().mockRejectedValue(new Error('I/O error')) };
        const generator = new TemplateGenerator(validatorPort, presetPort);
        // Act
        const actual = await generator.generateConfig('standard', 'aidlc-gate');
        // Assert
        expect(actual.isOk()).toBe(false);
        expect(actual.error.length).toBeGreaterThan(0);
      });
    });

    // UT-TG-005
    context('ValidatorIdRegistryPortが空リスト[]を返した場合', () => {
      it('Result.fail(HarnessError[])が返る（targetValidatorIdsが空になるため）', async () => {
        // Arrange
        const validatorPort = createValidatorIdRegistryPortMock([]);
        const presetPort = createPresetConfigPortMock();
        const generator = new TemplateGenerator(validatorPort, presetPort);
        // Act
        const actual = await generator.generateConfig('standard', 'aidlc-gate');
        // Assert
        expect(actual.isOk()).toBe(false);
      });
    });
  });

  describe('TemplateType×TriggerConditionマッピングテスト（D6ルール）', () => {
    // UT-TG-006
    context('templateType="aidlc-gate"を渡した場合（D6ルール）', () => {
      it('triggerCondition="pull_request"になる', async () => {
        // Arrange
        const validatorPort = createValidatorIdRegistryPortMock(['v1']);
        const presetPort = createPresetConfigPortMock();
        const generator = new TemplateGenerator(validatorPort, presetPort);
        // Act
        const actual = await generator.generateConfig('standard', 'aidlc-gate');
        // Assert
        expect(actual.value.triggerCondition).toBe('pull_request');
      });
    });

    // UT-TG-007
    context('templateType="consistency-check"を渡した場合（D6ルール）', () => {
      it('triggerCondition="schedule"になる', async () => {
        // Arrange
        const validatorPort = createValidatorIdRegistryPortMock(['v1']);
        const presetPort = createPresetConfigPortMock();
        const generator = new TemplateGenerator(validatorPort, presetPort);
        // Act
        const actual = await generator.generateConfig('standard', 'consistency-check');
        // Assert
        expect(actual.value.triggerCondition).toBe('schedule');
      });
    });

    // UT-TG-008
    context('templateType="pre-commit"を渡した場合（D6ルール）', () => {
      it('triggerCondition="pre-commit"になる', async () => {
        // Arrange
        const validatorPort = createValidatorIdRegistryPortMock(['v1']);
        const presetPort = createPresetConfigPortMock();
        const generator = new TemplateGenerator(validatorPort, presetPort);
        // Act
        const actual = await generator.generateConfig('standard', 'pre-commit');
        // Assert
        expect(actual.value.triggerCondition).toBe('pre-commit');
      });
    });
  });
});
```

### 3.9 RepetitionDetector

```typescript
// scripts/harness/__tests__/unit/ci-governance/services/repetition-detector.test.ts

import { target, context } from '../../../helpers/test-helpers.js';
import { describe, it, expect, vi } from 'vitest';
import { RepetitionDetector } from '../../../../ci-governance/domain/services/repetition-detector.js';
import { createErrorRepetition, createErrorRepetitionRepositoryPortMock } from '../../../helpers/test-helpers.js';

target('RepetitionDetector', () => {
  describe('detectテスト', () => {
    // UT-RD-001
    context('error.code="L1-001"（初回発生）でfindByCodeがnullを返す場合', () => {
      it('新規ErrorRepetitionが生成され・save()が呼ばれ・occurrenceCount=1でnullが返る', async () => {
        // Arrange
        const repoPort = createErrorRepetitionRepositoryPortMock(null);
        const detector = new RepetitionDetector(repoPort);
        const error = { code: 'L1-001', severity: 'error', message: 'test' };
        // Act
        const actual = await detector.detect(error as any);
        // Assert
        expect(actual).toBeNull();
        expect(repoPort.save).toHaveBeenCalledTimes(1);
        const saved = repoPort.save.mock.calls[0][0];
        expect(saved.occurrenceCount).toBe(1);
      });
    });

    // UT-RD-002
    context('error.code="L1-001"（2回目発生）でfindByCodeがoccurrenceCount=1のインスタンスを返す場合', () => {
      it('increment()後にsave()が呼ばれ・occurrenceCount=2でnullが返る', async () => {
        // Arrange
        let er = createErrorRepetition({ code: 'L1-001' });
        er = er.increment(); // occurrenceCount=1
        const repoPort = createErrorRepetitionRepositoryPortMock(er);
        const detector = new RepetitionDetector(repoPort);
        const error = { code: 'L1-001', severity: 'error', message: 'test' };
        // Act
        const actual = await detector.detect(error as any);
        // Assert
        expect(actual).toBeNull();
        const saved = repoPort.save.mock.calls[0][0];
        expect(saved.occurrenceCount).toBe(2);
      });
    });

    // UT-RD-003
    context('error.code="L1-001"（3回目: threshold=3に到達）でoccurrenceCount=2のインスタンスを返す場合', () => {
      it('increment()後にsave()が呼ばれ・escalated=trueになりEscalationActionが返る', async () => {
        // Arrange
        let er = createErrorRepetition({ code: 'L1-001', threshold: 3 });
        er = er.increment().increment(); // occurrenceCount=2
        const repoPort = createErrorRepetitionRepositoryPortMock(er);
        const detector = new RepetitionDetector(repoPort);
        const error = { code: 'L1-001', severity: 'error', message: 'test' };
        // Act
        const actual = await detector.detect(error as any);
        // Assert
        expect(actual).not.toBeNull();
        expect(actual!.logLevel).toBeDefined();
      });
    });

    // UT-RD-004
    context('save()がI/O失敗した場合', () => {
      it('HarnessErrorがスローされる', async () => {
        // Arrange
        const repoPort = {
          findByCode: vi.fn().mockResolvedValue(null),
          save: vi.fn().mockRejectedValue(new Error('I/O failure')),
        };
        const detector = new RepetitionDetector(repoPort);
        const error = { code: 'L1-001', severity: 'error', message: 'test' };
        // Act & Assert
        await expect(detector.detect(error as any)).rejects.toThrow();
      });
    });

    // UT-RD-005
    context('error.code="L1-001"（2回目、閾値未満）でoccurrenceCount=1のインスタンスを返す場合', () => {
      it('nullが返る（エスカレーション未発生）', async () => {
        // Arrange
        let er = createErrorRepetition({ threshold: 3 });
        er = er.increment(); // occurrenceCount=1
        const repoPort = createErrorRepetitionRepositoryPortMock(er);
        const detector = new RepetitionDetector(repoPort);
        const error = { code: 'L1-001', severity: 'error', message: 'test' };
        // Act
        const actual = await detector.detect(error as any);
        // Assert
        expect(actual).toBeNull();
      });
    });
  });
});
```

### 3.10 PointerValidator

```typescript
// scripts/harness/__tests__/unit/ci-governance/services/pointer-validator.test.ts

import { target, context } from '../../../helpers/test-helpers.js';
import { describe, it, expect, vi } from 'vitest';
import { PointerValidator } from '../../../../ci-governance/domain/services/pointer-validator.js';
import {
  createCommandPointerEntry,
  createFilePointerEntry,
  createCommandExistencePortMock,
  createFileExistencePortMock,
  createAdrExistencePortMock,
} from '../../../helpers/test-helpers.js';

target('PointerValidator', () => {
  describe('validateテスト', () => {
    // UT-PV-001
    context('CommandPointerを含むPointerEntry[]でexists=trueが返る場合', () => {
      it('HarnessError[]が空配列（Dead Pointerなし）', async () => {
        // Arrange
        const cmdPort = createCommandExistencePortMock(true);
        const filePort = createFileExistencePortMock(true);
        const adrPort = createAdrExistencePortMock(true);
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        const entries = [createCommandPointerEntry({ command: 'phasegate:status' })];
        // Act
        const actual = await validator.validate(entries);
        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    // UT-PV-002
    context('存在しないCommandPointerを含むPointerEntry[]でexists=falseが返る場合', () => {
      it('AGENTS_MD_DEAD_POINTERエラーを含むHarnessError[]が返る', async () => {
        // Arrange
        const cmdPort = createCommandExistencePortMock(false);
        const filePort = createFileExistencePortMock(true);
        const adrPort = createAdrExistencePortMock(true);
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        const entries = [createCommandPointerEntry({ command: 'harness:unknown' })];
        // Act
        const actual = await validator.validate(entries);
        // Assert
        expect(actual.length).toBeGreaterThan(0);
        expect(actual[0].code).toContain('DEAD_POINTER');
      });
    });

    // UT-PV-003
    context('FilePointerを含むPointerEntry[]でexists=trueが返る場合', () => {
      it('HarnessError[]が空配列（Dead Pointerなし）', async () => {
        // Arrange
        const cmdPort = createCommandExistencePortMock(true);
        const filePort = createFileExistencePortMock(true);
        const adrPort = createAdrExistencePortMock(true);
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        const entries = [createFilePointerEntry({ filePath: 'docs/README.md' })];
        // Act
        const actual = await validator.validate(entries);
        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    // UT-PV-004
    context('存在しないFilePointerを含むPointerEntry[]でexists=falseが返る場合', () => {
      it('AGENTS_MD_DEAD_POINTERエラーを含むHarnessError[]が返る', async () => {
        // Arrange
        const cmdPort = createCommandExistencePortMock(true);
        const filePort = createFileExistencePortMock(false);
        const adrPort = createAdrExistencePortMock(true);
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        const entries = [createFilePointerEntry({ filePath: 'docs/nonexistent.md' })];
        // Act
        const actual = await validator.validate(entries);
        // Assert
        expect(actual.length).toBeGreaterThan(0);
      });
    });

    // UT-PV-005
    context('adrLinks=["ADR-001"]（存在するADR）でexists=trueが返る場合', () => {
      it('HarnessError[]が空配列', async () => {
        // Arrange
        const cmdPort = createCommandExistencePortMock(true);
        const filePort = createFileExistencePortMock(true);
        const adrPort = createAdrExistencePortMock(true);
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        // Act
        const actual = await validator.validateAdrLinks(['ADR-001']);
        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    // UT-PV-006
    context('adrLinks=["ADR-999"]（存在しないADR）でexists=falseが返る場合', () => {
      it('AGENTS_MD_DEAD_POINTERエラーを含むHarnessError[]が返る', async () => {
        // Arrange
        const cmdPort = createCommandExistencePortMock(true);
        const filePort = createFileExistencePortMock(true);
        const adrPort = createAdrExistencePortMock(false);
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        // Act
        const actual = await validator.validateAdrLinks(['ADR-999']);
        // Assert
        expect(actual.length).toBeGreaterThan(0);
      });
    });

    // UT-PV-007
    context('CommandPointer（存在）とFilePointer（不存在）が混在する場合', () => {
      it('FilePointerのみのエラーが返る', async () => {
        // Arrange
        const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
        const filePort = { exists: vi.fn().mockResolvedValue(false) };
        const adrPort = createAdrExistencePortMock(true);
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        const entries = [
          createCommandPointerEntry({ key: 'cmd-exist' }),
          createFilePointerEntry({ key: 'file-missing', filePath: 'docs/missing.md' }),
        ];
        // Act
        const actual = await validator.validate(entries);
        // Assert
        expect(actual).toHaveLength(1);
      });
    });

    // UT-PV-008
    context('空のPointerEntry[]を渡した場合', () => {
      it('HarnessError[]が空配列（ポートは呼び出されない）', async () => {
        // Arrange
        const cmdPort = createCommandExistencePortMock(true);
        const filePort = createFileExistencePortMock(true);
        const adrPort = createAdrExistencePortMock(true);
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        // Act
        const actual = await validator.validate([]);
        // Assert
        expect(actual).toHaveLength(0);
        expect(cmdPort.exists).not.toHaveBeenCalled();
        expect(filePort.exists).not.toHaveBeenCalled();
      });
    });
  });
});
```

### 3.11 LessonAggregator

```typescript
// scripts/harness/__tests__/unit/ci-governance/services/lesson-aggregator.test.ts

import { target, context } from '../../../helpers/test-helpers.js';
import { describe, it, expect } from 'vitest';
import { LessonAggregator } from '../../../../ci-governance/domain/services/lesson-aggregator.js';
import { createLessonArtifact } from '../../../helpers/test-helpers.js';

target('LessonAggregator', () => {
  describe('aggregateテスト', () => {
    // UT-LA-001
    context('重複なしのLessonArtifact[] 3件を渡した場合', () => {
      it('Result.ok(PointerEntry[])が返り・PointerEntries.length=3', () => {
        // Arrange
        const aggregator = new LessonAggregator();
        const artifacts = [
          createLessonArtifact({ lessonId: '550e8400-e29b-41d4-a716-446655440001' }),
          createLessonArtifact({ lessonId: '550e8400-e29b-41d4-a716-446655440002' }),
          createLessonArtifact({ lessonId: '550e8400-e29b-41d4-a716-446655440003' }),
        ];
        // Act
        const actual = aggregator.aggregate(artifacts);
        // Assert
        expect(actual.isOk()).toBe(true);
        expect(actual.value).toHaveLength(3);
      });
    });

    // UT-LA-002
    context('同一lessonId（UUID）が2件含まれるLessonArtifact[]を渡した場合', () => {
      it('Result.fail([DUPLICATE_LESSON_ID HarnessError])が返る', () => {
        // Arrange
        const aggregator = new LessonAggregator();
        const duplicateId = '550e8400-e29b-41d4-a716-446655440001';
        const artifacts = [
          createLessonArtifact({ lessonId: duplicateId }),
          createLessonArtifact({ lessonId: duplicateId }),
        ];
        // Act
        const actual = aggregator.aggregate(artifacts);
        // Assert
        expect(actual.isOk()).toBe(false);
        expect(actual.error[0].code).toContain('DUPLICATE_LESSON_ID');
      });
    });

    // UT-LA-003
    context('空のLessonArtifact[]を渡した場合', () => {
      it('Result.ok([])が返る', () => {
        // Arrange
        const aggregator = new LessonAggregator();
        // Act
        const actual = aggregator.aggregate([]);
        // Assert
        expect(actual.isOk()).toBe(true);
        expect(actual.value).toHaveLength(0);
      });
    });

    // UT-LA-004
    context('正常な1件のLessonArtifactに対するPointerEntry変換を確認した場合', () => {
      it('key="lesson-{lessonId}"形式・type="file"のPointerEntryが返る', () => {
        // Arrange
        const aggregator = new LessonAggregator();
        const lessonId = '550e8400-e29b-41d4-a716-446655440001';
        const artifacts = [createLessonArtifact({ lessonId })];
        // Act
        const actual = aggregator.aggregate(artifacts);
        // Assert
        expect(actual.value[0].key).toBe(`lesson-${lessonId}`);
        expect(actual.value[0].type).toBe('file');
      });
    });

    // UT-LA-005
    context('3件のうち2件が同一lessonIdを持つLessonArtifact[]を渡した場合', () => {
      it('Result.fail()が返り・重複検出エラーが含まれる', () => {
        // Arrange
        const aggregator = new LessonAggregator();
        const duplicateId = '550e8400-e29b-41d4-a716-446655440001';
        const artifacts = [
          createLessonArtifact({ lessonId: '550e8400-e29b-41d4-a716-446655440000' }),
          createLessonArtifact({ lessonId: duplicateId }),
          createLessonArtifact({ lessonId: duplicateId }),
        ];
        // Act
        const actual = aggregator.aggregate(artifacts);
        // Assert
        expect(actual.isOk()).toBe(false);
        expect(actual.error.length).toBeGreaterThan(0);
      });
    });
  });

  describe('PointerEntry変換ルールテスト', () => {
    // UT-LA-006
    context('lessonId="abc-123-def"のLessonArtifactを変換した場合', () => {
      it('key="lesson-abc-123-def"のPointerEntryが生成される', () => {
        // Arrange
        const aggregator = new LessonAggregator();
        const artifacts = [createLessonArtifact({ lessonId: 'abc-123-def-0000-000000000001' })];
        // Act
        const actual = aggregator.aggregate(artifacts);
        // Assert
        expect(actual.value[0].key).toBe('lesson-abc-123-def-0000-000000000001');
      });
    });

    // UT-LA-007
    context('lessonId="invalid-id"（非UUID形式）を持つLessonArtifactを渡した場合（INV-12）', () => {
      it('バリデーションエラーが返る', () => {
        // Arrange
        const aggregator = new LessonAggregator();
        const artifacts = [createLessonArtifact({ lessonId: 'invalid-id' })];
        // Act
        const actual = aggregator.aggregate(artifacts);
        // Assert
        expect(actual.isOk()).toBe(false);
      });
    });
  });
});
```

## 4. WI-365 実装突合レビュー記録（2026-08-06）

<!-- @work-item-id WI-365 -->

`p2:check-freshness` で error 判定（104 日経過）となったため、タイムスタンプ更新ではなく
**現行実装との突合レビュー**を実施した。

### 4.1 検証済み（記述と実装が一致）

- §1 の 11 パスはすべて実在し、**11 件のケース数もすべて実測と一致**（10/10/4/11/14/16/12/8/5/8/7、合計 105）。
- §2.1〜2.3 のファクトリ・モック 16 種は `scripts/harness/__tests__/helpers/test-helpers.ts` に実在。
- §3.1〜3.7 / 3.9 / 3.10 のクラス・静的ファクトリ・メソッド・ゲッター・エラーコードはすべて一致:
  `TemplateConfig.create/equals`（順序非依存ソートと `Object.freeze`）、
  `EscalationAction.create/formatMessage/equals`、`RepetitionResetCondition.create/equals/isMet`、
  `PointerEntry.createCommand/createFile/isCommand/isFile/type/key`、
  `CiTemplate.create/withConfig/validate/isConfigured/config`、
  `ErrorRepetition.create(code, threshold=3)/createWithCondition/createWithCount/increment/isEscalated/reset/getEscalationAction/resetCondition`、
  `AgentsMdPointer.create/createForTest/addPointer/replacePointer/validate`、
  `PointerValidator(cmd,file,adr).validate/validateAdrLinks`、`RepetitionDetector(repo).detect`。
- エラー ID `CI_TEMPLATE_INVALID_TYPE` / `CI_TEMPLATE_EMPTY_VALIDATORS` / `CI_TEMPLATE_NOT_CONFIGURED` /
  `AGENTS_MD_DUPLICATE_KEY` / `AGENTS_MD_INVALID_PATH` / `AGENTS_MD_DEAD_POINTER` /
  `REPETITION_RESET_FORBIDDEN` / `ERROR_REPETITION_INVALID_COUNT` / `DUPLICATE_LESSON_ID` も一致。
  既定閾値 3 も確認。

### 4.2 是正した記述

§1 に、スコープ外だが同一ディレクトリに実在する 5 ファイル（29 ケース）を注記。

### 4.3 実装差分（本 WI では事実記録に留める）

| # | 箇所 | 文書の記述 | 現行実装 |
|---|---|---|---|
| 1 | §3.11 UT-LA-007 | 非 UUID の `lessonId` で `isOk() === false`（INV-12） | `LessonAggregator` は重複 ID 検出のみで書式検証を行わない。当該入力は `ok([...])` を返すため、記載のアサーションは失敗する。実テストの同スロットは `source="domain-designer"` → `type="file"` という別ケース |
| 2 | §3.8 / §2.2 | `TemplateType` は 3 値 | `'aidlc-gate' \| 'consistency-check' \| 'pre-commit' \| 'agent-context-refresh'` の 4 値。`template-generator.ts` は `'agent-context-refresh' → 'schedule'` を写像する。「D6ルール」表と §2.2 のファクトリ型が 4 値目を欠く（実ヘルパーも同様） |
| 3 | §2.3 | `ValidatorIdRegistryPort` モックは `listAll` のみ | ポートは任意メソッド `listForPreset(presetId, templateType)` も宣言し、`TemplateGenerator` は `listForPreset ?? listAll` で**前者を優先**する（実アダプタは実装済み）。結果として文書化された `TemplateGenerator` テストはすべて `listAll` フォールバック経路しか通っていない |
