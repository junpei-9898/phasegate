# TDD実装計画: WI-087 Phase C-2 — Stop hook --enforce flag

## 1. スコープ

### 対象ストーリー
- **WI-087 finding #4** (GitHub Issue [#3](https://github.com/junpei-9898/phasegate/issues/3))
  - `phasegate hook stop` が Complete Check 失敗時に exit 1 を返すが、Claude Code の Stop hook block には exit 2 が必要
  - レポーター提案: `--enforce` (or config flag) で Complete Check 失敗時に **exit 2 + decision JSON `permissionDecision: "deny"`** を返す strict mode を opt-in 可能に

### 受け入れ基準（メイン WI 起票時の AC をそのまま継承）
1. phasegate.config.json schema に `agentIntegration.stopHook.enforce: boolean` (default false) が追加
2. schema validator が type 違反を reject (boolean 以外、null など)
3. `ConfigQueryPort.getStopHookEnforce(): Promise<boolean>` が config の値を返す（未指定時は false）
4. enforce=true + Complete Check 失敗時、stop-hook.ts は:
   - stdout に `{"decision":"block","reason":"..."}` を出力
   - stderr に reason 付きメッセージ
   - exit code **2** で終了
5. enforce=false (default) で Complete Check 失敗時は **現行挙動を維持**（exit cliResult.exitCode、stderr メッセージのみ）
6. enforce=true でも Complete Check 成功時 (exitCode=0) は exit 0 で終了
7. reentry 検出時 (REENTRY_DETECTED) は enforce 設定に関わらず exit 0
8. config-foundation の HarnessConfig schema 整合性チェック / migration テスト全 pass
9. agent-integration の HandleStopUseCase / stop-hook 単体・結合テストが追加され全 pass
10. 全 3480+ テストグリーン

### 影響する層
- **config-foundation**: schema (v3 JSON Schema) のみ。新 VO は導入せず、既存 `additionalProperties: false` を尊重するため `agentIntegration.stopHook` セクションを v3 に追加
- **agent-integration / domain**: `ConfigQueryPort` に `getStopHookEnforce()` を追加（API 契約変更）
- **agent-integration / infrastructure**: `HarnessConfigConfigQueryAdapter` に同メソッド実装追加
- **agent-integration / application**: `HandleStopOutput` DTO に `shouldEnforceFailure: boolean` を追加、`HandleStopUseCase.execute` で Complete Check 結果と enforce フラグを評価して populate
- **agent-integration / presentation**: `stop-hook.ts` のメイン分岐を拡張

## 2. 前提条件検証

- `implementation-readiness-checker` の正規実行は省略（WI-fix で `docs/inception/{unit}/{story_id}/` 構造を持たないため）
- 代わりに対面で確認:
  - `docs/product/construction/agent-integration/{logical_design,domain_model,unit_test_design,it_test_design,coverage_report}.md` 全て存在 ✅
  - `docs/product/construction/config-foundation/{logical_design,domain_model,unit_test_design,it_test_design,coverage_report}.md` 全て存在 ✅
  - 既存の `agentIntegration` セクションが現行 v3 schema に **存在しない**ことを確認 ✅（新規追加）

## 3. TDD実装順序（テストピラミッド準拠）

### 1. Unitテスト (RED → GREEN → REFACTOR)

新ドメインオブジェクトは導入しないため、ユニットテストの追加は必要最小限に留める。

| 対象 | テスト内容 | 実装内容 |
|------|----------|---------|
| なし | 新 VO 不在のため Unit 層は対象外 | — |

### 2. ITテスト (RED → GREEN → REFACTOR)

| 対象 | テスト内容 | 実装内容 |
|------|----------|---------|
| `HarnessConfigConfigQueryAdapter` | `getStopHookEnforce()` が config から値を読む / 未指定で false / 不正型 fallback | adapter にメソッド追加 |
| `HandleStopUseCase` | enforce + 失敗 → `shouldEnforceFailure: true` / enforce + 成功 → false / 非 enforce + 失敗 → false / reentry → false | UseCase 出力 DTO 拡張 |
| config-foundation schema validator | `agentIntegration.stopHook.enforce: true` の v3 config が pass / `enforce: "yes"` が reject | v3 JSON Schema 拡張 |

**実行方式:** メインセッションで直接実行（DI mock のみで FS unaffected な軽量 test）

### 3. E2E/シナリオテスト

`stop-hook.ts` (presentation entrypoint) は spawn 経由の dogfood で手動検証。自動 E2E は spawn コストに見合わないため**スコープ外**。

代わりに presentation layer の薄いラッパーを通る integration test を追加して exit code 経路を網羅する。

| 対象 | テスト内容 | 実装内容 |
|------|----------|---------|
| `stop-hook.ts` 引数経路 | shouldEnforceFailure の分岐に応じて出力形式が切り替わること | presentation 層拡張 |

**実行方式:** メインセッションで直接実行 + 手動 dogfood

## 4. 環境検証チェックリスト（事前実行結果）

- [x] `npx phasegate validate --layer L2`: 通過確認 (本セッション初頭で動作確認済)
- [x] `npm run test`: 直近 3480 テスト pass (Phase C-1 commit `38b642d` 時点)
- [x] `npx phasegate lint`: violations なし

## 5. QA（不明点・確認事項）

### [Question] Q1: schema 配置を v3 に追加するか、`harnesses` セクション（既存）に置くか

**背景**: 現行 v3 schema は top-level keys = `[project, layers, quickMode, phaseDependencies, planningMode, harnesses, paths, reporting, protectedFiles, baseline, architecture]`。`additionalProperties: false` のため、未定義 key を追加すると config validation でエラーになる。

