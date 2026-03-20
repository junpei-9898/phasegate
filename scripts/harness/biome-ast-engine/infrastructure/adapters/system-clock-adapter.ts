/**
 * @layer infrastructure
 * @unit biome-ast-engine
 */

import type { ClockPort } from '../../domain/ports/clock-port.js';

/**
 * ClockPort の実装。
 * Date.now() を返す。
 */
export class SystemClockAdapter implements ClockPort {
  now(): number {
    return Date.now();
  }
}
