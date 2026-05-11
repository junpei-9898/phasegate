// @unit installation
// @layer domain
// @work-item-id WI-145

import type { CheckId } from "./check-id.js";
import type { RepairMode } from "./repair-mode.js";
import { SuggestedSkill, type SuggestedSkillInput } from "./suggested-skill.js";

export type DiagnosticSeverity = "red" | "warn";

export interface DiagnosticFindingInput {
  readonly checkId: CheckId;
  readonly severity: DiagnosticSeverity;
  readonly target: string;
  readonly message: string;
  readonly repairMode: RepairMode;
  readonly repairHint: string | null;
  readonly suggestedSkill: SuggestedSkill | SuggestedSkillInput | null;
}

export interface DiagnosticFindingJson extends Omit<DiagnosticFindingInput, "suggestedSkill"> {
  readonly suggestedSkill: SuggestedSkillInput | null;
}

export class DiagnosticFinding {
  readonly checkId: CheckId;
  readonly severity: DiagnosticSeverity;
  readonly target: string;
  readonly message: string;
  readonly repairMode: RepairMode;
  readonly repairHint: string | null;
  readonly suggestedSkill: SuggestedSkill | null;

  private constructor(input: DiagnosticFindingInput) {
    const suggestedSkill = input.suggestedSkill instanceof SuggestedSkill
      ? input.suggestedSkill
      : input.suggestedSkill === null
        ? null
        : SuggestedSkill.create(input.suggestedSkill);
    if (input.repairMode === "ai-assisted" && suggestedSkill === null) {
      throw new Error("DiagnosticFinding requires suggestedSkill for ai-assisted repairMode");
    }
    if (input.target.trim().length === 0 || input.message.trim().length === 0) {
      throw new Error("DiagnosticFinding target and message are required");
    }
    this.checkId = input.checkId;
    this.severity = input.severity;
    this.target = input.target;
    this.message = input.message;
    this.repairMode = input.repairMode;
    this.repairHint = input.repairHint;
    this.suggestedSkill = suggestedSkill;
    Object.freeze(this);
  }

  static create(input: DiagnosticFindingInput): DiagnosticFinding {
    return new DiagnosticFinding(input);
  }

  toJSON(): DiagnosticFindingJson {
    return {
      checkId: this.checkId,
      severity: this.severity,
      target: this.target,
      message: this.message,
      repairMode: this.repairMode,
      repairHint: this.repairHint,
      suggestedSkill: this.suggestedSkill?.toJSON() ?? null,
    };
  }
}
