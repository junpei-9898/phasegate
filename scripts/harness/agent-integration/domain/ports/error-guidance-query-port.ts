// @unit agent-integration
// @layer domain

export interface ErrorGuidance {
  readonly suggestedSkill: string | null;
  readonly scaffoldCommand: string | null;
  readonly templatePath: string | null;
}

export interface ErrorGuidanceQueryPort {
  getGuidance(errorCode: string): Promise<ErrorGuidance | null>;
}
