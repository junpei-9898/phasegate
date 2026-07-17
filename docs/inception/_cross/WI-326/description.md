---
id: WI-326
type: fix
severity: normal
status: implemented
affects: [installation]
source: verification-followup (github#36 残課題)
---

# WI-326: install フラグ状態 (--with-husky / --with-ci / personal) を manifest に永続化し reconcile が尊重する

<!-- @work-item-id WI-326 -->

## 課題

`phasegate install` のフラグ状態（`--with-husky` / `--with-ci` / `--personal`）が
`.phasegate/manifest.json`（DeploymentManifest）に永続化されず、再 install / reconcile 時に
「元の install がどのオプションだったか」が失われていた。その結果、Husky/CI を opt-out した
プロジェクトでも `phasegate reconcile` が `.husky/*` と
`.github/workflows/phasegate-aidlc-gate.yml` を「missing managed target」として追加してしまい、
文書と実体が食い違っていた（WI-316 / github#36 でフラグの opt-in 配線自体は修正済み。本 WI は
その残課題）。

## 修正内容

- `scripts/harness/installation/domain/deployment-manifest.ts`:
  **optional** な `installationFlags?: { includeHusky: boolean; includeCi: boolean; personal: boolean }`
  を `DeploymentManifest` に追加（`InstallationFlags` としてエクスポート）。
  - `fromJSON` / `toJSON` / `addEntry` / `removeEntry` で保持。`withInstallationFlags()` を追加
  - フィールド未設定の manifest の `toJSON` は `installationFlags` キー自体を出力しない
    （pre-WI-326 manifest.json とバイト互換）
  - boolean 以外の値は不変条件違反として reject
- `scripts/harness/installation/application/usecases/run-install.ts`:
  apply 実行時に**実効値**を記録して save する。personal install は Husky/CI targets を
  一切配布しないため `includeHusky: false, includeCi: false, personal: true` を記録。
  managed file の content 変更が無くてもフラグがドリフトしていれば manifest を再保存する
  （manifest が存在せず変更も無い場合は従来どおり作成しない）
- `scripts/harness/installation/application/usecases/run-reconcile.ts`:
  - `RunReconcileInput` に optional `includeHusky` / `includeCi` を追加（明示指定が最優先）。
    未指定時は manifest の `installationFlags` を既定値として採用し、フィールドが無い旧 manifest
    では**推測せず従来挙動**（全 bundled targets を対象）にフォールバック
  - `createTargets()` が flags に応じて `.husky/*` 3 hooks と CI workflow target を除外
  - `isPersonalManifest()` は `installationFlags.personal` があればそれを採用（無ければ既存の
    entry 形状 heuristic のまま）
  - reconcile が保存する nextManifest に `installationFlags` を引き継ぎ（save で消失しない）
- `file-system-manifest-repository-adapter.ts` は `fromJSON`/`toJSON` 経由のため変更不要。
  `main.ts` も変更なし（install フラグは既に usecase input に配線済み、reconcile CLI には
  当該フラグが存在しないため manifest 既定値がそのまま効く）。

## 検証

- `scripts/harness/__tests__/unit/installation/deployment-manifest.test.ts`:
  round-trip 保持 / 旧 JSON 後方互換 load / toJSON キー省略 / addEntry・removeEntry 保持 /
  非 boolean reject
- `scripts/harness/__tests__/integration/installation/file-system-manifest-repository-adapter.test.ts`:
  旧 manifest.json の load + save round-trip がキーを追加しないこと / flags 付き save→load 復元
- `scripts/harness/__tests__/integration/installation/install-handler.test.ts`:
  opt-out install の flags 記録 / personal install の flags 記録 /
  フラグドリフトのみの再 install での manifest 更新
- `scripts/harness/__tests__/integration/installation/reconcile-handler.test.ts`:
  opt-out install 後の reconcile apply が Husky/CI を追加せず flags を保持すること /
  flags 無し旧 manifest の reconcile が従来どおり Husky/CI を対象に含めること（後方互換の固定）

実行: `npx vitest run --config scripts/harness/__tests__/vitest.config.ts <各テストファイル>` green。
