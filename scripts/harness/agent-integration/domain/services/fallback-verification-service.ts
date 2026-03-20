/**
 * @layer domain
 * @unit agent-integration
 *
 * FallbackVerificationService ドメインサービス
 * FallbackCapabilitySpec に基づきフォールバック能力を検証する
 */

import type { FallbackCapabilitySpec } from '../value-objects/fallback-capability-spec.js';

export class AgentApiImportViolationError extends Error {
  readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = 'AgentApiImportViolationError';
    this.code = 'H11-IMPORT-VIOLATION';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class CommandNotRegisteredViolationError extends Error {
  readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = 'CommandNotRegisteredViolationError';
    this.code = 'H11-CMD-NOT-REGISTERED';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface FallbackVerificationServicePorts {
  importAnalyzerPort: {
    detectAgentApiImports: () => string[];
  };
  cliCommandRegistryPort: {
    has: (command: string) => boolean;
  };
}

/**
 * 同期版 FallbackVerificationService（ユニットテスト用）
 */
export class FallbackVerificationService {
  private readonly importAnalyzerPort: FallbackVerificationServicePorts['importAnalyzerPort'];
  private readonly cliCommandRegistryPort: FallbackVerificationServicePorts['cliCommandRegistryPort'];

  constructor(ports: FallbackVerificationServicePorts) {
    this.importAnalyzerPort = ports.importAnalyzerPort;
    this.cliCommandRegistryPort = ports.cliCommandRegistryPort;
  }

  verify(spec: FallbackCapabilitySpec): Error[] {
    const violations: Error[] = [];

    // Import チェック
    if (spec.requiresNoAgentApiImports()) {
      const detectedImports = this.importAnalyzerPort.detectAgentApiImports();
      for (const importEntry of detectedImports) {
        violations.push(
          new AgentApiImportViolationError(
            `エージェント固有APIのimportが検出されました: ${importEntry}`
          )
        );
      }
    }

    // コマンド登録確認
    for (const command of spec.supportedCommands) {
      const hasCommand = this.cliCommandRegistryPort.has(command);
      if (!hasCommand) {
        violations.push(
          new CommandNotRegisteredViolationError(
            `CLIコマンドが未登録です: ${command}`
          )
        );
      }
    }

    return violations;
  }
}

/**
 * 非同期版 FallbackVerificationService（UseCase用）
 */
export class AsyncFallbackVerificationService {
  private readonly importAnalyzerPort: {
    analyzeAgentApiImports(targetFilePaths: string[]): Promise<Array<{ filePath: string; agentApiImports: string[] }>>;
  };
  private readonly cliCommandRegistryPort: {
    hasCommand(commandName: string): Promise<boolean>;
  };

  constructor(deps: {
    importAnalyzerPort: {
      analyzeAgentApiImports(targetFilePaths: string[]): Promise<Array<{ filePath: string; agentApiImports: string[] }>>;
    };
    cliCommandRegistryPort: {
      hasCommand(commandName: string): Promise<boolean>;
    };
  }) {
    this.importAnalyzerPort = deps.importAnalyzerPort;
    this.cliCommandRegistryPort = deps.cliCommandRegistryPort;
  }

  async verify(
    spec: FallbackCapabilitySpec,
    targetFilePaths: string[]
  ): Promise<{ violations: Error[]; isValid: boolean }> {
    const violations: Error[] = [];

    // Import チェック
    if (spec.requiresNoAgentApiImports()) {
      const results = await this.importAnalyzerPort.analyzeAgentApiImports(targetFilePaths);
      for (const result of results) {
        for (const importPath of result.agentApiImports) {
          violations.push(
            new AgentApiImportViolationError(
              `エージェント固有APIのimportが検出されました: ${result.filePath}: ${importPath}`
            )
          );
        }
      }
    }

    // コマンド登録確認
    for (const command of spec.supportedCommands) {
      const hasCommand = await this.cliCommandRegistryPort.hasCommand(command);
      if (!hasCommand) {
        violations.push(
          new CommandNotRegisteredViolationError(
            `CLIコマンドが未登録です: ${command}`
          )
        );
      }
    }

    return { violations, isValid: violations.length === 0 };
  }
}
