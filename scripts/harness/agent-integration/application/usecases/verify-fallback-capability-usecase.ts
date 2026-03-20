/**
 * @layer application
 * @unit agent-integration
 * @story H11-01
 *
 * VerifyFallbackCapabilityUseCase
 * CLI/FSフォールバック保証検証のオーケストレーション
 */

import { FallbackCapabilitySpec, FallbackCapabilityViolationError } from '../../domain/value-objects/fallback-capability-spec.js';
import { AsyncFallbackVerificationService } from '../../domain/services/fallback-verification-service.js';
import type { VerifyFallbackCapabilityInput, VerifyFallbackCapabilityOutput } from '../dto/verify-fallback-capability-dto.js';

export interface VerifyFallbackCapabilityUseCasePorts {
  importAnalyzerPort: {
    analyzeAgentApiImports(targetFilePaths: string[]): Promise<Array<{ filePath: string; agentApiImports: string[] }>>;
  };
  cliCommandRegistryPort: {
    hasCommand(commandName: string): Promise<boolean>;
    listCommands(): Promise<readonly string[]>;
  };
}

export class VerifyFallbackCapabilityUseCase {
  private readonly verificationService: AsyncFallbackVerificationService;

  constructor(ports: VerifyFallbackCapabilityUseCasePorts) {
    this.verificationService = new AsyncFallbackVerificationService({
      importAnalyzerPort: ports.importAnalyzerPort,
      cliCommandRegistryPort: ports.cliCommandRegistryPort,
    });
  }

  async execute(input: VerifyFallbackCapabilityInput): Promise<VerifyFallbackCapabilityOutput> {
    // INV-5: supportedCommands が空の場合は FallbackCapabilityViolationError
    if (input.supportedCommands.length === 0) {
      throw new FallbackCapabilityViolationError(
        'supportedCommandsは1件以上必要です（INV-5違反）'
      );
    }

    const spec = FallbackCapabilitySpec.create({
      supportedCommands: input.supportedCommands,
      noAgentApiImports: input.noAgentApiImports,
    });

    const targetFilePaths = input.targetFilePaths ?? [];
    const { violations, isValid } = await this.verificationService.verify(spec, targetFilePaths);

    return { isValid, violations, spec };
  }
}