選択肢:
- **(A) 新 top-level `agentIntegration` を追加**: 設計のクリーンさは高いが v3 schema を破壊的変更ではないにせよ拡張する
- **(B) 既存 `harnesses` 配下に `stopHookEnforce: boolean` を追加**: 後方互換は同等、影響範囲が小さい

**推奨案: (A)** — レポーター提案 (`agentIntegration.stopHook.enforce`) の文字列パスをそのまま採用したい。今後 PreToolUse / PostToolUse の strict 化など同種の追加を見越すと、専用セクションが将来の拡張ポイントになる。

[Answer] (A) を採用 — 2026-05-08

### [Question] Q2: `--enforce` CLI flag を併設するか、config 一本で行くか

**背景**: レポーター提案は "--enforce (or config flag)" と両論併記。

選択肢:
- **(A) config flag のみ**: シンプル、設定の Single Source of Truth
- **(B) CLI flag + config flag (CLI > config)**: スクリプト経由の ad-hoc 強制が可能

**推奨案: (A) config flag のみ** — Stop hook は Claude Code が `.claude/settings.json` 経由で起動するため、CLI flag は通る経路がほぼない (`.claude/settings.json` の command 文字列に `--enforce` を書く形になり、結局 config 化と同じコスト)。MVP は config 一本で。

[Answer] (A) を採用 — 2026-05-08

### [Question] Q3: decision JSON のフォーマット

**背景**: Claude Code Stop hook 仕様は `{"decision": "block", "reason": "..."}` を期待する。

選択肢:
- **(A)** `{"decision":"block","reason":"Complete Check failed (exitCode=N)"}` のみ
- **(B)** stdout/stderr の先頭 N 行を reason に含める（情報量増加）

**推奨案: (A)** — シンプルさ優先。詳細は stderr 側で出力済みでユーザーが見れば確認できる。reason 内に複数行 stdout/stderr を埋め込むと JSON エスケープが煩雑かつ Claude Code 側の表示が崩れがち。MVP は (A) で。

[Answer] (A) を採用 — 2026-05-08

## 6. 前提条件・リスク

### 想定リスク
1. **config-foundation の DI 配線漏れ** (memory `feedback_dogfood_before_release.md` 同種事例): `agentIntegration` セクション追加に伴い、関連する `composition-root.ts` / preset definition store / migration use-case で参照漏れがあるとセルフホストで挙動異常を引く可能性。
   - **緩和策**: 実装後に dogfood 検証 (`phasegate.config.json` に enforce: true 追加 → 手動で stop-hook stdin 流して exit code 2 を確認) を必ず実施

2. **既存テストへの破壊的影響**: `HandleStopOutput` に新 field を追加するが、既存 test の `expect(actual)` が `executed: true, cliResult: {...}` のような部分一致で書かれているか、shallow equal で書かれているかで変わる。
   - **緩和策**: 既存テスト全件 grep して影響範囲を確認後、`expect(actual.executed).toBe(true)` 等の field 単位 assert に変える / `quickModeAllowed` 同様 `undefined` 値を含む完全一致でも互換になるよう型を `boolean | undefined` で定義

3. **schema の `required` 配列**: 既存 `additionalProperties: false` + `required: [...]` のため、`agentIntegration` を **任意フィールド**として追加 (required に含めない)。

### 前提条件
- レポーターから "Stop hook はデフォルト exit cliResult.exitCode で抜け、`--enforce` で exit 2" の挙動が望ましいと明示されており、互換性方針 (default false) に異論なし
- Stop hook が Claude Code セッションで実際に block を発火する条件 (exit 2 + JSON) は Claude Code 公式 docs で確認済

## 7. 実装ファイル予定

### 新規作成
- なし（全て既存ファイルへの拡張）

### 変更
1. `scripts/harness/config-foundation/infrastructure/schemas/harness-config-v3.schema.json` — `agentIntegration.stopHook.enforce` 追加
2. `scripts/harness/agent-integration/domain/ports/config-query-port.ts` — `getStopHookEnforce()` 追加
3. `scripts/harness/agent-integration/infrastructure/adapters/harness-config-config-query-adapter.ts` — 実装追加
4. `scripts/harness/agent-integration/application/dto/handle-stop-dto.ts` — `shouldEnforceFailure?: boolean` 追加
5. `scripts/harness/agent-integration/application/usecases/handle-stop-usecase.ts` — populate ロジック
6. `scripts/harness/agent-integration/presentation/stop-hook.ts` — 出力分岐拡張
7. `scripts/harness/__tests__/integration/agent-integration/handle-stop-usecase.test.ts` — テスト追加
8. `scripts/harness/__tests__/integration/agent-integration/harness-config-config-query-adapter.test.ts` — テスト追加
9. `docs/guide/configuration.md` — `agentIntegration.stopHook.enforce` 説明追加
10. `docs/guide/hooks-integration.md` — Stop hook セクションに enforce オプション追記
11. `CHANGELOG.md` — v0.122.0 エントリ追加
12. `package.json` — version bump
13. `docs/inception/_cross/WI-087/description.md` — Phase C-2 完了ログ追加

## 8. 公開フロー

1. 実装 + テスト + dogfood 検証
2. CHANGELOG / version bump / WI-087 description.md 更新
3. commit (Work-Item: WI-087 trailer 必須)
4. tag v0.122.0 + push origin main --tags
5. user に publish (`npm publish --auth-type=web`) を委譲
6. publish 確認後に GitHub Issue #3 へリリースコメント投稿
