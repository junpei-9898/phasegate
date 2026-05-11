// @unit installation
// @layer domain
// @work-item-id WI-145

export interface SuggestedSkillInput {
  readonly skillName: string;
  readonly rationale: string;
  readonly invokeCommand: string;
}

export class SuggestedSkill {
  readonly skillName: string;
  readonly rationale: string;
  readonly invokeCommand: string;

  private constructor(input: SuggestedSkillInput) {
    if (input.skillName.trim().length === 0 || input.invokeCommand.trim().length === 0) {
      throw new Error("SuggestedSkill skillName and invokeCommand are required");
    }
    this.skillName = input.skillName;
    this.rationale = input.rationale;
    this.invokeCommand = input.invokeCommand;
    Object.freeze(this);
  }

  static create(input: SuggestedSkillInput): SuggestedSkill {
    return new SuggestedSkill(input);
  }

  toJSON(): SuggestedSkillInput {
    return {
      skillName: this.skillName,
      rationale: this.rationale,
      invokeCommand: this.invokeCommand,
    };
  }
}
