// @unit ci-governance
// @layer infrastructure
// @story WI-247

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { PointerValidator } from '../../../ci-governance/domain/services/pointer-validator.js';
import { PointerEntry } from '../../../ci-governance/domain/value-objects/pointer-entry.js';
import { AdrFoundationExistenceAdapter } from '../../../ci-governance/infrastructure/adapters/adr-foundation-existence-adapter.js';
import { FileSystemExistenceAdapter } from '../../../ci-governance/infrastructure/adapters/file-system-existence-adapter.js';
import { HarnessApiCommandExistenceAdapter } from '../../../ci-governance/infrastructure/adapters/harness-api-command-existence-adapter.js';

const testDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(testDir, '..', '..', '..', '..', '..');

target('validate-pointers real corpus integration（WI-247）', () => {
  context('ADR existence adapter', () => {
    it('実在するADRはADR-013形式でexistsがtrueを返す', async () => {
      // Arrange
      const adapter = new AdrFoundationExistenceAdapter(rootDir);

      // Act
      const exists = await adapter.exists('ADR-013');

      // Assert
      expect(exists).toBe(true);
    });

    it('実在するADRは013形式でもtrueを返す', async () => {
      // Arrange
      const adapter = new AdrFoundationExistenceAdapter(rootDir);

      // Act
      const exists = await adapter.exists('013');

      // Assert
      expect(exists).toBe(true);
    });

    it('存在しないADR-999はfalseを返す', async () => {
      // Arrange
      const adapter = new AdrFoundationExistenceAdapter(rootDir);

      // Act
      const exists = await adapter.exists('ADR-999');

      // Assert
      expect(exists).toBe(false);
    });

    it('不正形式のADR IDは例外を投げずfalseを返す', async () => {
      // Arrange
      const adapter = new AdrFoundationExistenceAdapter(rootDir);

      // Act
      const exists = await adapter.exists('not-an-adr');

      // Assert
      expect(exists).toBe(false);
    });
  });

  context('Harness command existence adapter', () => {
    it('実在コマンドphasegate:statusはtrueを返す', async () => {
      // Arrange
      const adapter = new HarnessApiCommandExistenceAdapter();

      // Act
      const exists = await adapter.exists('phasegate:status');

      // Assert
      expect(exists).toBe(true);
    });

    it('偽コマンドはfalseを返す', async () => {
      // Arrange
      const adapter = new HarnessApiCommandExistenceAdapter();

      // Act
      const exists = await adapter.exists('phasegate:no-such-command');

      // Assert
      expect(exists).toBe(false);
    });
  });

  context('PointerValidator real adapters', () => {
    it('有効ポインタのみのAGENTS.mdはPointerValidatorで違反0件になる', async () => {
      // Arrange
      const validator = new PointerValidator(
        new HarnessApiCommandExistenceAdapter(),
        new FileSystemExistenceAdapter(rootDir),
        new AdrFoundationExistenceAdapter(rootDir),
      );
      const entries = [
        PointerEntry.createCommand({
          key: 'phasegate-status',
          command: 'phasegate:status',
          description: 'PhaseGate status command',
        }),
        PointerEntry.createFile({
          key: 'readme',
          filePath: 'README.md',
          description: 'Repository README',
        }),
      ];

      // Act
      const pointerViolations = await validator.validate(entries);
      const adrViolations = await validator.validateAdrLinks(['ADR-013']);

      // Assert
      expect(pointerViolations).toEqual([]);
      expect(adrViolations).toEqual([]);
    });

    it('dead pointerは検出される（回帰の逆側）', async () => {
      // Arrange
      const validator = new PointerValidator(
        new HarnessApiCommandExistenceAdapter(),
        new FileSystemExistenceAdapter(rootDir),
        new AdrFoundationExistenceAdapter(rootDir),
      );
      const entries = [
        PointerEntry.createCommand({
          key: 'missing-command',
          command: 'phasegate:no-such-command',
          description: 'Missing command',
        }),
        PointerEntry.createFile({
          key: 'missing-file',
          filePath: 'docs/no-such-file.md',
          description: 'Missing file',
        }),
      ];

      // Act
      const violations = await validator.validate(entries);

      // Assert
      expect(violations.length).toBeGreaterThanOrEqual(1);
    });
  });
});
