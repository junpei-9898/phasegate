/**
 * @layer domain
 * @unit ci-governance
 *
 * RepetitionDetectorドメインサービス
 */

import type { ErrorRepetitionRepositoryPort } from '../ports/error-repetition-repository-port.js';
import { ErrorRepetition } from '../aggregates/error-repetition.js';
import type { EscalationAction } from '../value-objects/escalation-action.js';

export interface DetectResult {
  readonly escalationAction: EscalationAction | null;
  readonly currentCount: number;
  readonly escalated: boolean;
}

export class RepetitionDetector {
  constructor(
    private readonly errorRepetitionRepository: ErrorRepetitionRepositoryPort,
  ) {}

  /**
   * エラー発生を検出し、ErrorRepetitionを更新する
   * @returns EscalationAction | null (UT test spec に合わせてシンプルな型を返す)
   */
  async detect(error: { code: string; message?: string }): Promise<EscalationAction | null> {
    const result = await this.detectWithCount(error);
    return result.escalationAction;
  }

  /**
   * エラー発生を検出し、カウント情報も含めて返す（UseCase層向け）
   */
  async detectWithCount(error: { code: string; message?: string }): Promise<DetectResult> {
    let errorRepetition = await this.errorRepetitionRepository.findByCode(error.code);

    if (errorRepetition === null) {
      errorRepetition = ErrorRepetition.create(error.code);
    }

    const updated = errorRepetition.increment();
    await this.errorRepetitionRepository.save(updated);

    return {
      escalationAction: updated.isEscalated() ? updated.getEscalationAction() : null,
      currentCount: updated.occurrenceCount,
      escalated: updated.isEscalated(),
    };
  }
}
