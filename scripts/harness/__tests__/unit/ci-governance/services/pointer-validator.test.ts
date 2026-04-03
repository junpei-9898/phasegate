import {
  target, context,
  createCommandPointerEntry,
  createFilePointerEntry,
  createCommandExistencePortMock,
  createFileExistencePortMock,
  createAdrExistencePortMock,
} from '../../../helpers/test-helpers.js';
import { describe, it, vi, expect } from 'vitest';
import { PointerValidator } from '../../../../ci-governance/domain/services/pointer-validator.js';

target('PointerValidator', () => {
  describe('validateテスト', () => {
    // UT-PV-001
    context('CommandPointerを含むPointerEntry[]でexists=trueが返る場合', () => {
      it('HarnessError[]が空配列（Dead Pointerなし）', async () => {
        const cmdPort = createCommandExistencePortMock(true);
        const filePort = createFileExistencePortMock(true);
        const adrPort = createAdrExistencePortMock(true);
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        const entries = [createCommandPointerEntry({ command: 'phasegate:status' })];
        const actual = await validator.validate(entries);
        expect(actual).toHaveLength(0);
      });
    });

    // UT-PV-002
    context('存在しないCommandPointerを含むPointerEntry[]でexists=falseが返る場合', () => {
      it('AGENTS_MD_DEAD_POINTERエラーを含むHarnessError[]が返る', async () => {
        const cmdPort = createCommandExistencePortMock(false);
        const filePort = createFileExistencePortMock(true);
        const adrPort = createAdrExistencePortMock(true);
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        const entries = [createCommandPointerEntry({ command: 'phasegate:unknown' })];
        const actual = await validator.validate(entries);
        expect(actual.length).toBeGreaterThan(0);
        expect(actual[0].code).toContain('DEAD_POINTER');
      });
    });

    // UT-PV-003
    context('FilePointerを含むPointerEntry[]でexists=trueが返る場合', () => {
      it('HarnessError[]が空配列（Dead Pointerなし）', async () => {
        const cmdPort = createCommandExistencePortMock(true);
        const filePort = createFileExistencePortMock(true);
        const adrPort = createAdrExistencePortMock(true);
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        const entries = [createFilePointerEntry({ filePath: 'docs/README.md' })];
        const actual = await validator.validate(entries);
        expect(actual).toHaveLength(0);
      });
    });

    // UT-PV-004
    context('存在しないFilePointerを含むPointerEntry[]でexists=falseが返る場合', () => {
      it('AGENTS_MD_DEAD_POINTERエラーを含むHarnessError[]が返る', async () => {
        const cmdPort = createCommandExistencePortMock(true);
        const filePort = createFileExistencePortMock(false);
        const adrPort = createAdrExistencePortMock(true);
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        const entries = [createFilePointerEntry({ filePath: 'docs/nonexistent.md' })];
        const actual = await validator.validate(entries);
        expect(actual.length).toBeGreaterThan(0);
      });
    });

    // UT-PV-005
    context('adrLinks=["ADR-001"]（存在するADR）でexists=trueが返る場合', () => {
      it('HarnessError[]が空配列', async () => {
        const cmdPort = createCommandExistencePortMock(true);
        const filePort = createFileExistencePortMock(true);
        const adrPort = createAdrExistencePortMock(true);
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        const actual = await validator.validateAdrLinks(['ADR-001']);
        expect(actual).toHaveLength(0);
      });
    });

    // UT-PV-006
    context('adrLinks=["ADR-999"]（存在しないADR）でexists=falseが返る場合', () => {
      it('AGENTS_MD_DEAD_POINTERエラーを含むHarnessError[]が返る', async () => {
        const cmdPort = createCommandExistencePortMock(true);
        const filePort = createFileExistencePortMock(true);
        const adrPort = createAdrExistencePortMock(false);
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        const actual = await validator.validateAdrLinks(['ADR-999']);
        expect(actual.length).toBeGreaterThan(0);
      });
    });

    // UT-PV-007
    context('CommandPointer（存在）とFilePointer（不存在）が混在する場合', () => {
      it('FilePointerのみのエラーが返る', async () => {
        const cmdPort = { exists: vi.fn().mockResolvedValue(true) };
        const filePort = { exists: vi.fn().mockResolvedValue(false) };
        const adrPort = createAdrExistencePortMock(true);
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        const entries = [
          createCommandPointerEntry({ key: 'cmd-exist' }),
          createFilePointerEntry({ key: 'file-missing', filePath: 'docs/missing.md' }),
        ];
        const actual = await validator.validate(entries);
        expect(actual).toHaveLength(1);
      });
    });

    // UT-PV-008
    context('空のPointerEntry[]を渡した場合', () => {
      it('HarnessError[]が空配列（ポートは呼び出されない）', async () => {
        const cmdPort = createCommandExistencePortMock(true);
        const filePort = createFileExistencePortMock(true);
        const adrPort = createAdrExistencePortMock(true);
        const validator = new PointerValidator(cmdPort, filePort, adrPort);
        const actual = await validator.validate([]);
        expect(actual).toHaveLength(0);
        expect(cmdPort.exists).not.toHaveBeenCalled();
        expect(filePort.exists).not.toHaveBeenCalled();
      });
    });
  });
});
