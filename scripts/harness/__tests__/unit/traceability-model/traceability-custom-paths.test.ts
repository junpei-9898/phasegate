// @unit traceability-model
// @layer test
// @work-item-id WI-093
// @story H03-01

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { createTraceabilityModelModule } from '../../../traceability-model/composition-root.js';

let rootDir: string;

async function writeFixtureFile(relativePath: string, content: string): Promise<void> {
  const absolutePath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');
}

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), 'traceability-custom-paths-'));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

target('createTraceabilityModelModule custom paths', () => {
  describe('paths.designDocsがcustom construction rootの場合', () => {
    it('story catalogとconstruction文書をcustom product rootから読むこと', async () => {
      // Arrange
      await writeFixtureFile('mydocs/product/user_stories.md', '# Stories\n- H01-01\n');
      await writeFixtureFile('mydocs/product/units/sample_unit.md', 'Unit ID: sample\n');
      await writeFixtureFile(
        'mydocs/product/construction/sample/domain_model.md',
        '# Domain\n<!-- @story-id H01-01 -->\n',
      );
      await writeFixtureFile(
        'scripts/harness/sample/domain/model.ts',
        '// @unit sample\n// @layer domain\nexport const value = 1;\n',
      );
      const sut = createTraceabilityModelModule(rootDir, {
        pathRoots: { designDocsRoot: 'mydocs/product/construction' },
      });

      // Act
      const actual = {
        storyIds: await sut.storyCatalog.getAllStoryIds(),
        chain: await sut.traceabilityChainBuilder.build(
          'scripts/harness/sample/domain/model.ts',
        ),
      };

      // Assert
      expect(actual.storyIds.map((storyId) => storyId.value)).toContain('H01-01');
      expect(actual.chain.links.map((link) => link.to.value)).toContain(
        'mydocs/product/construction/sample',
      );
      expect(actual.chain.links.map((link) => link.to.value)).toContain(
        'mydocs/product/construction/sample/domain_model.md',
      );
      expect(actual.chain.links.map((link) => link.to.value)).toContain(
        'mydocs/product/user_stories.md',
      );
    });
  });
});
