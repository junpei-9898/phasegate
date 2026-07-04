// @unit installation
// @layer application
// @work-item-id WI-219

export type ModelDelegationPolicy = "delegate-sonnet" | "none";

export interface ModelDelegationPort {
  readPolicy(projectRoot: string): Promise<ModelDelegationPolicy>;
  renderSkill(content: string, policy: ModelDelegationPolicy): string;
}
