/**
 * @layer presentation
 * @unit fuse-hooks-engine
 */

export class CompletionGateFormatter {
  format(payload: unknown): string {
    return JSON.stringify(payload, null, 2);
  }
}
