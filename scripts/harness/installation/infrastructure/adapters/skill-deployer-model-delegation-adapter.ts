// @unit installation
// @layer infrastructure
// @work-item-id WI-219

import { readModelDelegationPolicy, renderSkillForModelDelegation } from "../../../setup/skill-deployer.js";
import type { ModelDelegationPolicy, ModelDelegationPort } from "../../application/ports/model-delegation-port.js";

export class SkillDeployerModelDelegationAdapter implements ModelDelegationPort {
  readPolicy(projectRoot: string): Promise<ModelDelegationPolicy> {
    return readModelDelegationPolicy(projectRoot);
  }

  renderSkill(content: string, policy: ModelDelegationPolicy): string {
    return renderSkillForModelDelegation(content, policy);
  }
}
