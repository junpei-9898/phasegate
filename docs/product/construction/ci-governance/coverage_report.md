# テストカバレッジレポート: ci-governance

@story-id H13-01
@story-id H13-02
@story-id H13-03
> **作成日**: 2026-03-20
> **Unit ID**: ci-governance
> **Wave**: 3

---

## 1. サマリー

| 観点 | カバー項目数 | 未カバー項目数 | カバレッジ率 |
|------|------------|--------------|------------|
| 受け入れ基準 | 11（+2 ドメインロジックのみ） | 2 | 85%（§11 訂正履歴参照） |
| ドメインロジック（不変条件） | 11（+1 モックのみ） | 1 | 92%（§11 訂正履歴参照） |
| UseCase | 8 | 0 | 100% |
| Infrastructure Adapter | 4 | 6 | 40% |
| Presentation Handler | 3 | 0 | 100% |
| **総合（テストケース数ベース）** | **173** | **0** | **100%** |

> **補足**: Infrastructure Adapterカバレッジ率は「テスト対象として設計書に記載されたAdapter種別」のうち実際にテストケースが設計されたものの割合。記載済み10種のうち4種のみテストケースが定義されており40%。未カバー6種はモック化前提（外部Unitアダプタ）のため意図的に除外されている可能性あり。詳細は §5 参照。

### 判定結果

- ⚠️ 受け入れ基準: 85%（13 中 11 が実検証。H13-03-AC-2 / AC-4 は存在性がモック port のみでドメインロジックは検証されるが、実コーパス・本番配線は未検証。§11 訂正履歴参照）
- ⚠️ ドメインロジック（不変条件）: 92%（INV-1〜INV-12 中 11 条件が検証。INV-10 は AdrExistencePort がモックのみで実 ADR コーパス未検証。§11 訂正履歴参照）
- ✅ UseCase: 100%（全8UseCaseに正常系・異常系テストが設計されている）
- ⚠️ Infrastructure Adapter: 40%（外部Unit依存の6アダプタはモック化の方針上テストケース未定義）
- ✅ Presentation Handler: 100%（全3Handlerにテストが設計されている）
- ✅ 総合テストケース数: **173件**（ユニットテスト105件 + ITテスト68件）

---

## 2. 受け入れ基準カバレッジ

受け入れ基準は `ci_governance_unit.md` §3「機能要件」から抽出した。

### H13-01: CI/CDテンプレート

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H13-01-AC-1 | `aidlc-gate.yml`テンプレートの作成（PR時にL1-L3バリデータ実行） | IT-UC-GenerateCiTemplate-001, IT-UC-RenderCiTemplate-WI031-001（実 `docs/templates/ci/aidlc-gate.yml` とバイト一致検証）, IT-API-CiTemplateFlow-001 | ✅ カバー済み |
| H13-01-AC-2 | `consistency-check.yml`テンプレートの作成（週次でL4バリデータ実行） | IT-UC-GenerateCiTemplate-002, IT-UC-RenderCiTemplate-WI031-002（実 `docs/templates/ci/consistency-check.yml` と一致検証）, IT-API-CiTemplateFlow-002 | ✅ カバー済み |
| H13-01-AC-3 | `.husky/pre-commit`テンプレートの作成（commit時にL2バリデータ実行） | IT-UC-GenerateCiTemplate-003, IT-UC-RenderCiTemplate-WI031-003（実 `docs/templates/hooks/pre-commit` と一致検証）, IT-UC-RenderCiTemplate-WI182-001, IT-API-CiTemplateFlow-002 | ✅ カバー済み |
| H13-01-AC-4 | 各テンプレートがphasegate.config.jsonのプリセット設定を参照 | UT-TG-001〜UT-TG-005（PresetConfigPort経由検証）, IT-UC-GenerateCiTemplate-001〜003 | ✅ カバー済み |

