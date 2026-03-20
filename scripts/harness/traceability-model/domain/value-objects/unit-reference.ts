/**
 * @layer domain
 * @unit traceability-model
 *
 * @unitタグから解決したUnit参照
 */
import type { ProjectRelativePath } from './project-relative-path.js';

export interface UnitReferenceResolvedArgs {
  readonly unitName: string;
  readonly constructionRoot: ProjectRelativePath;
}

export interface UnitReferenceUnresolvedArgs {
  readonly unitName: string;
}

export class UnitReference {
  readonly unitName: string;
  readonly resolved: boolean;
  readonly constructionRoot: ProjectRelativePath | null;

  private constructor(args: {
    readonly unitName: string;
    readonly resolved: boolean;
    readonly constructionRoot: ProjectRelativePath | null;
  }) {
    if (!args.resolved && args.constructionRoot !== null) {
      throw new Error('resolved=false のとき constructionRoot は null である必要があります');
    }

    if (args.resolved && args.constructionRoot === null) {
      throw new Error('resolved=true のとき constructionRoot は必須です');
    }

    this.unitName = args.unitName;
    this.resolved = args.resolved;
    this.constructionRoot = args.constructionRoot;
    Object.freeze(this);
  }

  static resolved(args: UnitReferenceResolvedArgs): UnitReference {
    return new UnitReference({
      unitName: args.unitName,
      resolved: true,
      constructionRoot: args.constructionRoot,
    });
  }

  static unresolved(args: UnitReferenceUnresolvedArgs): UnitReference {
    return new UnitReference({
      unitName: args.unitName,
      resolved: false,
      constructionRoot: null,
    });
  }

  isResolved(): boolean {
    return this.resolved;
  }

  equals(other: UnitReference): boolean {
    const rootEquals =
      this.constructionRoot === null
        ? other.constructionRoot === null
        : other.constructionRoot !== null && this.constructionRoot.equals(other.constructionRoot);

    return this.unitName === other.unitName && this.resolved === other.resolved && rootEquals;
  }
}
