/**
 * @layer domain
 * @unit phase2-extensions
 */
import { Phase2ExtensionsDomainError } from '../errors/phase2-extensions-domain-error.js';

export type InitialCreationAgeSource = 'git-log' | 'file-mtime';

export interface InitialCreationAgeProps {
  ageInDays: number;
  commitCount: number;
  source: InitialCreationAgeSource;
}

export class InitialCreationAge {
  readonly ageInDays: number;
  readonly commitCount: number;
  readonly source: InitialCreationAgeSource;

  private constructor(props: InitialCreationAgeProps) {
    this.ageInDays = props.ageInDays;
    this.commitCount = props.commitCount;
    this.source = props.source;
    Object.freeze(this);
  }

  static create(props: InitialCreationAgeProps): InitialCreationAge {
    if (!Number.isFinite(props.ageInDays) || props.ageInDays < 0) {
      throw new Phase2ExtensionsDomainError('L4-241', 'ageInDays は 0 以上である必要があります');
    }

    if (!Number.isFinite(props.commitCount) || props.commitCount < 1) {
      throw new Phase2ExtensionsDomainError('L4-242', 'commitCount は 1 以上である必要があります');
    }

    if (props.source !== 'git-log' && props.source !== 'file-mtime') {
      throw new Phase2ExtensionsDomainError('L4-243', 'source が不正です');
    }

    return new InitialCreationAge({
      ageInDays: Math.floor(props.ageInDays),
      commitCount: Math.floor(props.commitCount),
      source: props.source,
    });
  }

  equals(other: InitialCreationAge): boolean {
    return (
      this.ageInDays === other.ageInDays &&
      this.commitCount === other.commitCount &&
      this.source === other.source
    );
  }
}
