// @story H04-01
// @unit config-foundation
// @layer integration
// @work-item-id WI-220
import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.restoreAllMocks(); vi.resetModules(); });

describe('選択した設定スキーマの必要時読込', () => {
  it('未使用schemaを読まず版ごとに再利用して各documentを検証すること', async () => {
    // Arrange
    vi.resetModules();
    const reads = vi.spyOn(fs, 'readFileSync');
    const count = (version: string) => reads.mock.calls.filter(([path]) => String(path).endsWith(`harness-config-${version}.schema.json`)).length;

    // Act / Assert: loading the adapter does not compile either version.
    const { AjvConfigSchemaValidator } = await import('../../../config-foundation/infrastructure/validators/ajv-config-schema-validator.js');
    const validator = new AjvConfigSchemaValidator();
    expect([count('v2'), count('v3')]).toEqual([0, 0]);

    const actualV2 = validator.validate({ project: { name: 'lazy-schema', preset: 'standard' } });
    expect(actualV2).toEqual([]);
    expect([count('v2'), count('v3')]).toEqual([1, 0]);
    const invalid = new AjvConfigSchemaValidator().validate({ project: { name: 'lazy-schema', preset: 'invalid' } });
    expect(invalid).toEqual(expect.arrayContaining([expect.objectContaining({ errorCode: 'L1-002', path: '/project/preset' })]));
    expect([count('v2'), count('v3')]).toEqual([1, 0]);

    const actualV3 = validator.validate({ project: { name: 'lazy-schema', preset: 'standard' }, architecture: { preset: 'clean' } });
    expect(actualV3).toEqual([]);
    expect([count('v2'), count('v3')]).toEqual([1, 1]);
    expect(validator.validate({ project: { name: 'again', preset: 'standard' } })).toEqual([]);
    expect([count('v2'), count('v3')]).toEqual([1, 1]);
  });

  it('必要schemaの読込失敗を伝播し原因解消後には再検証できること', async () => {
    // Arrange
    vi.resetModules();
    const { AjvConfigSchemaValidator } = await import('../../../config-foundation/infrastructure/validators/ajv-config-schema-validator.js');
    const read = fs.readFileSync;
    const reads = vi.spyOn(fs, 'readFileSync').mockImplementation(((path: fs.PathOrFileDescriptor, options: unknown) => {
      if (String(path).endsWith('harness-config-v2.schema.json')) throw new Error('fixture schema unavailable');
      return read(path, options as never);
    }) as typeof fs.readFileSync);
    const validator = new AjvConfigSchemaValidator();
    const document = { project: { name: 'recovery', preset: 'standard' } };

    // Act / Assert
    expect(() => validator.validate(document)).toThrow('fixture schema unavailable');
    reads.mockRestore();
    const actual = validator.validate(document);
    expect(actual).toEqual([]);
  });
});
