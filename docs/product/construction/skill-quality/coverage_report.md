# テストカバレッジレポート: skill-quality

@story-id H12-01
@story-id H12-02
@story-id H12-03
@story-id H12-04
@story-id H12-05
@story-id H12-06
> **作成日**: 2026-03-20
> **Unit ID**: skill-quality
> **Wave**: 3

---

## 1. サマリー

| 観点 | カバー項目数 | 未カバー項目数 | カバレッジ率 |
|------|------------|--------------|------------|
| 受け入れ基準（AC） | 25 | 1 | 96.2% |
| ドメインロジック（不変条件） | 12 | 0 | 100% |
| UseCase | 7 | 0 | 100% |
| Infrastructure Adapter | 11 | 0 | 100% |
| Presentation Handler | 6 | 0 | 100% |
| **総合** | **61** | **1** | **98.4%** |

### 判定結果

- ✅ 98.4%: 受け入れ基準・不変条件・UseCase・Presentation Handler・Infrastructure Adapter は全てカバーされている。未カバーは H12-04 AC-2（ci-governance H13-03 の責務として対象外）のみ。テストロジック設計への移行を承認。

---

## 2. 受け入れ基準カバレッジ

各ストーリー（H12-01〜H12-06）の受け入れ基準とテストケース ID のマッピング。

### H12-01: story-implementor Atomic Git Commits + TDD品質契約

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H12-01-AC-1 | TDDサイクルのGreen到達時にAtomic commitが自動生成される | IT-UC-ExecTdd-001, IT-API-TddE2E-001 | ✅ カバー済み |
| H12-01-AC-2 | Refactor完了時にAtomic commitが自動生成される | IT-UC-ExecTdd-001（phase='REFACTOR'）, UT-ACS-001 | ✅ カバー済み |
| H12-01-AC-3 | コミットメッセージに`feat({unit}/{US}):`プレフィックスが付与される | UT-CM-005, UT-CM-006, IT-REPO-GitCommit-001 | ✅ カバー済み |
| H12-01-AC-4 | TDD品質契約（Red→Green→Refactorの各ステップ品質チェック）がSKILL.mdに定義されている | UT-TC-004〜UT-TC-007（isReadyForCommit テスト） | ✅ カバー済み |
| H12-01-AC-5 | Atomic commit前にL1+L2バリデータが通過していることが保証される | IT-UC-ExecTdd-002, IT-UC-ExecTdd-006, UT-ACS-004, UT-ACS-005, UT-ACS-006, UT-ACS-007 | ✅ カバー済み |

H12-01 カバレッジ: **5/5 (100%)**

---

### H12-02: test-coverage-checker Nyquist Validation統合

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H12-02-AC-1 | test-coverage-checkerがrequirement-test-matrix.jsonを生成または更新する | IT-REPO-ReqMatrix-001, IT-UC-CheckCov-001 | ✅ カバー済み |
| H12-02-AC-2 | 要件→テスト方向のトレーサビリティ（全ACにテストが紐づいているか）を検証する | IT-UC-CheckCov-001（RequirementCoverage total/covered 検証）, UT-RCR-001〜UT-RCR-009 | ✅ カバー済み |
| H12-02-AC-3 | テスト→要件方向のトレーサビリティ（全テストがACに紐づいているか）を検証する | IT-UC-CheckCov-002（uncoveredIds 検証）, UT-CVR-005 | ✅ カバー済み |
| H12-02-AC-4 | coverage_report.mdに要件カバレッジ（AC網羅率）が含まれる | IT-API-CovHandler-001, IT-API-CovHandler-003（JSON出力確認） | ✅ カバー済み |

H12-02 カバレッジ: **4/4 (100%)**

---

### H12-03: implementation-readiness-checker Plan-Checker Loop統合

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H12-03-AC-1 | implementation-readiness-checkerが最大3回の検証→修正ループを実行する | IT-UC-PlanLoop-003（3回全試行）, UT-PCL-009 | ✅ カバー済み |
| H12-03-AC-2 | 各ループでNyquist coverageRate（AC網羅率）を検証する | IT-UC-PlanLoop-001, IT-UC-PlanLoop-002（coverageRate確認）, UT-LPA-006, UT-LPA-007 | ✅ カバー済み |
| H12-03-AC-3 | coverageRateが閾値未満の場合、不足箇所を指摘して修正を促す | IT-UC-PlanLoop-002（gaps フィードバック）, UT-PCL-004（gaps非空RUNNING継続） | ✅ カバー済み |
| H12-03-AC-4 | 3回のループで閾値を達成できない場合、人間へのエスカレーションが行われる | IT-UC-PlanLoop-003（escalationRequired=true）, IT-API-PlanHandler-002（終了コード1） | ✅ カバー済み |
| H12-03-AC-5 | ループの実行履歴がログとして記録される | IT-UC-PlanLoop-001（loopHistory.length確認）, UT-PCL-003〜UT-PCL-005 | ✅ カバー済み |

