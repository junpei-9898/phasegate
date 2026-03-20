/**
 * @layer domain
 * @unit nyquist-validation
 *
 * storyId が matrix に存在しない場合のエラー
 */
import { NyquistDomainError } from './nyquist-domain-error.js';

export class StoryNotFoundError extends NyquistDomainError {
  constructor(storyId: string) {
    super(`storyIdが見つかりません: ${storyId}`);
    this.name = 'StoryNotFoundError';
  }
}
