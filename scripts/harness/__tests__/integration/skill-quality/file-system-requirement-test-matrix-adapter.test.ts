// @layer test
// @unit skill-quality
// @story H12-02
// @work-item-id WI-188
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { FileSystemRequirementTestMatrixAdapter } from '../../../skill-quality/infrastructure/adapters/file-system-requirement-test-matrix-adapter.js';

target('FileSystemRequirementTestMatrixAdapter', () => {
  let tmpDir: string;
  let matrixPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'phasegate-skill-matrix-'));
    matrixPath = path.join(tmpDir, 'requirement-test-matrix.json');
    fsSync.writeFileSync(matrixPath, JSON.stringify({ 'H12-02': { total: 2, covered: 1, uncoveredIds: ['AC-2'] } }));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  context('read(storyId)', () => {
    it('指定 story が存在しない場合は STORY_NOT_FOUND を返すこと', async () => {
      // Arrange
      const adapter = new FileSystemRequirementTestMatrixAdapter(matrixPath);

      // Act
      const actual = await adapter.read('NONEXISTENT-99').catch((error: unknown) => error);

      // Assert
      expect(actual).toMatchObject({
        name: 'SkillQualityError',
        code: 'STORY_NOT_FOUND',
        message: `Story NONEXISTENT-99 not found in ${matrixPath}`,
      });
    });

    it('指定 story が存在する場合はその entry を返すこと', async () => {
      // Arrange
      const adapter = new FileSystemRequirementTestMatrixAdapter(matrixPath);

      // Act
      const actual = await adapter.read('H12-02');

      // Assert
      expect(actual).toEqual({
        storyId: 'H12-02',
        total: 2,
        covered: 1,
        uncoveredIds: ['AC-2'],
      });
    });
  });
});
