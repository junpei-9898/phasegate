// @unit ci-governance
// @layer domain

import { BaselineEntry } from './baseline-entry.js';

export interface BaselineSnapshotProps {
  readonly createdAt: string;
  readonly algorithm: 'sha1';
  readonly entries: readonly BaselineEntry[];
}

const ISO_8601_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

export class BaselineSnapshot {
  readonly createdAt: string;
  readonly algorithm: 'sha1';
  readonly entries: readonly BaselineEntry[];
  private readonly pathIndex: ReadonlySet<string>;

  private constructor(props: BaselineSnapshotProps) {
    this.createdAt = props.createdAt;
    this.algorithm = props.algorithm;
    this.entries = Object.freeze([...props.entries]);
    this.pathIndex = new Set(props.entries.map((e) => e.path));
  }

  static create(props: BaselineSnapshotProps): BaselineSnapshot {
    if (!ISO_8601_UTC_RE.test(props.createdAt)) {
      throw new Error(
        `BaselineSnapshot: createdAt must be ISO 8601 UTC, got: ${props.createdAt}`,
      );
    }
    if (props.algorithm !== 'sha1') {
      throw new Error(
        `BaselineSnapshot: algorithm must be 'sha1', got: ${props.algorithm}`,
      );
    }
    const seen = new Set<string>();
    for (const e of props.entries) {
      if (seen.has(e.path)) {
        throw new Error(`BaselineSnapshot: duplicate path ${e.path}`);
      }
      seen.add(e.path);
    }
    return new BaselineSnapshot(props);
  }

  contains(path: string): boolean {
    return this.pathIndex.has(path);
  }

  get entryCount(): number {
    return this.entries.length;
  }
}
