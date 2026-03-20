/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

export interface ShellOptions {
  timeout?: number;
  failOnNonZero: boolean;
}

export interface ShellResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface ShellWrapperPort {
  execute(script: string, options: ShellOptions): Promise<ShellResult>;
}