### H13-02: 反復エラー自動エスカレーション

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H13-02-AC-1 | 同一HarnessError codeの繰り返し（閾値: 3回以上）の検出 | UT-ER-006, UT-RD-003, IT-UC-RecordErrorOccurrence-002, IT-API-RepetitionFlow-001 | ✅ カバー済み |
| H13-02-AC-2 | 反復検出時の自動エスカレーション（ログ出力 + 警告メッセージ）の実行 | UT-RD-003, IT-UC-RecordErrorOccurrence-002, IT-API-RepetitionFlow-002 | ✅ カバー済み |
| H13-02-AC-3 | エスカレーション閾値のphasegate.config.jsonによる設定 | UT-ER-002（threshold=5カスタム値検証）, UT-RD-003 | ✅ カバー済み |
| H13-02-AC-4 | 反復検出のリセット条件（エラー解消時）の定義 | UT-ER-011〜UT-ER-013, IT-UC-ResetRepetition-001〜004, IT-API-RepetitionFlow-003 | ✅ カバー済み |

### H13-03: AGENTS.mdポインタ型移行

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H13-03-AC-1 | AGENTS.mdの記述的バリデータ一覧を`phasegate:status`実行へのポインタに置換 | IT-UC-MigrateAgentsMd-001, IT-API-AgentsMdFlow-001 | ✅ カバー済み |
| H13-03-AC-2 | AGENTS.mdへのADR参照リンクの追加 | UT-PV-005, UT-PV-006（AdrExistencePort **モック**検証のみ — §11 訂正履歴参照） | ⚠️ ドメインロジックのみ（実コーパス未検証・本番配線バグ未修正） |
| H13-03-AC-3 | 移行前と比較して行数50%以上の削減 | IT-UC-MigrateAgentsMd-003, IT-UC-MigrateAgentsMd-004, IT-REPO-AgentsMdFile-003 | ✅ カバー済み |
| H13-03-AC-4 | ポインタが参照する先（コマンド、ファイル）の実在性検証 | UT-PV-001〜UT-PV-008（存在性は全て **モック** port）, IT-UC-ValidatePointers-001〜003, IT-UC-MigrateAgentsMd-006 — §11 訂正履歴参照 | ⚠️ ドメインロジックのみ（実コマンド/実 ADR コーパス未検証・本番配線バグ未修正） |
| H13-03-AC-5 | skill-qualityからのlesson artifactのAGENTS.mdへの集約・反映 | UT-LA-001〜UT-LA-007, IT-UC-AggregateLessons-001〜004, IT-UC-MigrateAgentsMd-001, IT-API-AgentsMdFlow-001 | ✅ カバー済み |

**受け入れ基準カバレッジ: 11/13 実検証 = 85%**（H13-03-AC-2 / AC-4 はドメインロジックのみ・実コーパス/本番配線未検証。§11 訂正履歴参照）

---

## 3. ドメインロジック（不変条件）カバレッジ

`domain_model.md` §5「不変条件」に記載された INV-1〜INV-12 の全条件と対応ユニットテストのマッピング。

