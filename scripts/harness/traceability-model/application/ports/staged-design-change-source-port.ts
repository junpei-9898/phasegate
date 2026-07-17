// @unit traceability-model
// @layer application
// @work-item-id WI-305

import type { DesignChangeReadResultDto } from "../dto/changed-design-fragment-dto.js";

export interface StagedDesignChangeSourcePort {
  observe(stagedFiles: readonly string[]): Promise<DesignChangeReadResultDto>;
}
