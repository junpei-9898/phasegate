// @unit ci-governance
// @layer domain

import type { IntegrityDrift } from "../value-objects/integrity-drift.js";
import type { IntegrityManifest } from "../value-objects/integrity-manifest.js";

/** manifest 欠落時に返す drift の path（manifest ファイルの相対パス） */
export const INTEGRITY_MANIFEST_PATH = "phasegate.integrity.json";

/**
 * pin された manifest と、現在の再計算結果 (actual) を突き合わせて drift を列挙する
 * 純ドメインサービス（状態なし・I/O なし）。ADR-030 §Decision.3.①。
 */
export class IntegrityChecker {
  computeDrifts(manifest: IntegrityManifest | null, actual: ReadonlyMap<string, string>): IntegrityDrift[] {
    if (manifest === null) {
      return [{ path: INTEGRITY_MANIFEST_PATH, kind: "manifest-absent" }];
    }

    const drifts: IntegrityDrift[] = [];

    // manifest の各 path: actual に無ければ missing、不一致なら mismatch
    for (const [path, expected] of manifest.sortedEntries()) {
      const actualDigest = actual.get(path);
      if (actualDigest === undefined) {
        drifts.push({ path, kind: "missing" });
      } else if (actualDigest !== expected) {
        drifts.push({ path, kind: "mismatch" });
      }
    }

    // actual の各 path: manifest に無ければ added
    for (const path of actual.keys()) {
      if (manifest.digestOf(path) === undefined) {
        drifts.push({ path, kind: "added" });
      }
    }

    // path 昇順で決定的に返す
    return drifts.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  }
}