| INV ID | 不変条件内容 | 対応テストケースID | カバー状態 |
|--------|------------|-----------------|----------|
| INV-1 | `templateType` は3種（aidlc-gate / consistency-check / pre-commit）のいずれかであること | UT-CT-004, UT-CT-009 | ✅ カバー済み |
| INV-2 | `TemplateConfig.targetValidatorIds` は1件以上であること（空リスト不正） | UT-TC-004, UT-TC-006, UT-CT-007, UT-CT-010 | ✅ カバー済み |
| INV-3 | `TemplateConfig.targetValidatorIds` の全IDがValidator ID Registry上の有効なIDであること | UT-TG-005（空リスト返却時のエラー検証） | ✅ カバー済み |
| INV-4 | `presetRef`が参照するPresetは`TemplateConfig.targetValidatorIds`を包含していること | UT-TG-001〜UT-TG-003（PresetConfigPort+ValidatorIdRegistryPort連携検証） | ✅ カバー済み |
| INV-5 | `occurrenceCount` は0以上の整数であること（負値不正） | UT-ER-014 | ✅ カバー済み |
| INV-6 | `escalated=true` の場合、`occurrenceCount >= threshold` であること | UT-ER-006, UT-ER-015 | ✅ カバー済み |
| INV-7 | `reset()` は `escalated=true` かつ `RepetitionResetCondition` 成立時のみ呼び出し可能 | UT-ER-012, UT-ER-013（違反時エラー検証） | ✅ カバー済み |
| INV-8 | `PointerEntry[].key` はすべて一意であること（重複key禁止） | UT-AMP-003, UT-AMP-006, UT-AMP-011 | ✅ カバー済み |
| INV-9 | `validate()` を通過したAgentsMdPointerはDead Pointerを含まないこと | UT-PV-002, UT-PV-004, UT-PV-006（Dead Pointer検出検証） | ✅ カバー済み |
| INV-10 | `adrLinks` が参照するADRはadr-foundationのADR Frontmatter Schema上に存在すること | UT-PV-005, UT-PV-006（**モック** AdrExistencePort のみ — §11 訂正履歴参照） | ⚠️ ドメインロジックのみ（実 ADR コーパス未検証・本番配線バグ未修正） |
| INV-11 | `FilePointer.filePath` はプロジェクトルートからの相対パス形式であること | UT-PE-005, UT-PE-007, UT-AMP-010 | ✅ カバー済み |
| INV-12 | `lessonId` はUUID形式の一意識別子であること | UT-LA-007 | ✅ カバー済み |

**不変条件カバレッジ: 11/12 実検証 = 92%**（INV-10 は AdrExistencePort モックのみ・実 ADR コーパス未検証。§11 訂正履歴参照）

---

## 4. UseCaseカバレッジ

| UseCase名 | ストーリー | 正常系テスト | 異常系テスト | カバー状態 |
|---------|----------|------------|------------|----------|
| GenerateCiTemplateUseCase | H13-01 | IT-UC-GenerateCiTemplate-001〜003（3件） | IT-UC-GenerateCiTemplate-004〜006（3件） | ✅ カバー済み |
| RenderCiTemplateUseCase | H13-01 | IT-UC-RenderCiTemplate-001〜002（モック）+ WI031-001〜003 / WI182-001 / WI183-001 / WI032-001（実 `docs/templates/` とバイト一致検証） | IT-UC-RenderCiTemplate-003（1件） | ✅ カバー済み |
| RecordErrorOccurrenceUseCase | H13-02 | IT-UC-RecordErrorOccurrence-001〜003（3件） | IT-UC-RecordErrorOccurrence-004（1件） | ✅ カバー済み |
| CheckEscalationUseCase | H13-02 | IT-UC-CheckEscalation-001〜002（2件） | —（存在しないコード確認はIT-UC-CheckEscalation-002で対応） | ✅ カバー済み |
| ResetRepetitionUseCase | H13-02 | IT-UC-ResetRepetition-001（1件） | IT-UC-ResetRepetition-002〜004（3件） | ✅ カバー済み |
| MigrateAgentsMdUseCase | H13-03 | IT-UC-MigrateAgentsMd-001〜004（4件） | IT-UC-MigrateAgentsMd-005〜006（2件） | ✅ カバー済み |
| AggregateLessonsUseCase | H13-03 | IT-UC-AggregateLessons-001〜003（3件） | IT-UC-AggregateLessons-004（1件） | ✅ カバー済み |
| ValidatePointersUseCase | H13-03 | IT-UC-ValidatePointers-001〜002（2件） | IT-UC-ValidatePointers-003（1件） | ✅ カバー済み |

**UseCaseカバレッジ: 8/8 = 100%**（正常系19件 + 異常系13件 = UseCase合計32件）

---

## 5. Infrastructure Adapterカバレッジ

`it_test_design.md` §1「対象コンポーネント」に列挙されたInfrastructure Adapterを基準とする。

