/**
 * @layer domain
 * @unit phase2-extensions
 */
import type { Pointer } from './pointer.js';

export class PointerValidationResult {
  readonly pointer: Pointer;
  readonly isResolvable: boolean;
  readonly errorMessage: string | null;
  readonly resolvedPath: string | null;

  private constructor(props: {
    pointer: Pointer;
    isResolvable: boolean;
    errorMessage: string | null;
    resolvedPath: string | null;
  }) {
    this.pointer = props.pointer;
    this.isResolvable = props.isResolvable;
    this.errorMessage = props.errorMessage;
    this.resolvedPath = props.resolvedPath;
    Object.freeze(this);
  }

  static resolved(pointer: Pointer, resolvedPath: string): PointerValidationResult {
    return new PointerValidationResult({
      pointer,
      isResolvable: true,
      errorMessage: null,
      resolvedPath,
    });
  }

  static broken(pointer: Pointer, errorMessage: string): PointerValidationResult {
    return new PointerValidationResult({
      pointer,
      isResolvable: false,
      errorMessage,
      resolvedPath: null,
    });
  }

  static skipped(pointer: Pointer): PointerValidationResult {
    return new PointerValidationResult({
      pointer,
      isResolvable: true,
      errorMessage: null,
      resolvedPath: null,
    });
  }
}
