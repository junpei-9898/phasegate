/**
 * @layer domain
 * @unit nyquist-validation
 *
 * filePath が空文字または空白のみの場合のエラー
 */
import { NyquistDomainError } from './nyquist-domain-error.js';

export class EmptyFilePathError extends NyquistDomainError {
  constructor() {
    super('filePathは空文字または空白のみにはできません');
    this.name = 'EmptyFilePathError';
  }
}
