// @unit ci-governance
// @layer domain

export const DESIGN_PHASES = [
  'logical',
  'domain',
  'uiux',
  'unit-test',
  'it-test',
] as const;

export type DesignPhaseValue = (typeof DESIGN_PHASES)[number];

export class DesignPhase {
  private constructor(readonly value: DesignPhaseValue) {}

  static create(input: string): DesignPhase {
    if (!DESIGN_PHASES.includes(input as DesignPhaseValue)) {
      throw new Error(
        `未知の設計 phase: "${input}"。許容値: ${DESIGN_PHASES.join(', ')}`,
      );
    }
    return new DesignPhase(input as DesignPhaseValue);
  }

  static isValid(input: string): input is DesignPhaseValue {
    return (DESIGN_PHASES as readonly string[]).includes(input);
  }

  equals(other: DesignPhase): boolean {
    return this.value === other.value;
  }

  /** このフェーズに対応するテンプレートファイル名（`docs/templates/` 配下） */
  get templateFileName(): string {
    switch (this.value) {
      case 'logical':
        return 'logical_design.template.md';
      case 'domain':
        return 'domain_model.template.md';
      case 'uiux':
        return 'uiux_design.template.md';
      case 'unit-test':
        return 'unit_test_design.template.md';
      case 'it-test':
        return 'it_test_design.template.md';
    }
  }

  /** このフェーズで書き込む設計文書のファイル名（`docs/product/construction/{unit}/` 配下） */
  get designDocFileName(): string {
    switch (this.value) {
      case 'logical':
        return 'logical_design.md';
      case 'domain':
        return 'domain_model.md';
      case 'uiux':
        return 'uiux_design.md';
      case 'unit-test':
        return 'unit_test_design.md';
      case 'it-test':
        return 'it_test_design.md';
    }
  }
}
