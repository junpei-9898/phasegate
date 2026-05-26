/**
 * @layer test
 * @unit validator-system
 * @story H08-03
 * @work-item-id WI-217
 */
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { context, target } from '../../../helpers/test-helpers.js';
import { FileSystemWorkItemReflectionAdapter } from '../../../../validator-system/infrastructure/adapters/file-system-work-item-reflection-adapter.js';

async function createPersonalReflectionFixture() {
  const root = await mkdtemp(join(tmpdir(), 'phasegate-wi217-reflection-'));
  await mkdir(join(root, '.phasegate-local/inception/ID/ID-09/ID-09-02'), { recursive: true });
  await mkdir(join(root, '.phasegate-local/product/construction/validator-system'), { recursive: true });
  await writeFile(join(root, '.phasegate-local/inception/ID/ID-09/ID-09-02/description.md'), [
    '---',
    'id: ID-09-02',
    'type: issue',
    'severity: high',
    'status: drafted',
    '---',
    '',
    '# ID-09-02',
    '',
  ].join('\n'));
  await writeFile(join(root, '.phasegate-local/product/construction/validator-system/logical_design.md'), [
    '# Design',
    '',
    '<!-- @work-item-id ID-09-02 -->',
    '',
  ].join('\n'));

  return new FileSystemWorkItemReflectionAdapter(root);
}

target('FileSystemWorkItemReflectionAdapter', () => {
  describe('personal rootのwork item反映を収集する', () => {
    context('project固有IDのdescriptionとproduct annotationがある場合', () => {
      it('personal work item reflection snapshotを返すこと', async () => {
        // Arrange
        const adapter = await createPersonalReflectionFixture();

        // Act
        const actual = await adapter.collect({
          inceptionRoot: '.phasegate-local/inception',
          designRoot: '.phasegate-local/product/construction',
        });

        // Assert
        expect(actual.workItems).toEqual([
          expect.objectContaining({
            id: 'ID-09-02',
            path: '.phasegate-local/inception/ID/ID-09/ID-09-02/description.md',
            type: 'issue',
          }),
        ]);
        expect(actual.productRefs).toEqual([
          expect.objectContaining({
            id: 'ID-09-02',
            path: '.phasegate-local/product/construction/validator-system/logical_design.md',
          }),
        ]);
      });
    });
  });
});
