// @layer test
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
  let lessonsDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `lesson-reader-test-${Date.now()}`);
    lessonsDir = path.join(tmpDir, '.harness', 'lessons');
    await fs.mkdir(lessonsDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('readAllテスト', () => {
    // IT-REPO-LessonArtifactReader-001
    context('lessons/ディレクトリに2件の有効な.jsonが存在する場合', () => {
      it('LessonArtifact[] 2件が返る', async () => {
        await fs.writeFile(
          path.join(lessonsDir, 'lesson1.json'),
          JSON.stringify(validLesson('550e8400-e29b-41d4-a716-446655440001')),
          'utf-8'
        );
        await fs.writeFile(
          path.join(lessonsDir, 'lesson2.json'),
          JSON.stringify(validLesson('550e8400-e29b-41d4-a716-446655440002')),
          'utf-8'
        );
        const adapter = new LessonArtifactFileReaderAdapter(tmpDir);
        const actual = await adapter.readAll();
        expect(actual).toHaveLength(2);
      });
    });

    // IT-REPO-LessonArtifactReader-003
    context('スキーマ不正な.jsonと有効な.jsonが混在する場合', () => {
      it('有効な1件のみが返る（不正ファイルは読み飛ばされる）', async () => {
        await fs.writeFile(
          path.join(lessonsDir, 'invalid.json'),
          '{ invalid json }',
          'utf-8'
        );
        await fs.writeFile(
          path.join(lessonsDir, 'valid.json'),
          JSON.stringify(validLesson('550e8400-e29b-41d4-a716-446655440001')),
          'utf-8'
        );
        const adapter = new LessonArtifactFileReaderAdapter(tmpDir);
        const actual = await adapter.readAll();
        expect(actual).toHaveLength(1);
      });
    });

    // IT-REPO-LessonArtifactReader-004
    context('lessonsディレクトリが存在しない場合', () => {
      it('空配列が返る', async () => {
        await fs.rm(lessonsDir, { recursive: true });
        const adapter = new LessonArtifactFileReaderAdapter(tmpDir);
        const actual = await adapter.readAll();
        expect(actual).toEqual([]);
      });
    });
  });

  describe('readBySourceテスト', () => {
    // IT-REPO-LessonArtifactReader-002
    context('source="domain-designer"を指定した場合', () => {
      it('指定スキル名のartifactのみ1件返る', async () => {
        await fs.writeFile(
          path.join(lessonsDir, 'lesson-si.json'),
          JSON.stringify(validLesson('550e8400-e29b-41d4-a716-446655440001', 'story-implementor')),
          'utf-8'
        );
        await fs.writeFile(
          path.join(lessonsDir, 'lesson-dd.json'),
          JSON.stringify(validLesson('550e8400-e29b-41d4-a716-446655440002', 'domain-designer')),
          'utf-8'
        );
        const adapter = new LessonArtifactFileReaderAdapter(tmpDir);
        const actual = await adapter.readBySource('domain-designer');
        expect(actual).toHaveLength(1);
        expect(actual[0].source).toBe('domain-designer');
      });
    });
  });
});
