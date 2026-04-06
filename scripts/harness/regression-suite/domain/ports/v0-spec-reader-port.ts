// @layer domain
import type { V0TestId } from '../value-objects/v0-test-id.js';

export interface V0SpecReaderPort {
  readAll(): Promise<V0TestId[]>;
}
