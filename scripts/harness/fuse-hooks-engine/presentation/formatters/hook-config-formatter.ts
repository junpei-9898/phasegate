/**
 * @layer presentation
 * @unit fuse-hooks-engine
 */

export class HookConfigFormatter {
  format(payload: unknown): string {
    return JSON.stringify(payload, null, 2);
  }
}
