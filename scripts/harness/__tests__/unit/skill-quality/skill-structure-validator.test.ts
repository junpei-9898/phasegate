// @layer test
import { describe, it, expect, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { SkillStructureValidator } from '../../../skill-quality/domain/services/skill-structure-validator.js';

function createMockSkillFileReaderPort(content = '') {
  return { read: vi.fn().mockResolvedValue(content), exists: vi.fn().mockResolvedValue(true) };
}

const FULL_SKILL_CONTENT = `---
name: skill-quality
---

# Purpose
This skill ensures quality.

## Inputs
- storyId

## Outputs
- result

## Prerequisites
- none

## ExecutionFlow
1. Run tests
`;

target('SkillStructureValidator', () => {

  describe('validate: 全セクションが揃っている場合は passed を返すこと', () => {
    context('全必須セクションを含む SKILL.md の場合', () => {
      it('SkillValidationResult.passed=true が返される', async () => {
        const port = createMockSkillFileReaderPort(FULL_SKILL_CONTENT);
        const validator = new SkillStructureValidator(port);
        const actual = await validator.validate('skills/skill-quality.md');
        expect(actual.passed).toBe(true);
      });
    });
  });

  describe('validate: セクションが欠落している場合は failed を返すこと', () => {
    context('purpose セクションのみを含む SKILL.md の場合', () => {
      it('SkillValidationResult.passed=false が返される', async () => {
        const content = '# Purpose\nThis skill.';
        const port = createMockSkillFileReaderPort(content);
        const validator = new SkillStructureValidator(port);
        const actual = await validator.validate('skills/skill-quality.md');
        expect(actual.passed).toBe(false);
        expect(actual.missingSection.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validate: 空ファイルの場合は全セクション欠落になること', () => {
    context('空文字列の SKILL.md の場合', () => {
      it('passed=false で missingSection が 6 件になる', async () => {
        const port = createMockSkillFileReaderPort('');
        const validator = new SkillStructureValidator(port);
        const actual = await validator.validate('skills/skill-quality.md');
        expect(actual.passed).toBe(false);
        expect(actual.missingSection).toHaveLength(6);
      });
    });
  });

  describe('validate: frontmatter がある場合に frontmatter セクションが認識されること', () => {
    context('--- で始まる YAML frontmatter がある場合', () => {
      it('actualSections に frontmatter が含まれる', async () => {
        const content = `---\nname: test\n---\n\n# Purpose\ntest`;
        const port = createMockSkillFileReaderPort(content);
        const validator = new SkillStructureValidator(port);
        const actual = await validator.validate('skills/skill-quality.md');
        expect(actual.actualSections).toContain('frontmatter');
      });
    });
  });

});
