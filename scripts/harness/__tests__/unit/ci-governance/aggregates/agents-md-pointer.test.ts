import { target, context, createAgentsMdPointer, createCommandPointerEntry, createFilePointerEntry } from '../../../helpers/test-helpers.js';
import { describe, it, expect } from 'vitest';
import { AgentsMdPointer } from '../../../../ci-governance/domain/aggregates/agents-md-pointer.js';

target('AgentsMdPointer', () => {
  describe('生成テスト（create）', () => {
    // UT-AMP-001
    context('引数なしでcreateを呼ぶ場合', () => {
      it('pointers=[]・adrLinks=[]の空AgentsMdPointerが生成される', () => {
        const actual = AgentsMdPointer.create();
        expect(actual.pointers).toHaveLength(0);
        expect(actual.adrLinks).toHaveLength(0);
      });
    });

    // UT-AMP-002
    context('有効なPointerEntry[]（key一意）を渡した場合', () => {
      it('指定PointerEntry[]でAgentsMdPointerが生成される', () => {
        const pointers = [
          createCommandPointerEntry({ key: 'cmd-1' }),
          createFilePointerEntry({ key: 'file-1' }),
        ];
        const actual = AgentsMdPointer.create(pointers);
        expect(actual.pointers).toHaveLength(2);
      });
    });

    // UT-AMP-003
    context('key重複のPointerEntry[]を渡した場合', () => {
      it('CiGovernanceDomainErrorがスローされる（INV-8違反）', () => {
        const pointers = [
          createCommandPointerEntry({ key: 'same-key' }),
          createFilePointerEntry({ key: 'same-key' }),
        ];
        expect(() => AgentsMdPointer.create(pointers)).toThrow();
      });
    });
  });

  describe('addPointerテスト', () => {
    // UT-AMP-004
    context('空AgentsMdPointerに新規CommandPointerをaddPointer()した場合', () => {
      it('pointers.length=1になる', () => {
        const pointer = createAgentsMdPointer();
        const entry = createCommandPointerEntry();
        const actual = pointer.addPointer(entry);
        expect(actual.pointers).toHaveLength(1);
      });
    });

    // UT-AMP-005
    context('既存keyと異なるkeyのPointerEntryをaddPointer()した場合', () => {
      it('正常に追加される（pointers.length増加）', () => {
        const pointer = createAgentsMdPointer({
          pointers: [createCommandPointerEntry({ key: 'existing-key' })],
        });
        const newEntry = createFilePointerEntry({ key: 'new-key' });
        const actual = pointer.addPointer(newEntry);
        expect(actual.pointers).toHaveLength(2);
      });
    });

    // UT-AMP-006
    context('既存keyと同一keyのPointerEntryをaddPointer()した場合', () => {
      it('CiGovernanceDomainErrorがスローされる（INV-8違反）', () => {
        const pointer = createAgentsMdPointer({
          pointers: [createCommandPointerEntry({ key: 'dup-key' })],
        });
        const dupEntry = createFilePointerEntry({ key: 'dup-key' });
        expect(() => pointer.addPointer(dupEntry)).toThrow();
      });
    });
  });

  describe('replacePointerテスト', () => {
    // UT-AMP-007
    context('既存keyのPointerEntryをreplacePointer()した場合', () => {
      it('既存エントリが新エントリに置換される（pointers.length変化なし）', () => {
        const pointer = createAgentsMdPointer({
          pointers: [createCommandPointerEntry({ key: 'cmd-1', command: 'phasegate:old' })],
        });
        const newEntry = createCommandPointerEntry({ key: 'cmd-1', command: 'phasegate:new' });
        const actual = pointer.replacePointer(newEntry);
        expect(actual.pointers).toHaveLength(1);
        expect((actual.pointers[0] as any).command).toBe('phasegate:new');
      });
    });

    // UT-AMP-008
    context('存在しないkeyのPointerEntryをreplacePointer()した場合', () => {
      it('新規追加として扱われる（pointers.length増加）', () => {
        const pointer = createAgentsMdPointer({
          pointers: [createCommandPointerEntry({ key: 'existing' })],
        });
        const newEntry = createFilePointerEntry({ key: 'new-key' });
        const actual = pointer.replacePointer(newEntry);
        expect(actual.pointers).toHaveLength(2);
      });
    });
  });

  describe('validateテスト（構造的不変条件）', () => {
    // UT-AMP-009
    context('有効なpointers（相対パスのFilePointer含む）を持つAgentsMdPointerに対してvalidate()を呼ぶ場合', () => {
      it('HarnessError[]が空配列を返す（検証通過）', () => {
        const pointer = createAgentsMdPointer({
          pointers: [createFilePointerEntry({ filePath: 'docs/readme.md' })],
        });
        const actual = pointer.validate();
        expect(actual).toHaveLength(0);
      });
    });

    // UT-AMP-010
    context('絶対パスのfilePathを持つFilePointerを含むAgentsMdPointerに対してvalidate()を呼ぶ場合', () => {
      it('INV-11違反のHarnessErrorを含むHarnessError[]が返る', () => {
        const pointer = AgentsMdPointer.createForTest([
          { type: 'file', key: 'abs-path', filePath: '/absolute/path.md', description: '...' },
        ]);
        const actual = pointer.validate();
        expect(actual.length).toBeGreaterThan(0);
      });
    });
  });

  describe('不変条件テスト', () => {
    // UT-AMP-011
    context('同一keyを持つ2つのPointerEntryをaddPointer()で順番に追加しようとした場合（INV-8）', () => {
      it('2件目のaddPointer()でエラーがスローされる', () => {
        const pointer = createAgentsMdPointer();
        const entry1 = createCommandPointerEntry({ key: 'dup' });
        const entry2 = createFilePointerEntry({ key: 'dup' });
        const withFirst = pointer.addPointer(entry1);
        expect(() => withFirst.addPointer(entry2)).toThrow();
      });
    });

    // UT-AMP-012 (additional)
    context('addPointer()は元のインスタンスを変更しない（イミュータブル）', () => {
      it('元インスタンスのpointers.lengthが変化しない', () => {
        const original = createAgentsMdPointer();
        const entry = createCommandPointerEntry({ key: 'new-cmd' });
        original.addPointer(entry);
        expect(original.pointers).toHaveLength(0);
      });
    });
  });
});
