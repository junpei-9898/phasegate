/**
 * @layer domain
 * @unit adr-foundation
 */
export type AdrBodyProps = Readonly<{
  context?: string;
  decision?: string;
  consequences?: string;
  alternatives?: string | undefined;
}>;

export class AdrBodySectionRequiredError extends Error {
  constructor(sectionName: string) {
    super(`ADR本文の必須セクションが不足しています: ${sectionName}`);
    this.name = 'AdrBodySectionRequiredError';
  }
}

export class AdrBody {
  readonly context: string;
  readonly decision: string;
  readonly consequences: string;
  readonly alternatives: string | undefined;

  private constructor(
    context: string,
    decision: string,
    consequences: string,
    alternatives?: string,
  ) {
    this.context = context;
    this.decision = decision;
    this.consequences = consequences;
    this.alternatives = alternatives;
    Object.freeze(this);
  }

  static create(props: AdrBodyProps): AdrBody {
    const context = props.context?.trim() ?? '';
    const decision = props.decision?.trim() ?? '';
    const consequences = props.consequences?.trim() ?? '';
    const alternatives =
      props.alternatives === undefined ? undefined : props.alternatives.trim();

    if (context.length === 0) {
      throw new AdrBodySectionRequiredError('Context');
    }

    if (decision.length === 0) {
      throw new AdrBodySectionRequiredError('Decision');
    }

    if (consequences.length === 0) {
      throw new AdrBodySectionRequiredError('Consequences');
    }

    if (props.alternatives !== undefined && alternatives?.length === 0) {
      throw new AdrBodySectionRequiredError('Alternatives');
    }

    return new AdrBody(context, decision, consequences, alternatives);
  }

  withAlternatives(alternatives?: string): AdrBody {
    return AdrBody.create({
      context: this.context,
      decision: this.decision,
      consequences: this.consequences,
      alternatives,
    });
  }

  toSectionMap(): Record<'Context' | 'Decision' | 'Consequences' | 'Alternatives', string | undefined> {
    return {
      Context: this.context,
      Decision: this.decision,
      Consequences: this.consequences,
      Alternatives: this.alternatives,
    };
  }

  equals(other: AdrBody): boolean {
    return (
      this.context === other.context &&
      this.decision === other.decision &&
      this.consequences === other.consequences &&
      this.alternatives === other.alternatives
    );
  }
}
