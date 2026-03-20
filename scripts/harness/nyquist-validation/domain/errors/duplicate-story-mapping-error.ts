/**
 * @layer domain
 * @unit nyquist-validation
 *
 * 集約内に同一 storyId の StoryMapping が複数存在する場合のエラー
 */
import { NyquistDomainError } from './nyquist-domain-error.js';

export class DuplicateStoryMappingError extends NyquistDomainError {
  constructor(storyId: string) {
    super(`storyIdが重複しています: ${storyId}`);
    this.name = 'DuplicateStoryMappingError';
  }
}
