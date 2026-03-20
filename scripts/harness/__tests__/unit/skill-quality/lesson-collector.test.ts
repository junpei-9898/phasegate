import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { LessonCollector } from '../../../skill-quality/domain/services/lesson-collector.js';
import { SourceContext } from '../../../skill-quality/domain/value-objects/source-context.js';
import type { RawLessonEntry } from '../../../skill-quality/domain/ports/lesson-source-reader-port.js';

function createRawEntry(content: string, source = 'scripts/harness/foo.ts'): RawLessonEntry {
  return {
    content,
    sourceContext: SourceContext.create(source),
    tags: [],
  };
}

function createMockLessonSourceReaderPort(entriesByCall: RawLessonEntry[][] = []) {
  let callIndex = 0;
  return {
    read: vi.fn().mockImplementation(() => Promise.resolve(entriesByCall[callIndex++] ?? [])),
  };
}

target('LessonCollector', () => {

  describe('collect: sources=[] の場合は空配列を返すこと', () => {
    context('sources=[] の場合', () => {
      it('collect() が空配列を返す', async () => {
        const port = createMockLessonSourceReaderPort([]);
        const collector = new LessonCollector(port);
        const actual = await collector.collect([]);
        expect(actual).toHaveLength(0);
      });
    });
  });

  describe('collect: 1ソースから 2 件のエントリを収集できること', () => {
    context('1 つのソースが 2 件の RawLessonEntry を返す場合', () => {
      it('collect() が 2 件の Lesson を返す', async () => {
        const port = createMockLessonSourceReaderPort([
          [createRawEntry('教訓A'), createRawEntry('教訓B')],
        ]);
        const collector = new LessonCollector(port);
        const actual = await collector.collect(['scripts/harness/foo.ts']);
        expect(actual).toHaveLength(2);
      });
    });
  });

  describe('collect: 2ソースからエントリをフラットに収集できること', () => {
    context('2 つのソースが各 1 件の RawLessonEntry を返す場合', () => {
      it('collect() が 2 件の Lesson を返す', async () => {
        const port = createMockLessonSourceReaderPort([
          [createRawEntry('教訓A')],
          [createRawEntry('教訓B')],
        ]);
        const collector = new LessonCollector(port);
        const actual = await collector.collect(['source1', 'source2']);
        expect(actual).toHaveLength(2);
      });
    });
  });

  describe('collect: エントリが 0 件のソースは空配列を貢献する', () => {
    context('ソースが空の RawLessonEntry[] を返す場合', () => {
      it('collect() が 0 件を返す', async () => {
        const port = createMockLessonSourceReaderPort([[]]);
        const collector = new LessonCollector(port);
        const actual = await collector.collect(['empty-source']);
        expect(actual).toHaveLength(0);
      });
    });
  });

});
