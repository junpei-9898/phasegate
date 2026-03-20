/**
 * @layer infrastructure
 * @unit skill-quality
 */
import { readFile, access } from 'node:fs/promises';
import type { SkillFileReaderPort } from '../../domain/ports/skill-file-reader-port.js';
import { SkillQualityError } from '../../domain/errors/skill-quality-error.js';

export class FileSystemSkillFileReaderAdapter implements SkillFileReaderPort {
  async read(filePath: string): Promise<string> {
    try {
      return await readFile(filePath, 'utf-8');
    } catch {
      throw new SkillQualityError('SKILL_FILE_NOT_FOUND', `Skill file not found: ${filePath}`);
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
