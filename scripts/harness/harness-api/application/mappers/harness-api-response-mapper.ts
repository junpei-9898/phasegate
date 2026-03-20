// harness-api-response-mapper.ts — HarnessApiResponseMapper

import type { HarnessApiResponse } from '../../domain/value-objects/harness-api-response.js';
import type { HarnessApiResponseContract } from '../dto/harness-api-response-contract.js';

export class HarnessApiResponseMapper {
  toContract<T>(response: HarnessApiResponse<T>): Readonly<HarnessApiResponseContract<T>> {
    const contract: HarnessApiResponseContract<T> = {
      status: response.status,
      errors: response.errors,
      summary: response.summary,
      data: response.data,
    };
    return Object.freeze(contract);
  }
}
