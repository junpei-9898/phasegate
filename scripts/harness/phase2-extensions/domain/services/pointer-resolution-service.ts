/**
 * @layer domain
 * @unit phase2-extensions
 */
import type { PointerResolverPort } from '../ports/pointer-resolver-port.js';
import type { Pointer } from '../value-objects/pointer.js';
import { PointerValidationResult } from '../value-objects/pointer-validation-result.js';

export class PointerResolutionService {
  constructor(private readonly pointerResolverPort: PointerResolverPort) {}

  async resolve(pointers: Pointer[]): Promise<PointerValidationResult[]> {
    const results: PointerValidationResult[] = [];

    for (const pointer of pointers) {
      if (pointer.isUrl()) {
        results.push(PointerValidationResult.skipped(pointer));
        continue;
      }

      const isResolvable = await this.pointerResolverPort.resolve(pointer);
      results.push(
        isResolvable
          ? PointerValidationResult.resolved(pointer, pointer.target)
          : PointerValidationResult.broken(pointer, `File not found: ${pointer.target}`),
      );
    }

    return results;
  }
}
