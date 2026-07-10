// @unit ci-governance
// @layer domain

const SHA256_HEX_RE = /^[0-9a-f]{64}$/;

export interface IntegrityManifestProps {
  readonly files: ReadonlyMap<string, string>;
}

/**
 * 指示搭載ファイル群の SHA-256 pin を表す不変 VO（pin 集約ルート）。
 * version は 1 固定、algorithm は 'sha256' 固定（ADR-030 §Decision.3.①）。
 */
export class IntegrityManifest {
  readonly version = 1 as const;
  readonly algorithm = "sha256" as const;
  private readonly files: ReadonlyMap<string, string>;

  private constructor(files: ReadonlyMap<string, string>) {
    this.files = new Map(files);
    Object.freeze(this);
  }

  static create(props: IntegrityManifestProps): IntegrityManifest {
    for (const [path, digest] of props.files) {
      if (path.length === 0) {
        throw new Error("IntegrityManifest: path must not be empty");
      }
      if (!SHA256_HEX_RE.test(digest)) {
        throw new Error(`IntegrityManifest: digest must be 64 lowercase hex chars, got: ${digest} (path: ${path})`);
      }
    }
    return new IntegrityManifest(props.files);
  }

  /** path 昇順の [path, digest] 一覧（決定的） */
  sortedEntries(): Array<[string, string]> {
    return [...this.files.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  }

  /** path 昇順の path 一覧 */
  paths(): readonly string[] {
    return this.sortedEntries().map(([p]) => p);
  }

  digestOf(path: string): string | undefined {
    return this.files.get(path);
  }
}
