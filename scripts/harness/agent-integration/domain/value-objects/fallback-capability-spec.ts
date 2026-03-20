/**
 * @layer domain
 * @unit agent-integration
 *
 * FallbackCapabilitySpec 値オブジェクト
 * CLI/FSフォールバック能力の宣言と検証仕様
 */

export class FallbackCapabilityViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FallbackCapabilityViolationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface FallbackCapabilitySpecInput {
  supportedCommands: string[];
  noAgentApiImports: boolean;
}

export class FallbackCapabilitySpec {
  readonly supportedCommands: readonly string[];
  readonly noAgentApiImports: boolean;

  private constructor(supportedCommands: string[], noAgentApiImports: boolean) {
    this.supportedCommands = Object.freeze([...supportedCommands]);
    this.noAgentApiImports = noAgentApiImports;
  }

  static create(input: FallbackCapabilitySpecInput): FallbackCapabilitySpec {
    if (input.supportedCommands.length === 0) {
      throw new FallbackCapabilityViolationError(
        'supportedCommandsは1件以上必要です（INV-5違反）'
      );
    }
    return new FallbackCapabilitySpec(input.supportedCommands, input.noAgentApiImports);
  }

  includesCommand(command: string): boolean {
    return this.supportedCommands.includes(command);
  }

  requiresNoAgentApiImports(): boolean {
    return this.noAgentApiImports;
  }

  equals(other: FallbackCapabilitySpec): boolean {
    if (this.noAgentApiImports !== other.noAgentApiImports) return false;
    if (this.supportedCommands.length !== other.supportedCommands.length) return false;
    return this.supportedCommands.every((c, i) => c === other.supportedCommands[i]);
  }
}
