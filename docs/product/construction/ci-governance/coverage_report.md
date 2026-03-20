# テストカバレッジレポート: ci-governance

> **作成日**: 2026-03-20
> **Unit ID**: ci-governance
> **Wave**: 3

---

## 1. サマリー

| 観点 | カバー項目数 | 未カバー項目数 | カバレッジ率 |
|------|------------|--------------|------------|
| 受け入れ基準 | 13 | 0 | 100% |
| ドメインロジック（不変条件） | 12 | 0 | 100% |
| UseCase | 8 | 0 | 100% |
| Infrastructure Adapter | 4 | 6 | 40% |
| Presentation Handler | 3 | 0 | 100% |
| **総合（テストケース数ベース）** | **173** | **0** | **100%** |

> **補足**: Infrastructure Adapterカバレッジ率は「テスト対象として設計書に記載されたAdapter種別」のうち実際にテストケースが設計されたものの割合。記載済み10種のうち4種のみテストケースが定義されており40%。未カバー6種はモック化前提（外部Unitアダプタ）のため意図的に除外されている可能性あり。詳細は §5 参照。

### 判定結果

- ✅ 受け入れ基準: 100%（全13基準に対応テストケースが存在する）
- ✅ ドメインロジック（不変条件）: 100%（INV-1〜INV-12 全12条件がユニットテストでカバーされる）
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
| H13-01-AC-1 | `aidlc-gate.yml`テンプレートの作成（PR時にL1-L3バリデータ実行） | IT-UC-GenerateCiTemplate-001, IT-UC-RenderCiTemplate-001, IT-API-CiTemplateFlow-001 | ✅ カバー済み |
| H13-01-AC-2 | `consistency-check.yml`テンプレートの作成（週次でL4バリデータ実行） | IT-UC-GenerateCiTemplate-002, IT-API-CiTemplateFlow-002 | ✅ カバー済み |
| H13-01-AC-3 | `.husky/pre-commit`テンプレートの作成（commit時にL2バリデータ実行） | IT-UC-GenerateCiTemplate-003, IT-UC-RenderCiTemplate-002, IT-API-CiTemplateFlow-002 | ✅ カバー済み |
| H13-01-AC-4 | 各テンプレートがharness.config.jsonのプリセット設定を参照 | UT-TG-001〜UT-TG-005（PresetConfigPort経由検証）, IT-UC-GenerateCiTemplate-001〜003 | ✅ カバー済み |

### H13-02: 反復エラー自動エスカレーション

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H13-02-AC-1 | 同一HarnessError codeの繰り返し（閾値: 3回以上）の検出 | UT-ER-006, UT-RD-003, IT-UC-RecordErrorOccurrence-002, IT-API-RepetitionFlow-001 | ✅ カバー済み |
| H13-02-AC-2 | 反復検出時の自動エスカレーション（ログ出力 + 警告メッセージ）の実行 | UT-RD-003, IT-UC-RecordErrorOccurrence-002, IT-API-RepetitionFlow-002 | ✅ カバー済み |
| H13-02-AC-3 | エスカレーション閾値のharness.config.jsonによる設定 | UT-ER-002（threshold=5カスタム値検証）, UT-RD-003 | ✅ カバー済み |
| H13-02-AC-4 | 反復検出のリセット条件（エラー解消時）の定義 | UT-ER-011〜UT-ER-013, IT-UC-ResetRepetition-001〜004, IT-API-RepetitionFlow-003 | ✅ カバー済み |

### H13-03: AGENTS.mdポインタ型移行

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H13-03-AC-1 | AGENTS.mdの記述的バリデータ一覧を`harness:status`実行へのポインタに置換 | IT-UC-MigrateAgentsMd-001, IT-API-AgentsMdFlow-001 | ✅ カバー済み |
| H13-03-AC-2 | AGENTS.mdへのADR参照リンクの追加 | UT-PV-005, UT-PV-006（AdrExistencePort検証） | ✅ カバー済み |
| H13-03-AC-3 | 移行前と比較して行数50%以上の削減 | IT-UC-MigrateAgentsMd-003, IT-UC-MigrateAgentsMd-004, IT-REPO-AgentsMdFile-003 | ✅ カバー済み |
| H13-03-AC-4 | ポインタが参照する先（コマンド、ファイル）の実在性検証 | UT-PV-001〜UT-PV-008, IT-UC-ValidatePointers-001〜003, IT-UC-MigrateAgentsMd-006 | ✅ カバー済み |
| H13-03-AC-5 | skill-qualityからのlesson artifactのAGENTS.mdへの集約・反映 | UT-LA-001〜UT-LA-007, IT-UC-AggregateLessons-001〜004, IT-UC-MigrateAgentsMd-001, IT-API-AgentsMdFlow-001 | ✅ カバー済み |

**受け入れ基準カバレッジ: 13/13 = 100%**

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
| INV-10 | `adrLinks` が参照するADRはadr-foundationのADR Frontmatter Schema上に存在すること | UT-PV-005, UT-PV-006 | ✅ カバー済み |
| INV-11 | `FilePointer.filePath` はプロジェクトルートからの相対パス形式であること | UT-PE-005, UT-PE-007, UT-AMP-010 | ✅ カバー済み |
| INV-12 | `lessonId` はUUID形式の一意識別子であること | UT-LA-007 | ✅ カバー済み |

**不変条件カバレッジ: 12/12 = 100%**

---

## 4. UseCaseカバレッジ

| UseCase名 | ストーリー | 正常系テスト | 異常系テスト | カバー状態 |
|---------|----------|------------|------------|----------|
| GenerateCiTemplateUseCase | H13-01 | IT-UC-GenerateCiTemplate-001〜003（3件） | IT-UC-GenerateCiTemplate-004〜006（3件） | ✅ カバー済み |
| RenderCiTemplateUseCase | H13-01 | IT-UC-RenderCiTemplate-001〜002（2件） | IT-UC-RenderCiTemplate-003（1件） | ✅ カバー済み |
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