H12-03 カバレッジ: **5/5 (100%)**

---

### H12-04: Agent-Lesson System

> **注意**: AC-2（AGENTS.mdへの集約・反映）は ci-governance Unit（H13-03）の責務として分離済み（skill_quality_unit.md §3.4 AC分割記載）。本 Unit の責務は lesson artifact 生成・出力に限定されるため、AC-2 は本 Unit の対象外とする。

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H12-04-AC-1 | `[Agent-Lesson]`タグ付きの教訓を収集する仕組みが実装されている | IT-REPO-LessReader-001〜003, UT-LC-001〜UT-LC-004 | ✅ カバー済み |
| H12-04-AC-2 | 収集された教訓がAGENTS.mdに構造化された形式で追記される | — | ⚪ 対象外（ci-governance H13-03 の責務） |
| H12-04-AC-3 | 重複する教訓の検出・統合が行われる | UT-LD-001〜UT-LD-005, IT-UC-CollLess-002, IT-API-LessE2E-002 | ✅ カバー済み |
| H12-04-AC-4 | Agent-Lesson Systemの回帰テストが存在する | IT-API-LessE2E-001, IT-API-LessE2E-002（end-to-end統合テスト） | ✅ カバー済み |

H12-04 カバレッジ（本Unit担当分）: **3/3 (100%)**（AC-2 除外）
H12-04 カバレッジ（全AC含む）: **3/4 (75%)**（AC-2 は ci-governance で充足）

---

### H12-05: Cascade Updater拡張

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H12-05-AC-1 | Level 3完了後に`product/construction/{unit}/`配下のドキュメントが累積更新される | IT-UC-CascUpd-001（updatedCount=2）, UT-CUS-001 | ✅ カバー済み |
| H12-05-AC-2 | 累積更新箇所に@story-idアノテーションが自動付与される | UT-CUT-001〜UT-CUT-006（storyIdTag生成）, IT-API-CascHandler-001 | ✅ カバー済み |
| H12-05-AC-3 | Cascade Updaterの実行結果に更新ファイル・セクション・付与ストーリーIDの一覧が含まれる | UT-CURES-001〜UT-CURES-005, IT-UC-CascUpd-001（output.appliedStoryIds確認） | ✅ カバー済み |
| H12-05-AC-4 | Cascade Updaterの回帰テストが存在する | IT-UC-CascUpd-001〜IT-UC-CascUpd-003, IT-API-CascHandler-001〜003 | ✅ カバー済み |

H12-05 カバレッジ: **4/4 (100%)**

---

### H12-06: スキルSKILL.md構造維持検証

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H12-06-AC-1 | SKILL.mdの必須構造（フロントマター/目的/入力/出力/前提条件/実行フロー）が定義されている | UT-SS-001（requiredSections 6件確認）, UT-SS-003（不変条件） | ✅ カバー済み |
| H12-06-AC-2 | v0既存スキルのSKILL.mdが必須構造を満たすことを検証するテストが存在する | IT-UC-ValSkill-001, IT-API-SkillE2E-001（passed=true シナリオ） | ✅ カバー済み |
| H12-06-AC-3 | v1新規スキルのSKILL.mdが必須構造を満たすことを検証するテストが存在する | IT-UC-ValSkill-002（欠落検出）, IT-API-SkillE2E-002 | ✅ カバー済み |
| H12-06-AC-4 | 構造違反時のエラーメッセージに不足セクション名と期待される構造が含まれる | IT-API-SkillHandler-002（missingSection一覧出力）, UT-SVR-002（missingSection確認） | ✅ カバー済み |

H12-06 カバレッジ: **4/4 (100%)**

---

### 受け入れ基準カバレッジ総計

| ストーリー | 総AC数 | カバー済み | 未カバー（対象外含む） | カバレッジ率 |
|---------|--------|----------|------------------|------------|
| H12-01 | 5 | 5 | 0 | 100% |
| H12-02 | 4 | 4 | 0 | 100% |
| H12-03 | 5 | 5 | 0 | 100% |
| H12-04 | 4 | 3 + 1対象外 | 0 | 100%（本Unit担当分） |
| H12-05 | 4 | 4 | 0 | 100% |
| H12-06 | 4 | 4 | 0 | 100% |
| **合計** | **26** | **25** | **1（対象外）** | **96.2%** |

---

## 3. ドメインロジック（不変条件）カバレッジ

