/**
 * @layer domain
 * @unit adr-foundation
 */
import { AdrId } from './adr-id.js';
import { AdrStatus, type InvalidAdrStatusError } from './adr-status.js';
import { ArchgateMapping, type ArchgateMappingProps } from './archgate-mapping.js';
import { SupersededByRef } from './superseded-by-ref.js';

const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

export type AdrFrontmatterProps = Readonly<{
  adrId?: AdrId | string;
  adr_id?: AdrId | string;
  title?: string;
  status?: AdrStatus | string;
  date?: string;
  archgate?: ArchgateMapping | ArchgateMappingProps;
  supersededBy?: SupersededByRef | string;
  superseded_by?: SupersededByRef | string;
}>;

export class AdrValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdrValidationError';
  }
}

export class SupersededByRequiredError extends Error {
  constructor() {
    super('Superseded の ADR には superseded_by が必須です');
    this.name = 'SupersededByRequiredError';
  }
}

export class InvalidAdrStatusTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`ADR status を ${from} から ${to} へ遷移できません`);
    this.name = 'InvalidAdrStatusTransitionError';
  }
}

type InstantiateArgs = Readonly<{
  adrId: AdrId;
  title: string;
  status: AdrStatus;
  date: string;
  archgate?: ArchgateMapping;
  supersededBy?: SupersededByRef;
  normalizeForStatus: boolean;
}>;

export class AdrFrontmatter {
  readonly adrId: AdrId;
  readonly adr_id: string;
  readonly title: string;
  readonly status: AdrStatus;
  readonly date: string;
  readonly archgate: ArchgateMapping | undefined;
  readonly supersededBy: SupersededByRef | undefined;
  readonly superseded_by: string | undefined;

  private constructor(
    adrId: AdrId,
    title: string,
    status: AdrStatus,
    date: string,
    archgate?: ArchgateMapping,
    supersededBy?: SupersededByRef,
  ) {
    this.adrId = adrId;
    this.adr_id = adrId.value;
    this.title = title;
    this.status = status;
    this.date = date;
    this.archgate = archgate;
    this.supersededBy = supersededBy;
    this.superseded_by = supersededBy?.toAdrRef();
    Object.freeze(this);
  }

  static create(props: AdrFrontmatterProps): AdrFrontmatter {
    return AdrFrontmatter.instantiate({
      adrId: AdrFrontmatter.parseAdrId(props.adrId ?? props.adr_id),
      title: props.title ?? '',
      status: AdrFrontmatter.parseStatus(props.status),
      date: props.date ?? '',
      archgate: AdrFrontmatter.parseArchgate(props.archgate),
      supersededBy: AdrFrontmatter.parseSupersededBy(props.supersededBy ?? props.superseded_by),
      normalizeForStatus: true,
    });
  }

  private static instantiate(args: InstantiateArgs): AdrFrontmatter {
    const title = args.title.trim();
    if (title.length === 0) {
      throw new AdrValidationError('title は必須です');
    }

    if (!DATE_PATTERN.test(args.date)) {
      throw new AdrValidationError(`date は YYYY-MM-DD 形式で指定してください: ${args.date}`);
    }

    if (args.archgate && !args.archgate.adrId.equals(args.adrId)) {
      throw new AdrValidationError('archgate.adr_id は frontmatter.adr_id と一致する必要があります');
    }

    let supersededBy = args.supersededBy;
    if (args.normalizeForStatus && !args.status.isSuperseded()) {
      supersededBy = undefined;
    }

    if (args.status.isSuperseded() && !supersededBy) {
      throw new SupersededByRequiredError();
    }

    return new AdrFrontmatter(
      args.adrId,
      title,
      args.status,
      args.date,
      args.archgate,
      supersededBy,
    );
  }

  private static parseAdrId(value: AdrId | string | undefined): AdrId {
    if (value instanceof AdrId) {
      return value;
    }

    return AdrId.create(String(value ?? ''));
  }

  private static parseStatus(value: AdrStatus | string | undefined): AdrStatus {
    if (value instanceof AdrStatus) {
      return value;
    }

    return AdrStatus.create(String(value ?? ''));
  }

  private static parseArchgate(value: ArchgateMapping | ArchgateMappingProps | undefined): ArchgateMapping | undefined {
    if (!value) {
      return undefined;
    }

    return value instanceof ArchgateMapping ? value : ArchgateMapping.create(value);
  }

  private static parseSupersededBy(value: SupersededByRef | string | undefined): SupersededByRef | undefined {
    if (!value) {
      return undefined;
    }

    if (value instanceof SupersededByRef) {
      return value;
    }

    return SupersededByRef.create(AdrId.create(value));
  }

  transitionStatus(nextStatus: AdrStatus): AdrFrontmatter {
    if (!this.status.canTransitionTo(nextStatus)) {
      throw new InvalidAdrStatusTransitionError(this.status.value, nextStatus.value);
    }

    return AdrFrontmatter.instantiate({
      adrId: this.adrId,
      title: this.title,
      status: nextStatus,
      date: this.date,
      archgate: this.archgate,
      supersededBy: this.supersededBy,
      normalizeForStatus: true,
    });
  }

  withSupersededBy(ref?: SupersededByRef): AdrFrontmatter {
    return AdrFrontmatter.instantiate({
      adrId: this.adrId,
      title: this.title,
      status: this.status,
      date: this.date,
      archgate: this.archgate,
      supersededBy: ref,
      normalizeForStatus: false,
    });
  }

  withArchgate(mapping?: ArchgateMapping): AdrFrontmatter {
    return AdrFrontmatter.instantiate({
      adrId: this.adrId,
      title: this.title,
      status: this.status,
      date: this.date,
      archgate: mapping,
      supersededBy: this.supersededBy,
      normalizeForStatus: true,
    });
  }

  toPrimitives(): {
    adr_id: string;
    title: string;
    status: string;
    date: string;
    superseded_by?: string;
    archgate?: { enforced_by: Array<{ validator_id: string; error_code: string }> };
  } {
    const primitives: {
      adr_id: string;
      title: string;
      status: string;
      date: string;
      superseded_by?: string;
      archgate?: { enforced_by: Array<{ validator_id: string; error_code: string }> };
    } = {
      adr_id: this.adrId.value,
      title: this.title,
      status: this.status.value,
      date: this.date,
    };

    if (this.status.isSuperseded() && this.supersededBy) {
      primitives.superseded_by = this.supersededBy.toAdrRef();
    }

    if (this.archgate) {
      primitives.archgate = this.archgate.toPrimitives();
    }

    return primitives;
  }
}