| Adapter名 | カテゴリ | テストケース数 | カバー状態 |
|---------|--------|------------|----------|
| ErrorRepetitionJsonRepository | ファイルI/O（実FS） | 5件（IT-REPO-ErrorRepetitionJson-001〜005） | ✅ カバー済み |
| AgentsMdFileAdapter | ファイルI/O（実FS） | 3件（IT-REPO-AgentsMdFile-001〜003） | ✅ カバー済み |
| FileSystemExistenceAdapter | ファイルI/O（実FS） | 2件（IT-REPO-FileSystemExistence-001〜002） | ✅ カバー済み |
| LessonArtifactFileReaderAdapter | ファイルI/O（実FS） | 4件（IT-REPO-LessonArtifactReader-001〜004） | ✅ カバー済み |
| ValidatorIdRegistryAdapter | 外部Unitモック対象 | 0件（モック化） | ⚠️ 意図的除外 |
| PresetConfigAdapter | 外部Unitモック対象 | 0件（モック化） | ⚠️ 意図的除外 |
| EscalationLogExecutorAdapter | 外部Unitモック対象 | 0件（モック化） | ⚠️ 意図的除外 |
| YamlTemplateRendererAdapter | 外部Unitモック対象 | 0件（モック化） | ⚠️ 意図的除外 |
| HarnessApiCommandExistenceAdapter | 外部Unitモック対象 | 0件（モック化） | ⚠️ 意図的除外 |
| AdrFoundationExistenceAdapter | 外部Unitモック対象 | 0件（モック化） | ⚠️ 意図的除外 |

**Infrastructure Adapterカバレッジ**:
- **実FS操作アダプタ**: 4/4 = 100%（テストすべき実装アダプタは全てカバー済み）
- **外部Unit依存アダプタ**: 0/6（設計方針: 全モック化。統合テストはPortインターフェース経由でモック検証済み）

> `it_test_design.md` §3「テスト環境設定」に「外部UnitアダプタはすべてMock化（validator-system / harness-api / adr-foundationの実実装には依存しない）」と明記されているため、外部Unit依存の6アダプタのテストケース未設計は意図的な設計判断。

---

## 6. Presentation Handlerカバレッジ

| Handler名 | ストーリー | テストケース数 | 正常系 | 異常系 | カバー状態 |
|---------|----------|------------|------|------|----------|
| GenerateCiTemplateHandler | H13-01 | 5件（IT-API-GenerateCiTemplateHandler-001〜005） | 3件 | 2件 | ✅ カバー済み |
| MigrateAgentsMdHandler | H13-03 | 5件（IT-API-MigrateAgentsMdHandler-001〜005） | 3件 | 2件 | ✅ カバー済み |
| CheckRepetitionHandler | H13-02 | 4件（IT-API-CheckRepetitionHandler-001〜004） | 2件 | 2件 | ✅ カバー済み |

**Presentation Handlerカバレッジ: 3/3 = 100%**（Handler合計14件）

---

## 7. Cross-Layer統合テストカバレッジ

| 統合フロー名 | ストーリー | テストケース数 | カバー状態 |
|-----------|----------|------------|----------|
| CI/CDテンプレート生成統合フロー | H13-01 | 2件（IT-API-CiTemplateFlow-001〜002） | ✅ カバー済み |
| 反復エラー検出統合フロー | H13-02 | 3件（IT-API-RepetitionFlow-001〜003） | ✅ カバー済み |
| AGENTS.md移行統合フロー | H13-03 | 3件（IT-API-AgentsMdFlow-001〜003） | ✅ カバー済み |

**Cross-Layer統合テスト: 全3フロー × 計8件**

---

## 8. テストケース総数内訳

### ユニットテスト（unit_test_design.md）: 105件

| 対象クラス | テストケース数 |
|----------|------------|
| TemplateConfig（VO） | 10件 |
| EscalationAction（VO） | 10件 |
| RepetitionResetCondition（VO） | 4件 |
| PointerEntry（VO） | 11件 |
| CiTemplate（集約ルート） | 14件 |
| ErrorRepetition（集約ルート） | 16件 |
| AgentsMdPointer（集約ルート） | 12件 |
| TemplateGenerator（ドメインサービス） | 8件 |
| RepetitionDetector（ドメインサービス） | 5件 |
| PointerValidator（ドメインサービス） | 8件 |
| LessonAggregator（ドメインサービス） | 7件 |
| **合計** | **105件** |

