// @unit traceability-model
// @layer application
// @work-item-id WI-305

import type { DesignChangeReadResultDto } from "../dto/changed-design-fragment-dto.js";
import type { StagedDesignChangeSourcePort } from "../ports/staged-design-change-source-port.js";

export class DesignChangeReadFacade {
  constructor(private readonly source: StagedDesignChangeSourcePort) {}

  observe(stagedFiles: readonly string[]): Promise<DesignChangeReadResultDto> {
    return this.source.observe(stagedFiles);
  }
}
