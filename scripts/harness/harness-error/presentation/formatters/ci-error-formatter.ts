/**
 * @layer presentation
 * @unit harness-error
 *
 * HarnessErrorContract を GitHub Actions アノテーション形式に変換するフォーマッター
 */
import type { HarnessErrorContract } from '../../application/dto/harness-error-contract.js';

export interface CiErrorFormatterOutput {
  readonly text: string;
}

export class CiErrorFormatter {
  format(errors: readonly HarnessErrorContract[]): CiErrorFormatterOutput {
    if (errors.length === 0) {
      return { text: '' };
    }

    const lines: string[] = errors.map((error) => {
      const level = error.severity === 'error' ? 'error' : 'warning';
      const title = `${error.code}: ${error.message}`;
      return `::${level} title=${title}::${error.suggestion}`;
    });

    return { text: lines.join('\n') };
  }
}
