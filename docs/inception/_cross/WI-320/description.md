---
id: WI-320
type: fix
severity: high
status: implemented
affects: [config-foundation, validator-system]
source: github#39
---

# WI-320: languages 未宣言シグナルを adapter まで生存させ、WI-319 の言語検出を実 CLI 経路で有効化する

<!-- @work-item-id WI-320 -->

## 背景

WI-319 で `HarnessConfigValidatorConfigAdapter.getProjectLanguages()` に「config の `project.languages` 未宣言時はファイルシステムのマーカーから言語を検出する」実装を追加したが、実 CLI（`validate --layer L3` 等）ではこの検出コードに到達しない dead code になっていた。

原因は、「未宣言」の情報が adapter に届く前に上流で `["typescript"]` に潰されていたこと:

1. `PresetResolutionService.resolve()`（`config-foundation/domain/services/preset-resolution-service.ts`）が resolved config 構築時に `sourceDocument.project.languages ?? ["typescript"]` で default を注入
2. `ProjectConfig` VO（`config-foundation/domain/value-objects/project-config.ts`）が構築時に `props.languages ?? ['typescript']` で default を注入
3. `toValidatorSystemConfig()`（`config-foundation/application/mappers/validator-system-config-mapper.ts`）が `resolvedConfig.project.languages ?? ["typescript"]` で default を注入（1 により実質 dead）

実 CLI の配線は `main.ts` の `createValidatorSystemModule(toValidatorSystemConfig(resolvedConfig))` → mapper → adapter であり、adapter には常に `languages: ["typescript"]` が「宣言済み」として届くため、検出分岐（未宣言時のみ発動）が一度も実行されない。結果として、純 Python リポジトリ（`pyproject.toml` のみ、`languages` 未宣言）で L3-003 が unsupported-language SKIP にならず FAIL していた。WI-319 のテストは adapter 直呼びだったため、この regression を検出できなかった。

## 修正

「未宣言」シグナル（`languages: undefined`）を resolution → resolved config → mapper → adapter まで生存させる（案 Y: default 注入の廃止。宣言時の挙動は不変）:

- `preset-resolution-service.ts`: 未宣言時に `["typescript"]` を注入せず、resolved config の `project.languages` を未宣言のまま維持（宣言時はそのまま伝搬）
- `validator-system-config-mapper.ts`: `project.languages` を default 注入なしで pass-through（未宣言時はキー自体を出力しない）
- `project-config.ts`（VO）: `languages` を optional 化し default 注入を廃止。宣言時のみ非空・非空文字列のバリデーションと正規化を実施。`equals` は宣言有無を含めて比較
- adapter の検出ロジック自体（WI-319 実装）は無変更。未宣言時のみ `detectLanguagesFromFilesystem()` が発動し、マーカー無しなら従来どおり `["typescript"]` フォールバック

## テスト（regression 再発防止）

- **実 CLI 経路の E2E**（`__tests__/integration/harness-api/validate-language-detection.integration.test.ts`、新規）: `npx tsx main.ts validate --layer L3 --format human` を temp dir（`pyproject.toml` + typescript 依存なし `package.json` + languages 未宣言 standard config）で spawn し、L3-003 が unsupported-language SKIP になり FAIL しないことを検証。同構成で `languages: ["typescript"]` を明示宣言した場合は L3-003 が SKIP されず従来どおり実行されることも固定（宣言優先の回帰防止）
- mapper 単体: 未宣言 → `languages` が undefined（キー無し）で渡ること／宣言あり → そのまま渡ること
- preset resolution 単体: 未宣言 → resolved が未宣言のまま／宣言あり → 宣言値が伝搬すること
