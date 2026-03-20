/**
 * @layer application
 * @unit biome-ast-engine
 */

import type { FilePath } from '../../domain/value-objects/file-path.js';
import type { LintReport } from '../../domain/value-objects/lint-report.js';
import type { ExecuteLintOutput } from '../dto/execute-lint-output.js';

export const toExecuteLintOutput = (
  report: LintReport,
  checkedFiles: readonly FilePath[]
): Readonly<ExecuteLintOutput> =>
  Object.freeze({
    report,
    checkedFiles: Object.freeze([...checkedFiles]),
  });
