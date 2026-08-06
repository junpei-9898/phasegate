/**
 * @layer domain
 * @unit phase-dependency-model
 * @work-item-id WI-369
 */

import type { PathRoots } from '../values/artifact.js';
import type { PhaseNode } from '../values/phase-node.js';
import type { PlanEvidence } from '../values/plan-evidence.js';
import type { PlanningMode } from '../values/planning-mode.js';

export interface PlanDocumentReaderPort {
  /**
   * plan 文書の存在と QA evidence を読む。
   *
   * `pathRoots` は `phasegate.config.json` の `paths` を解決したもの。
   * 省略時は既定ルート（`docs/inception` / `docs/product/construction`）を使う。
   * WI-369: これを渡さないと `paths.inceptionDocs` を移設した PJ で
   * plan 文書だけが既定パスから探され、成果物検査と plan evidence の
   * 探索先がズレる（成果物は在るのに「plan文書が不足」で落ちる）。
   */
  readEvidence(
    node: PhaseNode,
    scope: { unitId?: string; storyId?: string },
    expectedMode: PlanningMode,
    pathRoots?: PathRoots,
  ): Promise<PlanEvidence>;
}
