/**
 * @layer domain
 * @unit agent-integration
 *
 * HookTranslationResult 値オブジェクト
 * HookEvent → CLI実行指示への変換結果
 */

export type SkipReason = 'REENTRY_DETECTED' | 'HOOK_DISABLED' | 'TIMEOUT_EXCEEDED';

export type BlockReason = 'PROTECTED_FILE' | 'PHASE_GATE' | 'FULL_MODE_REQUIRED';

export interface BlockMetadata {
  readonly reason: BlockReason;
  readonly blockedFilePath?: string;
  readonly phaseGateBlockers?: readonly string[];
  readonly phaseGateWarnings?: readonly string[];
  readonly scopeLevel?: 1 | 2 | 3;
  readonly unitId?: string;
  readonly storyId?: string;
  readonly fullModeRejectionRule?: 'MIXED_CHANGES' | 'NEW_DOMAIN' | 'API_CONTRACT';
  readonly fullModeRejectionReason?: string;
  readonly fullModeDominantCategory?: string;
}

export class HookTranslationResultInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HookTranslationResultInvariantError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface HookTranslationResultProps {
  shouldBlock: boolean;
  cliCommand?: string;
  cliArgs: string[];
  expectedExitCode: number;
  skipReason?: SkipReason;
  timeoutMs?: number;
  blockMetadata?: BlockMetadata;
}

export class HookTranslationResult {
  readonly shouldBlock: boolean;
  readonly cliCommand: string | undefined;
  readonly cliArgs: readonly string[];
  readonly expectedExitCode: number;
  readonly skipReason: SkipReason | undefined;
  readonly timeoutMs: number | undefined;
  readonly blockMetadata: BlockMetadata | undefined;

  private constructor(props: HookTranslationResultProps) {
    this.shouldBlock = props.shouldBlock;
    this.cliCommand = props.cliCommand;
    this.cliArgs = Object.freeze([...props.cliArgs]);
    this.expectedExitCode = props.expectedExitCode;
    this.skipReason = props.skipReason;
    this.timeoutMs = props.timeoutMs;
    this.blockMetadata = props.blockMetadata;
  }

  static create(props: HookTranslationResultProps): HookTranslationResult {
    // INV-2: shouldBlock=trueのときcliCommandは設定不可
    if (props.shouldBlock && props.cliCommand !== undefined) {
      throw new HookTranslationResultInvariantError(
        'shouldBlock=trueのときcliCommandは設定不可です（INV-2違反）'
      );
    }
    // INV-3: skipReasonがあるときcliCommandは設定不可
    if (props.skipReason !== undefined && props.cliCommand !== undefined) {
      throw new HookTranslationResultInvariantError(
        'skipReasonがある場合cliCommandは設定不可です（INV-3違反）'
      );
    }
    return new HookTranslationResult(props);
  }

  static block(metadata?: BlockMetadata): HookTranslationResult {
    return new HookTranslationResult({
      shouldBlock: true,
      cliArgs: [],
      expectedExitCode: 2,
      blockMetadata: metadata,
    });
  }

  static skip(reason: SkipReason): HookTranslationResult {
    return new HookTranslationResult({
      shouldBlock: false,
      skipReason: reason,
      cliArgs: [],
      expectedExitCode: 0,
    });
  }

  static execute(
    cliCommand: string,
    cliArgs: string[],
    expectedExitCode: number,
    timeoutMs?: number
  ): HookTranslationResult {
    return new HookTranslationResult({
      shouldBlock: false,
      cliCommand,
      cliArgs,
      expectedExitCode,
      timeoutMs,
    });
  }

  hasCliCommand(): boolean {
    return this.cliCommand !== undefined;
  }

  shouldSkip(): boolean {
    return this.skipReason !== undefined;
  }

  equals(other: HookTranslationResult): boolean {
    if (this.shouldBlock !== other.shouldBlock) return false;
    if (this.cliCommand !== other.cliCommand) return false;
    if (this.cliArgs.length !== other.cliArgs.length) return false;
    if (!this.cliArgs.every((a, i) => a === other.cliArgs[i])) return false;
    if (this.expectedExitCode !== other.expectedExitCode) return false;
    if (this.skipReason !== other.skipReason) return false;
    if (this.timeoutMs !== other.timeoutMs) return false;
    if (this.blockMetadata?.reason !== other.blockMetadata?.reason) return false;
    return true;
  }
}
