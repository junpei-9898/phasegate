/**
 * @layer domain
 * @unit traceability-model
 */

export interface ProjectRelativePathLike {
  readonly value: string;
  toString(): string;
  equals(other: { readonly value: string }): boolean;
}

export type ChainLinkType =
  | 'implementation-to-unit'
  | 'unit-to-design'
  | 'design-to-story'
  | 'story-to-plan';

const VALID_LINK_TYPES = new Set<ChainLinkType>([
  'implementation-to-unit',
  'unit-to-design',
  'design-to-story',
  'story-to-plan',
]);

export interface ChainLinkArgs {
  readonly from: ProjectRelativePathLike | null;
  readonly to: ProjectRelativePathLike | null;
  readonly linkType: ChainLinkType;
  readonly resolved: boolean;
}

export class ChainLink {
  readonly from: ProjectRelativePathLike;
  readonly to: ProjectRelativePathLike;
  readonly linkType: ChainLinkType;
  readonly resolved: boolean;

  private constructor(args: {
    readonly from: ProjectRelativePathLike;
    readonly to: ProjectRelativePathLike;
    readonly linkType: ChainLinkType;
    readonly resolved: boolean;
  }) {
    this.from = args.from;
    this.to = args.to;
    this.linkType = args.linkType;
    this.resolved = args.resolved;
    Object.freeze(this);
  }

  static create(args: ChainLinkArgs): ChainLink {
    if (args.from === null || args.to === null) {
      throw new Error('from and to are required');
    }
    if (!VALID_LINK_TYPES.has(args.linkType)) {
      throw new Error(`Unsupported link type: ${args.linkType}`);
    }

    return new ChainLink({
      from: args.from,
      to: args.to,
      linkType: args.linkType,
      resolved: args.resolved,
    });
  }

  isBroken(): boolean {
    return !this.resolved;
  }

  equals(other: ChainLink): boolean {
    return (
      this.from.equals(other.from) &&
      this.to.equals(other.to) &&
      this.linkType === other.linkType &&
      this.resolved === other.resolved
    );
  }
}