### ITテスト（it_test_design.md）: 68件

| カテゴリ | テストケース数 |
|--------|------------|
| UseCase（8種） | 32件 |
| Infrastructure Adapter（4種・実FSテスト） | 14件 |
| Presentation Handler（3種） | 14件 |
| Cross-Layer統合（3フロー） | 8件 |
| **合計** | **68件** |

### **総計: 173件**

---

## 9. 未カバー項目一覧

設計上の意図的除外（優先度低）を除き、真の未カバー項目はなし。

| 項目 | 理由 | 優先度 |
|------|------|--------|
| ValidatorIdRegistryAdapter の単体テスト | 外部Unitモック化方針による意図的除外（validator-system依存）。UseCase統合テストのモック経由でPortインターフェースは検証済み | 低（Wave 3完了後のE2Eテストで担保） |
| PresetConfigAdapter の単体テスト | 外部Unitモック化方針による意図的除外（config-foundation依存） | 低 |
| EscalationLogExecutorAdapter の単体テスト | 外部Unitモック化方針による意図的除外（ログ出力I/Oテスト） | 低 |
| YamlTemplateRendererAdapter の単体テスト | 外部Unitモック化方針による意図的除外（YAML生成・ファイル書き込みI/O） | 低 |
| HarnessApiCommandExistenceAdapter の単体テスト | 外部Unitモック化方針による意図的除外（harness-api依存） | 低 |
| AdrFoundationExistenceAdapter の単体テスト | 外部Unitモック化方針による意図的除外（adr-foundation依存） | 低 |

---

## 10. 次のアクション

### 判定結果サマリー

| 観点 | カバレッジ率 | 判定 |
|------|------------|------|
| 受け入れ基準 | 100% | ✅ |
| ドメインロジック（不変条件） | 100% | ✅ |
| UseCase | 100% | ✅ |
| Infrastructure Adapter（実FS対象） | 100% | ✅ |
| Presentation Handler | 100% | ✅ |
| **総合** | **✅ テストロジック設計に進む** | — |

### 推奨アクション

1. **テストロジック設計（story-implementor）に進む**: 全主要観点で90%以上（多くが100%）のカバレッジを達成しているため、テストロジック実装フェーズへ移行可能。

2. **外部Unitアダプタのテスト戦略（低優先）**: 下記6アダプタは現時点で意図的に未テストだが、Wave 3完了後のE2E統合テスト設計時に対処を検討すること。
   - ValidatorIdRegistryAdapter、PresetConfigAdapter、EscalationLogExecutorAdapter
   - YamlTemplateRendererAdapter、HarnessApiCommandExistenceAdapter、AdrFoundationExistenceAdapter

3. **stateful mockの実装確認**: IT-API-RepetitionFlow-001では「状態を保持するstateful mock」が必要とされており、テスト実装時にVitest `vi.fn()`の実装設計に注意が必要。

4. **tmpdir管理の標準化**: 複数のInfrastructure Adapterテストで`os.tmpdir()`を使用するため、`scripts/harness/__tests__/helpers/test-helpers.ts`にtmpdir管理ユーティリティを追加することを推奨。

## 11. 訂正履歴（2026-07-07, WI-237）

反ロンダリング深掘り第 2 弾（skill-quality に続く ci-governance）。実アーティファクト照合で以下を確認・訂正した。

### 11.1 H13-01-AC-1 / AC-2 / AC-3 の実テスト再バインド（訂正・改善）

