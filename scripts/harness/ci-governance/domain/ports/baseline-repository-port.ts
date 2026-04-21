// @unit ci-governance
// @layer domain

import type { BaselineSnapshot } from '../value-objects/baseline-snapshot.js';

export interface BaselineRepositoryPort {
  save(snapshot: BaselineSnapshot): Promise<string>;
  load(): Promise<BaselineSnapshot | null>;
  exists(): Promise<boolean>;
  getPath(): string;
}