domain_model.md §5 に記載された全 INV 条件と対応するユニットテストケースのマッピング。

| INV ID | 不変条件内容 | 対応テストケースID | カバー状態 |
|--------|------------|-----------------|----------|
| INV-1 | PlanCheckerLoop: `loopHistory.length <= maxRetries(3)`。超過は HarnessError | UT-PCL-006 | ✅ カバー済み |
| INV-2 | PlanCheckerLoop: `status=PASSED` への遷移は gaps=[] の場合のみ | UT-PCL-003, UT-PCL-005, UT-PCL-010 | ✅ カバー済み |
| INV-3 | PlanCheckerLoop: PASSED/FAILED_EXCEEDED 後は addAttempt 不可 | UT-PCL-007, UT-PCL-008 | ✅ カバー済み |
| INV-4 | PlanCheckerLoop: maxRetries は 3 固定 | UT-PCL-011 | ✅ カバー済み |
| INV-5 | LessonArtifact: LessonFingerprint の一意性 | UT-LA-007, UT-LA-008 | ✅ カバー済み |
| INV-6 | LessonArtifact: storyId は非空かつ HXX-XX 形式 | UT-LA-003, UT-LA-004 | ✅ カバー済み |
| INV-7 | LessonArtifact: lessonId は一意（実装レベル保証） | IT-REPO-LessWriter-001（出力ファイルパス検証） | ✅ カバー済み |
| INV-8 | CommitMessage: unit・storyId・description はいずれも非空 | UT-CM-002, UT-CM-003, UT-CM-004 | ✅ カバー済み |
| INV-9 | CommitMessage: `format()` 結果は `feat({unit}/{storyId}): {description}` 形式 | UT-CM-005, UT-CM-006 | ✅ カバー済み |
| INV-10 | SkillStructure: requiredSections は変更不可（VO定数）かつ 1 件以上 | UT-SS-001, UT-SS-002, UT-SS-003 | ✅ カバー済み |
| INV-11 | Lesson: content は非空、fingerprint は content 正規化後の SHA-256 と一致 | UT-LS-001〜UT-LS-005, UT-LF-001〜UT-LF-005 | ✅ カバー済み |
| INV-12 | CoverageReport: requirementCoverage・codeCoverage は非 null | UT-CVR-002, UT-CVR-003 | ✅ カバー済み |

不変条件カバレッジ: **12/12 (100%)**

---

## 4. UseCaseカバレッジ

| UseCase名 | 正常系テスト | 異常系テスト | カバー状態 |
|----------|-----------|-----------|----------|
| ExecuteTddCycleUseCase | IT-UC-ExecTdd-001, IT-UC-ExecTdd-002 | IT-UC-ExecTdd-003〜005 | ✅ 6件 |
| CheckCoverageUseCase | IT-UC-CheckCov-001, IT-UC-CheckCov-002 | IT-UC-CheckCov-003, IT-UC-CheckCov-004 | ✅ 4件 |
| RunPlanCheckerLoopUseCase | IT-UC-PlanLoop-001〜003 | IT-UC-PlanLoop-004 | ✅ 4件 |
| CollectLessonsUseCase | IT-UC-CollLess-001〜003 | — | ✅ 3件 |
| WriteLessonArtifactUseCase | IT-UC-WriteLess-001, IT-UC-WriteLess-002 | IT-UC-WriteLess-003, IT-UC-WriteLess-004 | ✅ 4件 |
| ApplyCascadeUpdateUseCase | IT-UC-CascUpd-001, IT-UC-CascUpd-002 | IT-UC-CascUpd-003 | ✅ 3件 |
| ValidateSkillStructureUseCase | IT-UC-ValSkill-001, IT-UC-ValSkill-002 | IT-UC-ValSkill-003 | ✅ 3件 |

UseCase カバレッジ: **7/7 (100%)** 合計 27 件

---

## 5. Infrastructure Adapterカバレッジ

| Adapter名 | テストケース数 | カバー状態 |
|----------|------------|----------|
| GitCommitExecutorAdapter | 2（IT-REPO-GitCommit-001〜002） | ✅ カバー済み |
| L1BiomeValidatorAdapter | 3（IT-REPO-L1Biome-001〜003） | ✅ カバー済み |
| L2ValidatorSystemAdapter | 3（IT-REPO-L2Validator-001〜003） | ✅ カバー済み |
| FileSystemLessonSourceReaderAdapter | 3（IT-REPO-LessReader-001〜003） | ✅ カバー済み |
| FileSystemLessonArtifactWriterAdapter | 2（IT-REPO-LessWriter-001〜002） | ✅ カバー済み |
| AjvLessonArtifactSchemaAdapter | 2（IT-REPO-LessSchema-001〜002） | ✅ カバー済み |
| FileSystemRequirementTestMatrixAdapter | 2（IT-REPO-ReqMatrix-001〜002） | ✅ カバー済み |
| ValidatorIdRegistryBridgeAdapter | 3（IT-REPO-ValidatorBridge-001〜003） | ✅ カバー済み |
| HarnessConfigQueryAdapter | 3（IT-REPO-ConfigQuery-001〜003） | ✅ カバー済み |
| VitestCoverageRunnerAdapter | 3（IT-REPO-CovRunner-001〜003） | ✅ カバー済み |
| FileSystemSkillFileReaderAdapter | 3（IT-REPO-SkillReader-001〜003） | ✅ カバー済み |

