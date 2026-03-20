// harness-api-response-contract.ts — Cross-Unit Contract DTO

import type { ResponseStatus, HarnessError, ResponseSummary } from '../../domain/value-objects/harness-api-response.js';

export interface HarnessApiResponseContract<T = unknown> {
  readonly status: ResponseStatus;
  readonly errors: readonly HarnessError[];
  readonly summary: ResponseSummary | string;
  readonly data: T | undefined;
}
