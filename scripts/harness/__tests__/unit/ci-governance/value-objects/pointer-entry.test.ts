import { target, context } from '../../../helpers/test-helpers.js';
import { describe, it, expect } from 'vitest';
import { PointerEntry } from '../../../../ci-governance/domain/value-objects/pointer-entry.js';

target('PointerEntry', () => {
  describe('CommandPointer生成テスト', () => {
    // UT-PE-001
    context('有効なkey・command・descriptionを渡した場合', () => {
      it('type="command"のPointerEntryが生成される', () => {
        const actual = PointerEntry.createCommand({ key: 'cmd-status', command: 'harness:status', description: 'ステータス確認' });
        expect(actual.type).toBe('command');
        expect(actual.key).toBe('cmd-status');
      });
    });

    // UT-PE-002
    context('key=""（空文字）を渡した場合', () => {
      it('key空文字不可エラーがスローされる', () => {
        expect(() => PointerEntry.createCommand({ key: '', command: 'harness:lint', description: '...' })).toThrow();
      });
    });

    // UT-PE-003
    context('command=""（空文字）を渡した場合', () => {
      it('command空文字不可エラーがスローされる', () => {
        expect(() => PointerEntry.createCommand({ key: 'k', command: '', description: '...' })).toThrow();
      });
    });
  });

  describe('FilePointer生成テスト', () => {
    // UT-PE-004
    context('有効なkey・filePath（相対パス）・descriptionを渡した場合', () => {
      it('type="file"のPointerEntryが生成される', () => {
        const actual = PointerEntry.createFile({ key: 'file-readme', filePath: 'docs/README.md', description: 'README' });
        expect(actual.type).toBe('file');
        expect(actual.key).toBe('file-readme');
      });
    });

    // UT-PE-005
    context('filePath="/absolute/path.md"（絶対パス）を渡した場合', () => {
      it('INV-11違反で絶対パス不正エラーがスローされる', () => {
        expect(() => PointerEntry.createFile({ key: 'file-abs', filePath: '/absolute/path.md', description: '...' })).toThrow();
      });
    });

    // UT-PE-006
    context('key=""（空文字）のFilePointerを生成しようとした場合', () => {
      it('key空文字不可エラーがスローされる', () => {
        expect(() => PointerEntry.createFile({ key: '', filePath: 'docs/foo.md', description: '...' })).toThrow();
      });
    });
  });

  describe('不変条件テスト', () => {
    // UT-PE-007
    context('filePath="/Users/foo/bar.md"（絶対パス）でFilePointerを生成しようとした場合（INV-11）', () => {
      it('生成が失敗する', () => {
        expect(() => PointerEntry.createFile({ key: 'k', filePath: '/Users/foo/bar.md', description: '...' })).toThrow();
      });
    });
  });

  describe('判別メソッドテスト', () => {
    // UT-PE-008
    context('CommandPointerに対してisCommand()を呼ぶ場合', () => {
      it('trueを返す', () => {
        const actual = PointerEntry.createCommand({ key: 'cmd-1', command: 'harness:status', description: '...' });
        expect(actual.isCommand()).toBe(true);
      });
    });

    // UT-PE-009
    context('CommandPointerに対してisFile()を呼ぶ場合', () => {
      it('falseを返す', () => {
        const actual = PointerEntry.createCommand({ key: 'cmd-1', command: 'harness:status', description: '...' });
        expect(actual.isFile()).toBe(false);
      });
    });

    // UT-PE-010
    context('FilePointerに対してisFile()を呼ぶ場合', () => {
      it('trueを返す', () => {
        const actual = PointerEntry.createFile({ key: 'file-1', filePath: 'docs/foo.md', description: '...' });
        expect(actual.isFile()).toBe(true);
      });
    });

    // UT-PE-011
    context('FilePointerに対してisCommand()を呼ぶ場合', () => {
      it('falseを返す', () => {
        const actual = PointerEntry.createFile({ key: 'file-1', filePath: 'docs/foo.md', description: '...' });
        expect(actual.isCommand()).toBe(false);
      });
    });
  });
});
