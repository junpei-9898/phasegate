/**
 * @layer domain
 * @unit phase2-extensions
 */
import { Phase2ExtensionsDomainError } from '../errors/phase2-extensions-domain-error.js';

export type PointerType = 'file-path' | 'url';

export interface PointerProps {
  type: PointerType;
  rawText: string;
  target: string;
}

export class Pointer {
  readonly type: PointerType;
  readonly rawText: string;
  readonly target: string;

  private constructor(props: PointerProps) {
    this.type = props.type;
    this.rawText = props.rawText;
    this.target = props.target;
    Object.freeze(this);
  }

  static create(props: PointerProps): Pointer {
    if (props.type !== 'file-path' && props.type !== 'url') {
      throw new Phase2ExtensionsDomainError('L4-206', 'pointer type が不正です');
    }
    if (props.rawText.trim().length === 0) {
      throw new Phase2ExtensionsDomainError('L4-207', 'rawText は空文字不可です');
    }
    if (props.target.trim().length === 0) {
      throw new Phase2ExtensionsDomainError('L4-208', 'target は空文字不可です');
    }
    return new Pointer(props);
  }

  isFilePath(): boolean {
    return this.type === 'file-path';
  }

  isUrl(): boolean {
    return this.type === 'url';
  }
}
