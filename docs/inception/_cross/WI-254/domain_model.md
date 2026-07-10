# WI-254 ドメインモデル: 整合性 pin（ci-governance）

追加ドメイン概念は ci-governance に属する。harness-api / agent-integration には新規ドメイン概念を追加しない（既存の CLI dispatch / hook presentation を拡張するのみ）。

## 値オブジェクト

### IntegrityTarget

pin 対象ファイル集合の指定（include / exclude glob）を表す不変 VO。

- `include: readonly string[]`, `exclude: readonly string[]`。
- `IntegrityTarget.defaultTargets()` — v1 固定の include を返す:
  - `skills/*/SKILL.md`
  - `.claude/settings.json`
  - `.claude/scripts/*.sh`
  - `.husky/*`
  - `docs/templates/agent-context/**`
- exclude は既定空。走査は `node_modules` 等ハード除外を持つ既存 `GlobFileScannerAdapter` に委譲。

### IntegrityManifest

pin された整合性 manifest を表す不変 VO。

- 属性: `version: 1`, `algorithm: 'sha256'`, `files: ReadonlyMap<string, string>`（path → 64 桁 hex digest）。
- 不変条件（`create` で強制）:
  - `version === 1`
  - `algorithm === 'sha256'`
  - 各 digest が `/^[0-9a-f]{64}$/`
  - path が空でない・重複しない
- 振る舞い: `sortedEntries(): [string,string][]`（path 昇順）／ `digestOf(path): string | undefined` ／ `paths(): readonly string[]`（昇順）。

### IntegrityDrift

verify で検出した 1 件の差分。

- 属性: `path: string`, `kind: 'mismatch' | 'added' | 'missing' | 'manifest-absent'`。
- `manifest-absent` は path を manifest ファイルパスとして 1 件だけ持つ特別種。

## ドメインサービス

### IntegrityChecker

状態を持たない純サービス（I/O 一切なし）。

- `computeDrifts(manifest: IntegrityManifest | null, actual: ReadonlyMap<string,string>): IntegrityDrift[]`
  - `manifest === null` → `[{ path: <manifest path 相当>, kind: 'manifest-absent' }]`。
  - それ以外:
    - manifest の各 path について actual に無ければ `missing`、あるが digest ≠ なら `mismatch`。
    - actual の各 path について manifest に無ければ `added`。
  - 決定的順序（path 昇順、同 path なら kind 安定順）で返す。

## ポート（domain → infrastructure 境界）

- `Sha256HasherPort.hashFile(relativePath): Promise<string>` — sha256 hex。既存 sha1 用 `FileHasherPort` とは別ポート。
- `IntegrityManifestRepositoryPort` — `getPath()` / `exists()` / `load()` / `save(manifest)`。
- `FileScannerPort`（既存・再利用）— 対象 glob 走査。

## 集約・整合性境界

IntegrityManifest が pin の集約ルート。verify 時は「manifest（過去の pin）」と「actual（現在の再計算結果）」を IntegrityChecker で突き合わせるのみで、manifest 自体は不変。pin は新しい IntegrityManifest を生成して置換する（in-place 変更なし）。
