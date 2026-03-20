/**
 * @layer domain
 * @unit skill-quality
 */

export interface SkillFileReaderPort {
  read(filePath: string): Promise<string>;
  exists(filePath: string): Promise<boolean>;
}
