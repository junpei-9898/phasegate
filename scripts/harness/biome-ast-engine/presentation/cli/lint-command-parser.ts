/**
 * @layer presentation
 * @unit biome-ast-engine
 */

export interface ParsedLintCommand {
  readonly targets: readonly string[];
  readonly json: boolean;
  readonly skipEslintRemovalCheck: boolean;
  readonly valid: boolean;
  readonly errorMessage?: string;
}

export function parseLintCommand(argv: readonly string[]): Readonly<ParsedLintCommand> {
  const targets: string[] = [];
  let json = false;
  let skipEslintRemovalCheck = false;
  let collectingTargets = false;

  for (const arg of argv) {
    if (arg === '--json') {
      json = true;
      collectingTargets = false;
    } else if (arg === '--skip-eslint-removal-check') {
      skipEslintRemovalCheck = true;
      collectingTargets = false;
    } else if (arg === '--target') {
      collectingTargets = true;
    } else if (arg.startsWith('--')) {
      return Object.freeze({
        targets: Object.freeze([]),
        json: false,
        skipEslintRemovalCheck: false,
        valid: false,
        errorMessage: `Unknown flag: ${arg}`,
      });
    } else if (collectingTargets) {
      targets.push(arg);
    }
  }

  return Object.freeze({
    targets: Object.freeze(targets),
    json,
    skipEslintRemovalCheck,
    valid: true,
  });
}