- **旧**: `IT-UC-RenderCiTemplate-001 / 002`（`vi.fn().mockResolvedValue(...)` の**モック** renderer）を引用していた。これらは outputPath 文字列のみを検証し、テンプレート内容が実ファイルと一致するかは検証しない。
- **新**: 同一テストファイルに既存していた実ファイル検証テスト `IT-UC-RenderCiTemplate-WI031-001/002/003`, `WI182-001`, `WI183-001`, `WI032-001` を引用に追加。これらは `new YamlTemplateRendererAdapter(process.cwd())` を構築し、レンダ結果 content が実 `docs/templates/ci/aidlc-gate.yml` / `consistency-check.yml` / `docs/templates/hooks/pre-commit` とバイト一致することを検証する（`npx vitest run` で 10/10 green 確認済み）。実検証テストは既存だが未引用だったため、正直な再バインドのみで H13-01 は真正カバーとなる。

### 11.2 H13-03-AC-2 / AC-4 / INV-10 のモック誤引用（CONFIRMED-FALSE）

- `UT-PV-005/006`（`pointer-validator.test.ts`）は `AdrExistencePort` をモック化し、`validate-pointers-usecase.test.ts` は存在性 port を `vi.fn()` で差し替える。**実 `docs/ADR/` コーパス・実コマンドレジストリに対する存在性検証は一切行っていない**。よって従来の「✅ 100% カバー」は実検証を伴わない誤引用だった。ドメインロジック（PointerValidator の突合ロジック）自体は正しく検証されているが、AC 本文が要求する「実在性検証」は未達。該当行を ⚠️（ドメインロジックのみ）へ訂正した。

### 11.3 本番配線バグ（REAL PRODUCTION BUG・確認済み・修正は BLOCKED）

- `scripts/harness/ci-governance/composition-root.ts` L86-87 は `new HarnessApiCommandExistenceAdapter()` / `new AdrFoundationExistenceAdapter()` を**空リストで**生成している。両アダプタは既定引数 `[]` を取るため、本番では全 ADR ポインタ・全コマンドポインタが「存在しない（dead pointer）」と誤判定され、`validate-pointers` / `ci:migrate-agents-md` の存在性検証が実質無効化される（ポート・アダプタ・ドメインは実装済みで、注入データのみの配線欠陥）。自リポの現行 `AGENTS.md` には lesson-pointer / ADR-link セクションが無いため影響は潜在的だが、`ci:migrate-agents-md` でポインタが投入された瞬間に顕在化する。
- **修正方針**（未適用）: composition-root で `docs/ADR/` の `NNN-*.md` から 3 桁 ADR id を導出し `AdrFoundationExistenceAdapter` に注入、harness-api の canonical `KNOWN_COMMANDS` を `HarnessApiCommandExistenceAdapter` に注入する。ドメインモデル追加・API 契約変更を伴わない純粋な配線修正。
- **BLOCKED の理由**: `scripts/harness/ci-governance/` の非テストソース編集は `[L2-STORY-REFLECTION]` フェーズゲートにより**現在ブロックされている**。WI-222 の反映は本 WI で解消したが、ci-governance には約 23 件の未反映 WI 背景バックログ（WI-040, WI-107/108/109, WI-120/122/123/124/128, WI-140/141/142/150/174/182/183/185/189/190/194/198）が残存し、これらが解消されるまで全ソース編集がブロックされる。Bash 迂回は品質防御の無効化に当たるため実施しない（CLAUDE.md 禁止事項）。正規手順（反映バックログ返済 or cascade-updater）での解消を要する別 WI として据え置く。この訂正履歴は実検証未達を隠さず正直に露出させることを目的とする。

## WI-107: L4 Advisory Policy

@work-item-id WI-107

CI governance treats L4 as scheduled/advisory by default. CI output must show skipped disabled L4 validators and must only turn warnings into failure when warning escalation is explicitly enabled.

## WI-108: L2-L4 CI Contract

@work-item-id WI-108

`phasegate:ci-check` is the public CI command for L2-L4 validation. Templates and command documentation must not describe an L3-only run as the full CI gate.

## WI-109: Self-Lint Gate Readiness

@work-item-id WI-109

CI governance relies on `phasegate:lint` and `phasegate:complete-check` as clean self-checks. The WI-109 boundary correction keeps those commands suitable for release/publish gates by removing the self-lint architecture violation.
