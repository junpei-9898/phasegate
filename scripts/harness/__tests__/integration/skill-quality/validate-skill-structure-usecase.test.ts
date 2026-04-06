// @layer test
import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ValidateSkillStructureUseCase } from '../../../skill-quality/application/usecases/validate-skill-structure-usecase.js';
import { SkillStructureValidator } from '../../../skill-quality/domain/services/skill-structure-validator.js';

function createMockSkillFileReaderPort(content = '') {
  return {
    read: vi.fn().mockResolvedValue(content),
    exists: vi.fn().mockResolvedValue(true),
  };
}

function createUseCase(content: string) {
  const mockPort = createMockSkillFileReaderPort(content);
  const validator = new SkillStructureValidator(mockPort);
  const usecase = new ValidateSkillStructureUseCase(validator);
  return { usecase, mockPort };
}

target('ValidateSkillStructureUseCase', () => {

  // IT-UC-ValSkill-001
  describe('execute: 全必須セクションが揃っている場合に passed=true になること', () => {
    context("SkillFileReaderPort が全 6 セクションを含む Markdown を返す場合", () => {
      it('output.result.passed=true, missingSection=[]', async () => {
        // Arrange
        const fullMarkdown = `---\n## 目的\n## 入力\n## 出力\n## 前提条件\n## 実行フロー\n`;
        const { usecase } = createUseCase(fullMarkdown);
        // Act
        const actual = await usecase.execute({ skillFilePath: 'skills/example.skill' });
        // Assert
        expect(actual.result.passed).toBe(true);
        expect(actual.result.missingSection).toHaveLength(0);
      });
    });
  });

  // IT-UC-ValSkill-002
  describe("execute: 'purpose' が欠落している場合に passed=false になること", () => {
    context("SkillFileReaderPort が 'purpose' セクションなしの Markdown を返す場合", () => {
      it('output.result.passed=false, missingSection=[purpose]', async () => {
        // Arrange
        const missingPurpose = `---\n## 入力\n## 出力\n## 前提条件\n## 実行フロー\n`;
        const { usecase } = createUseCase(missingPurpose);
        // Act
        const actual = await usecase.execute({ skillFilePath: 'skills/example.skill' });
        // Assert
        expect(actual.result.passed).toBe(false);
        expect(actual.result.missingSection).toContain('purpose');
      });
    });
  });

  // IT-UC-ValSkill-003
  describe('execute: ファイルが存在しない場合に SKILL_FILE_NOT_FOUND エラーになること', () => {
    context('SkillFileReaderPort が HarnessError(SKILL_FILE_NOT_FOUND) をスローする場合', () => {
      it('HarnessError(SKILL_FILE_NOT_FOUND) が伝播する', async () => {
        // Arrange
        const mockPort = {
          read: vi.fn().mockRejectedValue(
            Object.assign(new Error('not found'), { code: 'SKILL_FILE_NOT_FOUND' }),
          ),
          exists: vi.fn().mockResolvedValue(false),
        };
        const validator = new SkillStructureValidator(mockPort);
        const usecase = new ValidateSkillStructureUseCase(validator);
        // Act & Assert
        await expect(usecase.execute({ skillFilePath: 'skills/nonexistent.skill' })).rejects.toThrow(
          expect.objectContaining({ code: expect.stringContaining('SKILL_FILE_NOT_FOUND') }),
        );
      });
    });
  });

});
