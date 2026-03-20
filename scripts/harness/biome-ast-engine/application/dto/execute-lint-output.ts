/**
 * @layer application
 * @unit biome-ast-engine
 */

import type { LintReport } from '../../domain/value-objects/lint-report.js';
import type { FilePath } from '../../domain/value-objects/file-path.js';

export type ExecuteLintOutput = {
  readonly report: LintReport;
  readonly checkedFiles: readonly FilePath[];
};
