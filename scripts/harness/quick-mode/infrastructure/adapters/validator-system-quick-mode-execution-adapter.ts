// @layer infrastructure
// @unit quick-mode

import type { ValidatorExecutionPort } from '../../application/ports/validator-execution-port.js';
import type { ValidatorRelaxationProfileContract } from '../../application/dto/validator-relaxation-profile-contract.js';

export class ValidatorSystemQuickModeExecutionAdapter implements ValidatorExecutionPort {
  async executeWithProfile(profile: ValidatorRelaxationProfileContract): Promise<void> {
    const { createValidatorSystemModule } = await import('../../../validator-system/composition-root.js');
    const module = createValidatorSystemModule();
    await module.runQuickModeUseCase.execute({
      relaxationProfile: profile,
      targetPaths: [],
      unitName: '',
      currentPhase: '',
    });
  }
}