Infrastructure Adapter カバレッジ: **11/11 (100%)** 合計 29 件

---

## 6. Presentation Handlerカバレッジ

| Handler名 | テストケース数 | カバー状態 |
|----------|------------|----------|
| ExecuteTddCycleHandler | 3（IT-API-TddHandler-001〜003） | ✅ カバー済み |
| CheckCoverageHandler | 3（IT-API-CovHandler-001〜003） | ✅ カバー済み |
| RunPlanCheckerLoopHandler | 2（IT-API-PlanHandler-001〜002） | ✅ カバー済み |
| CollectLessonsHandler | 3（IT-API-LessHandler-001〜003） | ✅ カバー済み |
| ApplyCascadeUpdateHandler | 3（IT-API-CascHandler-001〜003） | ✅ カバー済み |
| ValidateSkillStructureHandler | 4（IT-API-SkillHandler-001〜004） | ✅ カバー済み |

Presentation Handler カバレッジ: **6/6 (100%)** 合計 18 件

---

## 7. テストケース総数サマリー

| 観点 | ソース | テストケース数 |
|-----|--------|------------|
| ユニットテスト（集約ルート） | unit_test_design.md | 21（PCL: 11, LA: 10） |
| ユニットテスト（値オブジェクト） | unit_test_design.md | 81 |
| ユニットテスト（ドメインサービス） | unit_test_design.md | 21 |
| **ユニットテスト 小計** | | **148** |
| ITテスト（UseCase） | it_test_design.md | 27 |
| ITテスト（Infrastructure Adapter） | it_test_design.md | 29 |
| ITテスト（Presentation Handler） | it_test_design.md | 18 |
| ITテスト（Cross-Layer統合） | it_test_design.md | 6 |
| **ITテスト 小計** | | **80** |
| **総合計** | | **228** |

---

## 8. 未カバー項目一覧

### 対象外項目

| 項目 | 理由 |
|-----|------|
| H12-04 AC-2（AGENTS.md への集約・反映） | ci-governance Unit（H13-03）の責務として明示的に分離済み（skill_quality_unit.md §3.4） |

---

## 9. 次のアクション

### 判定: ✅ 98.4% — テストロジック設計に進む

全 Infrastructure Adapter（11/11）のテストケースが定義済みとなり、Infrastructure Adapter カバレッジが 100% となった。総合カバレッジ 98.4% は 90% 以上の閾値を十分に満たしている。テストロジック設計への移行を承認する。

#### テストロジック設計移行時の注意点

- UT 148 件（ドメイン層）については、モック禁止原則（testing-rules.md）を遵守した純粋単体テストとして実装すること
- IT 68 件については、`vi.fn()` / `vi.mock()` を使用したポートモック差し替え方式で実装すること
- Cross-Layer 統合テスト（6 件）は全レイヤーを結合した E2E シナリオとして実行し、ポートのみをモックとする
- AjvLessonArtifactSchemaAdapter（IT-REPO-LessSchema-001〜002）は `docs/contracts/lesson-artifact.schema.json` 実体を使用し、モックを使わないこと

## WI-143: Skill Gatekeeping Reflection

@work-item-id WI-143

Planning skills that create implementation or design artifacts now carry a blocking WI pre-flight rule. This keeps skill-quality aligned with WI taxonomy by requiring a target `docs/inception/{unit}/WI-XXX/description.md` before plan generation.

<!-- @work-item-id WI-171, WI-172, WI-173 -->
## P3 Guidance Skill Coverage

| Skill | Coverage expectation |
|---|---|
| `phasegate-toolkit-guide` | Routes onboarding questions to getting-started, recipes, troubleshooting, installation, setup artifacts, and CLI reference. |
| `phasegate-config-doctor` | Uses `setup:agent` / `config:plan` outputs for setup repair and config change recommendations. |
| Lesson collection skills | Continue to output lesson artifacts only; AGENTS.md mutation remains ci-governance responsibility. |
