/**
 * @layer domain
 * @unit phase2-extensions
 * @work-item-id WI-122
 */
import { Phase2ExtensionsDomainError } from '../errors/phase2-extensions-domain-error.js';

export type DocumentAgeSource = 'git-log' | 'file-mtime' | 'related-source-change';

export interface DocumentAgeProps {
  ageInDays: number;
  source: DocumentAgeSource;
}

export class DocumentAge {
  readonly ageInDays: number;
  readonly source: DocumentAgeSource;

  private constructor(props: DocumentAgeProps) {
    this.ageInDays = props.ageInDays;
    this.source = props.source;
    Object.freeze(this);
  }

  static create(props: DocumentAgeProps): DocumentAge {
    if (!Number.isFinite(props.ageInDays) || props.ageInDays < 0) {
      throw new Phase2ExtensionsDomainError('L4-204', 'ageInDays は 0 以上である必要があります');
    }
    if (props.source !== 'git-log' && props.source !== 'file-mtime' && props.source !== 'related-source-change') {
      throw new Phase2ExtensionsDomainError('L4-205', 'source が不正です');
    }
    return new DocumentAge({
      ageInDays: Math.floor(props.ageInDays),
      source: props.source,
    });
  }

  isOlderThan(days: number): boolean {
    return this.ageInDays >= days;
  }

  equals(other: DocumentAge): boolean {
    return this.ageInDays === other.ageInDays && this.source === other.source;
  }
}
