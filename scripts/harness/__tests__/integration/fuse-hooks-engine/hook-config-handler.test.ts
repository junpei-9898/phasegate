import { describe, expect, it, vi } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { HookConfigHandler } from '../../../fuse-hooks-engine/presentation/handlers/hook-config-handler.js';

target('HookConfigHandler', () => {
  it('IT-HF-036 load結果をJSONで返すこと', async () => {
    // Arrange
    const loadUseCase = { execute: vi.fn().mockResolvedValue({ definitions: [], protectedResources: [], errors: [] }) };
    const validateUseCase = { execute: vi.fn() };
    const sut = new HookConfigHandler(loadUseCase as never, validateUseCase as never);
    // Act
    const actual = await sut.handle(['load', '.harness-hooks.yml']);
    // Assert
    expect(() => JSON.parse(actual.output)).not.toThrow();
  });
});
