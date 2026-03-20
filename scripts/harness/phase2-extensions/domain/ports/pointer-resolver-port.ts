/**
 * @layer domain
 * @unit phase2-extensions
 */
import type { Pointer } from '../value-objects/pointer.js';

export interface PointerResolverPort {
  resolve(pointer: Pointer): Promise<boolean>;
}
