import { HookDefinition } from '../../../fuse-hooks-engine/domain/aggregates/hook-definition.js';
import { CompletionGate } from '../../../fuse-hooks-engine/domain/entities/completion-gate.js';
import { FUSEMount } from '../../../fuse-hooks-engine/domain/entities/fuse-mount.js';
import { HookAction } from '../../../fuse-hooks-engine/domain/value-objects/hook-action.js';
import { FilePattern } from '../../../fuse-hooks-engine/domain/value-objects/file-pattern.js';
import { HookType } from '../../../fuse-hooks-engine/domain/value-objects/hook-type.js';
import { MagicFile } from '../../../fuse-hooks-engine/domain/value-objects/magic-file.js';

export const createHookType = (value = 'pre-write') => HookType.create(value)._unsafeUnwrap();

export const createFilePattern = (
  overrides: Partial<{ includePatterns: string[]; excludePatterns: string[] }> = {},
) =>
  FilePattern.create(
    overrides.includePatterns ?? ['**/*.ts'],
    overrides.excludePatterns ?? [],
  )._unsafeUnwrap();

export const createBlockWriteAction = (
  overrides: Partial<{ reason: string; notifyUser: boolean }> = {},
) =>
  HookAction.create('block-write', {
    reason: overrides.reason ?? 'Protected file',
    notifyUser: overrides.notifyUser ?? true,
  })._unsafeUnwrap();

export const createAllowReadAction = (
  overrides: Partial<{ maxAccessCount: number }> = {},
) =>
  HookAction.create('allow-read', {
    maxAccessCount: overrides.maxAccessCount,
  })._unsafeUnwrap();

export const createRunShellAction = (
  overrides: Partial<{ script: string; timeout: number; failOnNonZero: boolean }> = {},
) =>
  HookAction.create('run-shell', {
    script: overrides.script ?? 'echo hook executed',
    timeout: overrides.timeout ?? 5000,
    failOnNonZero: overrides.failOnNonZero ?? true,
  })._unsafeUnwrap();

export const createTriggerCompletionAction = (gateId = 'story-gate') =>
  HookAction.create('trigger-completion-check', { gateId })._unsafeUnwrap();

export const createMagicFile = (
  overrides: Partial<{ filePath: string; requiredFields: string[] }> = {},
) =>
  MagicFile.create(
    overrides.filePath ?? '.harness/done/HF1-01.done',
    overrides.requiredFields ?? [],
  )._unsafeUnwrap();

export const createPreWriteHookDefinition = (
  overrides: Partial<{ includePatterns: string[]; action: HookAction }> = {},
) =>
  HookDefinition.create(
    createHookType('pre-write'),
    createFilePattern({ includePatterns: overrides.includePatterns ?? ['**/*.ts'] }),
    overrides.action ?? createBlockWriteAction(),
  )._unsafeUnwrap();

export const createOnCompleteHookDefinition = () =>
  HookDefinition.create(
    createHookType('on-complete'),
    createFilePattern({ includePatterns: ['.harness/done/*.done'] }),
    createTriggerCompletionAction(),
  )._unsafeUnwrap();

export const createFuseMount = (mountPath = '/project/root') => FUSEMount.create(mountPath);

export const createCompletionGate = (storyId = 'HF1-05') =>
  CompletionGate.create(storyId, createMagicFile());
