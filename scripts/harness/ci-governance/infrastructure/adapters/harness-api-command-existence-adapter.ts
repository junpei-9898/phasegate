// @unit ci-governance
// @layer infrastructure
// @work-item-id WI-250

import { KNOWN_HARNESS_COMMANDS } from '../../../harness-api/domain/value-objects/known-harness-commands.js';
import type { CommandExistencePort } from '../../domain/ports/command-existence-port.js';

/**
 * WI-250: 既知コマンドのデフォルトは harness-api domain の canonical 定数
 * `KNOWN_HARNESS_COMMANDS` を配線する（infra ローカルの重複定義は持たない）。
 * main.ts dispatch との乖離検出は harness-api 側の conformance テストが担う。
 */
export class HarnessApiCommandExistenceAdapter implements CommandExistencePort {
  private readonly knownCommands: Set<string>;

  constructor(knownCommands: string[] = [...KNOWN_HARNESS_COMMANDS]) {
    this.knownCommands = new Set(knownCommands);
  }

  async exists(command: string): Promise<boolean> {
    return this.knownCommands.has(command);
  }
}
