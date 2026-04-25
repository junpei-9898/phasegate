# シナリオテスト設計: H09-04 — phasegate:status（成果物駆動状態導出）

> **Unit ID**: harness-api
> **ストーリーID**: H09-04
> **作成日**: 2026-03-20

## 1. テスト対象CLIコマンド / 機能

- `phasegate:status`: ファイルシステム上の成果物（設計文書、テストファイル、メタデータ）の存在からハーネス検査状態を導出し、L1-L4各レイヤーの健全性・Phase Gate状態・プリセット情報を返す
- DBやステートファイルではなく成果物の存在から状態を導出する「成果物駆動の状態導出」設計（domain_model.md D5）

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-H09-04-001 | phasegate:statusコマンドがCLIルーティングに登録されている | `phasegate:status` | stderrに"Unknown command"を含まない |
| SC-H09-04-002 | phasegate:statusがexit 0（pass）またはexit 2（error）のみを返す | `phasegate:status` | exit 0 または exit 2（exit 1は返さない） |
| SC-H09-04-003 | レスポンスにL1-L4各レイヤーの健全性が含まれる | `phasegate:status` | data.layers[]にL1,L2,L3,L4が存在 |
| SC-H09-04-004 | レスポンスにPhase Gate通過状態のサマリーが含まれる | `phasegate:status` | data.phaseGateSummaryフィールドが存在 |
| SC-H09-04-005 | レスポンスにプリセット名と有効な設定のサマリーが含まれる | `phasegate:status` | data.presetInfo フィールドが存在 |
| SC-H09-04-006 | JSON形式での出力が可能 | `phasegate:status`（JSON出力確認） | stdout がJSON形式 |
| SC-H09-04-007 | 成果物が存在するレイヤーはlastResult='pass'として導出される | 設計文書・テストファイルが存在 | LayerHealth.lastResult='pass' |
| SC-H09-04-008 | 成果物が存在しないレイヤーはlastResult='unknown'として導出される | 対応成果物なし | LayerHealth.lastResult='unknown' |

## 3. テスト配置
- ユニットテスト: `scripts/harness/__tests__/unit/harness-api/harness-status-summary.test.ts`, `status-derivation-service.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/harness-api/derive-harness-status-usecase.test.ts`, `file-system-artifact-scanner-adapter.test.ts`
- E2Eテスト: `scripts/harness/__tests__/e2e/cli-harness.test.ts`

## 4. 前提条件
- ArtifactScannerPortの実装（FileSystemArtifactScannerAdapter）が存在すること
- ConfigQueryPortの実装が存在すること
- StatusDerivationServiceの成果物→LayerHealth変換ロジックが実装されていること
