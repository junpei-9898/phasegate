# WI-254 論理設計: 指示ファイルの整合性 pin

対象 unit: ci-governance（中核）／ harness-api（CLI dispatch + canonical 定数）／ agent-integration（session-start hook）

## 1. 概要

指示搭載ファイル群の SHA-256 を `phasegate.integrity.json`（ルート）に pin し、`integrity:pin`（再計算・書き出し）と `integrity:verify`（再計算・照合）の 2 コマンド、session-start hook の warn-only 照合、CI での再計算照合を提供する。ADR-030 §Decision.3.① の実装。

## 2. ci-governance の要素構成（CA レイヤー別）

### domain/value-objects

- `IntegrityTarget` — pin 対象の include glob 集合を表す不変 VO。`defaultTargets()` で v1 固定の include パターン（`skills/*/SKILL.md`, `.claude/settings.json`, `.claude/scripts/*.sh`, `.husky/*`, `docs/templates/agent-context/**`）を返す。exclude は空。
- `IntegrityManifest` — `{ version:1, algorithm:'sha256', files: Map<path, digest> }` を表す不変 VO。
  - 不変条件: version===1、algorithm==='sha256'、各 digest は 64 桁小文字 hex、path 重複なし。
  - `create({ files })` / `sortedEntries()`（path 昇順の `[path, digest][]`）/ `digestOf(path)` / `paths()`。
- `IntegrityDrift` — verify 結果の 1 件。種別 `mismatch`（digest 不一致）/ `added`（実在するが manifest に無い）/ `missing`（manifest にあるが実在しない）/ `manifest-absent`（manifest ファイル欠落）を保持。

### domain/ports

- `Sha256HasherPort` — `hashFile(relativePath): Promise<string>`（64 桁 hex）。既存 `FileHasherPort`（sha1）とは別ポート（アルゴリズムが異なるため混同回避）。
- `IntegrityManifestRepositoryPort` — `getPath()` / `exists()` / `load(): Promise<IntegrityManifest | null>` / `save(manifest): Promise<string>`。
- 対象列挙は既存 `FileScannerPort` を再利用する（glob include/exclude の走査は baseline と共通）。

### domain/services

- `IntegrityChecker`（純ロジック・状態なし・I/O なし）:
  - `computeDrifts(manifest: IntegrityManifest | null, actual: ReadonlyMap<path, digest>): IntegrityDrift[]`
    - manifest===null → `manifest-absent` 1 件のみ。
    - manifest の各 path: actual に無ければ `missing`、あるが digest 不一致なら `mismatch`。
    - actual の各 path: manifest に無ければ `added`。
    - 結果は path 昇順・種別安定順で決定的に返す。

### application/dto + usecases

- `PinIntegrityUseCase(scanner, hasher, repository)`:
  - `execute({ include?, exclude?, dryRun?, force? })` → scan → sort → 各 path を sha256 → `IntegrityManifest.create` → dryRun でなければ save。既存 baseline と同じ overwrite 制御は不要（pin は常に「意図的更新」なので force 既定 true 相当＝常に上書き。ただし dryRun は温存）。出力 DTO: `{ savedPath, entryCount, dryRun, files: [{path,digest}] }`。
- `VerifyIntegrityUseCase(scanner, hasher, repository, checker)`:
  - `execute({ include?, exclude? })` → manifest load → scan → 各 path を sha256 → `checker.computeDrifts` → 出力 DTO `{ manifestPath, ok: boolean, drifts: [{path, kind}] }`。

### presentation/handlers

- `IntegrityHandler(pinUseCase, verifyUseCase)`:
  - `pin({ dryRun?, format? })` → exitCode 0、human/json 出力。
  - `verify({ format? })` → drift なし exitCode 0 / drift あり exitCode 2、一覧出力。

### infrastructure/adapters

- `FileSystemSha256HasherAdapter(baseDir)` implements `Sha256HasherPort` — `node:crypto` の sha256 で相対パスのファイルを hash。
- `IntegrityManifestJsonRepositoryAdapter(baseDir, relativePath='phasegate.integrity.json')` implements `IntegrityManifestRepositoryPort` — `{version, algorithm, files:{}}`（files は昇順キー）で読み書き。末尾改行付き整形 JSON。

### composition-root

`buildCiGovernance` に上記 adapter / usecase / handler を配線し、返り値に `integrityHandler` を追加。scanner は既存 `GlobFileScannerAdapter` を再利用。

## 3. harness-api の変更

- `KNOWN_HARNESS_COMMANDS` に `'integrity:pin'` / `'integrity:verify'` を昇順維持で追加（conformance ゲート整合）。
- `main.ts` の dispatch に `case "integrity:pin"` / `case "integrity:verify"` を追加。`buildCiGovernance(rootDir, harnessRoot)` の `integrityHandler` を呼び、exitCode で `process.exit`。

## 4. agent-integration の変更

- `session-start-hook.ts` に integrity verify の in-process 呼び出しを追加。`buildCiGovernance(cwd)` の `integrityHandler.verify({format:'json'})` を try/catch で呼び、drift ありなら warn ブロック文字列を組み立てて `additionalContext` へ前置する。verify 例外時は「integrity 検証不能」warn に fail-open。**ブロックはしない**（hook は常に exit 0 継続）。
- warn ブロック生成は `phasegate-status-context.ts` にヘルパー `buildIntegrityWarning(drifts)` を追加して純関数化し、テスト可能にする。
- **未導入 = 沈黙**: drift が `manifest-absent` のみ（= `phasegate.integrity.json` 未導入プロジェクト）の場合、`buildIntegrityWarning` は null を返し警告を出さない。導入していない利用側 PJ で毎セッション警告が出るのを防ぐ。manifest 欠落を drift（exit 2）として扱うのは明示実行の CLI `integrity:verify` のみ。

## 5. CI

`.github/workflows/ci.yml` の test job に `integrity:verify` 実行 step を 1 つ追加（`npx tsx scripts/harness/main.ts integrity:verify`）。ADR-030 の authoritative 再計算を満たす。

## 6. 依存方向

domain（VO/ports/services、I/O 無し）← application（usecases、ports 越しに I/O）← infrastructure（fs + crypto adapter）／ presentation（handler）。逆流なし。
