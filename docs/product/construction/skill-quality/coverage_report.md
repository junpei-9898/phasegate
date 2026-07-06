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

| 観点 | カバー項目数 | 未カバー/部分/対象外 | カバレッジ率 |
|------|------------|--------------|------------|
| 受け入れ基準（AC） | 20 | 6（未3 / 部分2 / 対象外1） | 76.9% |
| ドメインロジック（不変条件） | 11 | 1 | 91.7% |
| UseCase | 7 | 0 | 100% |
| Infrastructure Adapter | 5 | 6 | 45.5% |
| Presentation Handler | 1 | 5 | 16.7% |
| **総合** | **44** | **18** | **71.0%** |

> **2026-07-07 訂正**: 本表は 2026-07-07 の反ロンダリング訂正で下方修正された（旧: 総合 61/1 = 98.4%）。旧数値は §5/§6 の存在しない handler/adapter テスト ID（`IT-API-*Handler`, `IT-API-*E2E`, `IT-REPO-*`）を実在テストとして計上し、モックポート差し替えの UseCase テストを実成果物検証と誤って計上したことによる水増しであった。詳細は末尾「訂正履歴」参照。

### 判定結果

- ⚠️ 71.0%: 訂正後の実カバレッジ。ドメイン層（不変条件 11/12・UseCase 7/7）は概ね実テストで担保されているが、**Infrastructure Adapter は 5/11、Presentation Handler は 1/6（間接1件のみ）** にとどまる。§6 の 6 handler・§5 の 6 adapter は対応するテストが存在せず、受け入れ基準のうち 3 件は誤ったアーティファクト参照（SKILL.md 実体でなく VO/バリデータロジック検証、またはモック固定文字列）に依拠していた。**実ソースは実装済みであり、これはテスト/引用のギャップであってフィーチャの欠落ではない。** 実テスト追加・@ac 束縛・L3-005 ゲーティングは後続フェーズ（WI-235+）で行う。

---

## 2. 受け入れ基準カバレッジ

各ストーリー（H12-01〜H12-06）の受け入れ基準とテストケース ID のマッピング。

### H12-01: story-implementor Atomic Git Commits + TDD品質契約

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H12-01-AC-1 | TDDサイクルのGreen到達時にAtomic commitが自動生成される | IT-UC-ExecTdd-001, IT-API-TddE2E-001 | ✅ カバー済み |
| H12-01-AC-2 | Refactor完了時にAtomic commitが自動生成される | IT-UC-ExecTdd-001（phase='REFACTOR'）, UT-ACS-001 | ✅ カバー済み |
| H12-01-AC-3 | コミットメッセージに`feat({unit}/{US}):`プレフィックスが付与される | UT-CM-005, UT-CM-006, IT-REPO-GitCommit-001 | ✅ カバー済み |
| H12-01-AC-4 | TDD品質契約（Red→Green→Refactorの各ステップ品質チェック）がSKILL.mdに定義されている | （旧: UT-TC-004〜007）→ 誤アーティファクト | ❌ 未カバー |
| H12-01-AC-5 | Atomic commit前にL1+L2バリデータが通過していることが保証される | IT-UC-ExecTdd-002, IT-UC-ExecTdd-006, UT-ACS-004, UT-ACS-005, UT-ACS-006, UT-ACS-007 | ✅ カバー済み |

> **AC-4 訂正（2026-07-07）**: 引用の `UT-TC-004〜007` は `__tests__/unit/skill-quality/commit-readiness.test.ts` にあり、`CommitReadiness` 値オブジェクト（`go()`/`noGo()`/`equals()`）のロジックを検証するものであって、`skills/story-implementor/SKILL.md` の内容を検証していない（誤アーティファクト）。SKILL.md 内容検証テストは後続フェーズで整備。

H12-01 カバレッジ: **4/5 (80%)**

---

### H12-02: test-coverage-checker Nyquist Validation統合

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H12-02-AC-1 | test-coverage-checkerがrequirement-test-matrix.jsonを生成または更新する | IT-REPO-ReqMatrix-001, IT-UC-CheckCov-001 | ✅ カバー済み |
| H12-02-AC-2 | 要件→テスト方向のトレーサビリティ（全ACにテストが紐づいているか）を検証する | IT-UC-CheckCov-001（RequirementCoverage total/covered 検証）, UT-RCR-001〜UT-RCR-009 | ✅ カバー済み |
| H12-02-AC-3 | テスト→要件方向のトレーサビリティ（全テストがACに紐づいているか）を検証する | IT-UC-CheckCov-002（uncoveredIds 検証）, UT-CVR-005 | ✅ カバー済み |
| H12-02-AC-4 | coverage_report.mdに要件カバレッジ（AC網羅率）が含まれる | IT-UC-CheckCov-001（requirementCoverage 算出）; 旧引用 IT-API-CovHandler-001/003 は不存在 | 🟡 部分 |

> **AC-4 訂正（2026-07-07）**: 引用の `IT-API-CovHandler-001/003` はテストツリーに存在しない（捏造 handler ID）。CheckCoverage UseCase が requirementCoverage を算出することは `IT-UC-CheckCov-001` で実テストされているが、handler が coverage_report.md / JSON に AC網羅率を出力することを assert するテストは存在しないため 部分 とする。

H12-02 カバレッジ: **3/4 (実カバー3, 部分1)**

---

### H12-03: implementation-readiness-checker Plan-Checker Loop統合

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H12-03-AC-1 | implementation-readiness-checkerが最大3回の検証→修正ループを実行する | IT-UC-PlanLoop-003（3回全試行）, UT-PCL-009 | ✅ カバー済み |
| H12-03-AC-2 | 各ループでNyquist coverageRate（AC網羅率）を検証する | IT-UC-PlanLoop-001, IT-UC-PlanLoop-002（coverageRate確認）, UT-LPA-006, UT-LPA-007 | ✅ カバー済み |
| H12-03-AC-3 | coverageRateが閾値未満の場合、不足箇所を指摘して修正を促す | IT-UC-PlanLoop-002（gaps フィードバック）, UT-PCL-004（gaps非空RUNNING継続） | ✅ カバー済み |
| H12-03-AC-4 | 3回のループで閾値を達成できない場合、人間へのエスカレーションが行われる | IT-UC-PlanLoop-003（escalationRequired=true）（IT-API-PlanHandler-002 は不存在, §6参照） | ✅ カバー済み |
| H12-03-AC-5 | ループの実行履歴がログとして記録される | IT-UC-PlanLoop-001（loopHistory.length確認）, UT-PCL-003〜UT-PCL-005 | ✅ カバー済み |

H12-03 カバレッジ: **5/5 (100%)**

---

### H12-04: Agent-Lesson System

> **注意**: AC-2（AGENTS.mdへの集約・反映）は ci-governance Unit（H13-03）の責務として分離済み（skill_quality_unit.md §3.4 AC分割記載）。本 Unit の責務は lesson artifact 生成・出力に限定されるため、AC-2 は本 Unit の対象外とする。

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H12-04-AC-1 | `[Agent-Lesson]`タグ付きの教訓を収集する仕組みが実装されている | IT-REPO-LessReader-001〜003, UT-LC-001〜UT-LC-004 | ✅ カバー済み |
| H12-04-AC-2 | 収集された教訓がAGENTS.mdに構造化された形式で追記される | — | ⚪ 対象外（ci-governance H13-03 の責務） |
| H12-04-AC-3 | 重複する教訓の検出・統合が行われる | UT-LD-001〜UT-LD-005, IT-UC-CollLess-002（IT-API-LessE2E-002 は不存在） | ✅ カバー済み |
| H12-04-AC-4 | Agent-Lesson Systemの回帰テストが存在する | IT-UC-CollLess-*（UseCaseレベル, モックポート）; 旧引用 IT-API-LessE2E-001/002 は不存在 | 🟡 部分 |

> **AC-3/AC-4 訂正（2026-07-07）**: `IT-API-LessE2E-001/002` はテストツリーに存在しない（捏造 E2E ID）。AC-3 は重複検出の実 UT/IT-UC テスト（`UT-LD-*`, `IT-UC-CollLess-002`）で独立に担保されるため カバー を維持。AC-4「回帰テストが存在する」は UseCase レベルのモックポートテストは実在するが、cited した E2E/回帰テストが不存在のため 部分。

H12-04 カバレッジ（本Unit担当分, AC-2除外）: **2/3 実カバー + 1部分**
H12-04 カバレッジ（全AC含む）: **カバー2 / 部分1 / 対象外1**（AC-2 は ci-governance で充足）

---

### H12-05: Cascade Updater拡張

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H12-05-AC-1 | Level 3完了後に`product/construction/{unit}/`配下のドキュメントが累積更新される | IT-UC-CascUpd-001（updatedCount=2）, UT-CUS-001 | ✅ カバー済み |
| H12-05-AC-2 | 累積更新箇所に@story-idアノテーションが自動付与される | UT-CUT-001〜UT-CUT-006（storyIdTag生成）（IT-API-CascHandler-001 は捏造ID; ただし ApplyCascadeUpdateHandler は §6 で間接検証あり） | ✅ カバー済み |
| H12-05-AC-3 | Cascade Updaterの実行結果に更新ファイル・セクション・付与ストーリーIDの一覧が含まれる | UT-CURES-001〜UT-CURES-005, IT-UC-CascUpd-001（output.appliedStoryIds確認） | ✅ カバー済み |
| H12-05-AC-4 | Cascade Updaterの回帰テストが存在する | IT-UC-CascUpd-001〜003（apply-cascade-update-usecase.test.ts 実在, handler 間接検証含む）（IT-API-CascHandler-* の連番IDは捏造） | ✅ カバー済み |

H12-05 カバレッジ: **4/4 (100%)**

---

### H12-06: スキルSKILL.md構造維持検証

| AC ID | 基準内容 | 対応テストケースID | カバー状態 |
|-------|---------|-----------------|----------|
| H12-06-AC-1 | SKILL.mdの必須構造（フロントマター/言語メタデータ/目的/入力/出力/前提条件/実行フロー）が定義されている | UT-SS-001（requiredSections 7件確認）, UT-SS-003（不変条件） | ✅ カバー済み |
| H12-06-AC-2 | v0既存スキルのSKILL.mdが必須構造を満たすことを検証するテストが存在する | （IT-UC-ValSkill-001 はバリデータロジックのみ検証, IT-API-SkillE2E-001 は不存在） | ❌ 未カバー |
| H12-06-AC-3 | v1新規スキルのSKILL.mdが必須構造を満たすことを検証するテストが存在する | （IT-UC-ValSkill-002 はバリデータロジックのみ検証, IT-API-SkillE2E-002 は不存在） | ❌ 未カバー |
| H12-06-AC-4 | 構造違反時のエラーメッセージに不足セクション名と期待される構造が含まれる | UT-SVR-002（missingSection確認）（IT-API-SkillHandler-002 は捏造ID, §6参照） | ✅ カバー済み |

> **AC-1 訂正（2026-07-07）**: `requiredSections` は `skill-structure.ts` の `REQUIRED_SECTIONS` で **7 件**（frontmatter / languageMetadata / purpose / inputs / outputs / prerequisites / executionFlow）。旧「6件」表記はドリフト。VO ロジック自体は `skill-structure.test.ts` で実テストされているため本行は カバー を維持し、件数のみ 6→7 に修正。
>
> **AC-2/AC-3 訂正（2026-07-07）**: `IT-UC-ValSkill-001/002` は実在するが、`validate-skill-structure-usecase.test.ts` 内で **モックした `SkillFileReaderPort`（`createMockSkillFileReaderPort` + `vi.fn().mockResolvedValue`）にコード内ハードコードの Markdown 文字列を注入** して検証している。すなわちバリデータ**ロジック**は実テスト済みだが、実在する `skills/*/SKILL.md` コーパスが必須構造に適合することを assert するテストは存在しない。加えて cited した `IT-API-SkillE2E-001/002` はテストツリーに存在しない。→ 実コーパス適合テストは後続フェーズで整備するため 未カバー とする。

H12-06 カバレッジ: **2/4 (実カバー2, 未カバー2)**

---

### 受け入れ基準カバレッジ総計

| ストーリー | 総AC数 | カバー済み | 部分 | 未カバー | 対象外 | カバレッジ率 |
|---------|--------|----------|------|--------|--------|------------|
| H12-01 | 5 | 4 | 0 | 1 | 0 | 80.0% |
| H12-02 | 4 | 3 | 1 | 0 | 0 | 75.0% |
| H12-03 | 5 | 5 | 0 | 0 | 0 | 100% |
| H12-04 | 4 | 2 | 1 | 0 | 1 | 50.0%（本Unit担当分） |
| H12-05 | 4 | 4 | 0 | 0 | 0 | 100% |
| H12-06 | 4 | 2 | 0 | 2 | 0 | 50.0% |
| **合計** | **26** | **20** | **2** | **3** | **1** | **76.9%** |

> **訂正（2026-07-07）**: 旧「25/26 = 96.2%」は誤アーティファクト参照（H12-01-AC-4 は CommitReadiness VO、H12-06-AC-2/3 はモック固定文字列）と捏造 handler/E2E ID（H12-02-AC-4, H12-04-AC-4）を実カバーとして計上した水増し。訂正後の実カバー（✅のみ）は 20/26 = 76.9%。

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
| INV-7 | LessonArtifact: lessonId は一意（実装レベル保証） | （旧: IT-REPO-LessWriter-001 は不存在。lesson-artifact.test.ts は lessonId の**存在**のみ確認, 一意性は未検証） | ❌ 未カバー |
| INV-8 | CommitMessage: unit・storyId・description はいずれも非空 | UT-CM-002, UT-CM-003, UT-CM-004 | ✅ カバー済み |
| INV-9 | CommitMessage: `format()` 結果は `feat({unit}/{storyId}): {description}` 形式 | UT-CM-005, UT-CM-006 | ✅ カバー済み |
| INV-10 | SkillStructure: requiredSections は変更不可（VO定数）かつ 1 件以上 | UT-SS-001, UT-SS-002, UT-SS-003 | ✅ カバー済み |
| INV-11 | Lesson: content は非空、fingerprint は content 正規化後の SHA-256 と一致 | UT-LS-001〜UT-LS-005, UT-LF-001〜UT-LF-005 | ✅ カバー済み |
| INV-12 | CoverageReport: requirementCoverage・codeCoverage は非 null | UT-CVR-002, UT-CVR-003 | ✅ カバー済み |

不変条件カバレッジ: **11/12 (91.7%)**（2026-07-07 訂正: INV-7 は cited した writer-adapter テストが不存在で一意性未検証のため 未カバー に下方修正）

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

> **訂正（2026-07-07）**: 11 adapter 中、専用テストファイルが実在するのは **5 件のみ**。cited した `IT-REPO-*` 連番 ID はいずれもテストツリーに literal で存在しない（設計上の予定 ID）が、下記 5 件は実テストファイルで担保されているため カバー を維持。残る 6 件は専用 adapter テストが存在せず（UseCase テストでは port をモック差し替えしているのみ）未カバー。

| Adapter名 | 実テスト | カバー状態 |
|----------|------------|----------|
| GitCommitExecutorAdapter | `__tests__/unit/skill-quality/git-commit-executor-adapter.test.ts` | ✅ カバー済み |
| L1BiomeValidatorAdapter | `__tests__/integration/skill-quality/l1-biome-validator-adapter.test.ts` | ✅ カバー済み |
| L2ValidatorSystemAdapter | `__tests__/integration/skill-quality/l2-validator-system-adapter.test.ts` | ✅ カバー済み |
| FileSystemRequirementTestMatrixAdapter | `__tests__/integration/skill-quality/file-system-requirement-test-matrix-adapter.test.ts` | ✅ カバー済み |
| VitestCoverageRunnerAdapter | `__tests__/integration/skill-quality/vitest-coverage-runner-adapter.test.ts` | ✅ カバー済み |
| FileSystemLessonSourceReaderAdapter | 専用テストなし（UseCase で port をモック）; 旧 IT-REPO-LessReader-* は不存在 | ❌ 未カバー |
| FileSystemLessonArtifactWriterAdapter | 専用テストなし（UseCase で port をモック）; 旧 IT-REPO-LessWriter-* は不存在 | ❌ 未カバー |
| AjvLessonArtifactSchemaAdapter | 専用テストなし（UseCase で port をモック; §9の「実スキーマ使用・モック無し」は誤り）; 旧 IT-REPO-LessSchema-* は不存在 | ❌ 未カバー |
| ValidatorIdRegistryBridgeAdapter | テスト参照ゼロ; 旧 IT-REPO-ValidatorBridge-* は不存在 | ❌ 未カバー |
| HarnessConfigQueryAdapter | skill-quality 配下に専用テストなし（UseCase で port をモック; config-query の別実装テストは harness-api Unit 側に存在するが本 Unit の adapter を検証しない） | ❌ 未カバー |
| FileSystemSkillFileReaderAdapter | 専用テストなし（UseCase/バリデータで port をモック）; 旧 IT-REPO-SkillReader-* は不存在 | ❌ 未カバー |

Infrastructure Adapter カバレッジ: **5/11 (45.5%)**（2026-07-07 訂正: 旧「11/11 100% 29件」は捏造 IT-REPO ID による水増し）

---

## 6. Presentation Handlerカバレッジ

> **訂正（2026-07-07）**: cited した `IT-API-*Handler-*` 連番 ID は**いずれもテストツリーに存在しない**（`grep -rn "IT-API-TddHandler\|IT-API-SkillHandler..." __tests__/` → 0 件）。実際に検証されている handler は `ApplyCascadeUpdateHandler` のみ（`apply-cascade-update-usecase.test.ts` 内で `new ApplyCascadeUpdateHandler(usecase)` を間接的に実行）。残る 5 handler には専用テストが存在しない。

| Handler名 | 実テスト | カバー状態 |
|----------|------------|----------|
| ApplyCascadeUpdateHandler | `apply-cascade-update-usecase.test.ts` 内で間接実行（専用 handler テストは無し） | 🟡 部分（間接） |
| ExecuteTddCycleHandler | 専用テストなし; 旧 IT-API-TddHandler-* は不存在 | ❌ 未カバー |
| CheckCoverageHandler | 専用テストなし; 旧 IT-API-CovHandler-* は不存在 | ❌ 未カバー |
| RunPlanCheckerLoopHandler | 専用テストなし; 旧 IT-API-PlanHandler-* は不存在 | ❌ 未カバー |
| CollectLessonsHandler | 専用テストなし; 旧 IT-API-LessHandler-* は不存在 | ❌ 未カバー |
| ValidateSkillStructureHandler | 専用テストなし; 旧 IT-API-SkillHandler-* は不存在 | ❌ 未カバー |

Presentation Handler カバレッジ: **1/6 (16.7%, 間接1件のみ)**（2026-07-07 訂正: 旧「6/6 100% 18件」は捏造 IT-API handler ID による水増し）

---

## 7. テストケース総数サマリー

> **注記（2026-07-07）**: 本表の件数は `unit_test_design.md` / `it_test_design.md` の**設計上の予定件数**であり、実装済みテスト件数ではない。特に IT（Adapter 29 / Handler 18）は §5・§6 の訂正のとおり大半が未実装。実装済み件数の権威は §2〜§6 の訂正後の表を参照。

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

### 未カバー / 部分（2026-07-07 訂正で追加）

| 項目 | 状態 | 理由 |
|-----|------|------|
| H12-01-AC-4（TDD品質契約が SKILL.md に定義） | ❌ 未カバー | cited した UT-TC-004〜007 は CommitReadiness VO ロジック検証で、SKILL.md 内容を検証していない（誤アーティファクト） |
| H12-06-AC-2（v0既存 SKILL.md 適合検証） | ❌ 未カバー | IT-UC-ValSkill-001 はモックポート＋固定文字列でバリデータロジックのみ検証。実 `skills/*/SKILL.md` 適合は未検証。IT-API-SkillE2E-001 は不存在 |
| H12-06-AC-3（v1新規 SKILL.md 適合検証） | ❌ 未カバー | 同上（IT-UC-ValSkill-002 はロジックのみ、IT-API-SkillE2E-002 は不存在） |
| H12-02-AC-4（coverage_report への AC網羅率出力） | 🟡 部分 | requirementCoverage 算出は実テスト済みだが handler 出力は未検証。IT-API-CovHandler-* は不存在 |
| H12-04-AC-4（Agent-Lesson 回帰テスト） | 🟡 部分 | UseCase レベルのモックテストは実在だが cited E2E（IT-API-LessE2E-*）は不存在 |
| INV-7（LessonArtifact lessonId 一意性） | ❌ 未カバー | cited IT-REPO-LessWriter-001 は不存在。一意性は未検証 |
| Infrastructure Adapter 6 件 | ❌ 未カバー | FileSystemLessonSourceReader / FileSystemLessonArtifactWriter / AjvLessonArtifactSchema / ValidatorIdRegistryBridge / HarnessConfigQuery / FileSystemSkillFileReader に専用テストなし |
| Presentation Handler 5 件 | ❌ 未カバー | ExecuteTddCycle / CheckCoverage / RunPlanCheckerLoop / CollectLessons / ValidateSkillStructure handler に専用テストなし（ApplyCascadeUpdate のみ間接検証） |

> いずれも**実ソースは実装済み**であり、テスト/引用のギャップであってフィーチャの欠落ではない。実テスト追加・@ac 束縛・L3-005 ゲーティングは後続フェーズ（WI-235+）で行う。

### 対象外項目

| 項目 | 理由 |
|-----|------|
| H12-04 AC-2（AGENTS.md への集約・反映） | ci-governance Unit（H13-03）の責務として明示的に分離済み（skill_quality_unit.md §3.4） |

---

## 9. 次のアクション

### 判定: ⚠️ 71.0% — 後続フェーズで実テスト・ゲーティングを整備（WI-235+）

> **訂正（2026-07-07）**: 旧「判定: ✅ 98.4% — テストロジック設計に進む」は取り消し。旧文の「全 Infrastructure Adapter（11/11）のテストケースが定義済み」「AjvLessonArtifactSchemaAdapter は実スキーマを使用しモック無し」等はいずれも事実に反する（§5 参照）。訂正後の実カバレッジ 71.0% は防御プリセットの閾値を満たさない。

後続フェーズ（WI-235+）の作業:

- §6 の未カバー 5 handler・§5 の未カバー 6 adapter に対する実テストを追加する
- H12-06-AC-2/AC-3 に対し、実在する `skills/*/SKILL.md` コーパスが必須構造に適合することを assert する**実コーパス適合テスト**を追加する
- H12-01-AC-4 に対し、SKILL.md 内容（TDD 品質契約の定義）を検証するテストを追加する
- 各 AC を実テストへ `@ac` 束縛し、L3-005（coverage-report 整合ゲート）で回帰を防止する
- ドメイン層 UT はモック禁止原則（testing-rules.md）を遵守した純粋単体テストとして維持すること

---

## 訂正履歴

### 2026-07-07 — 反ロンダリング訂正（WI-234, quick）

本レポートは、リポジトリ全体で発見された**カバレッジレポート・ロンダリング**の skill-quality インスタンスである。本訂正は虚偽の主張を真の主張へ置換した（Phase 1: ダウングレードのみ。実テスト追加は後続フェーズ）。

除去した水増し:

1. **§6 Presentation Handler「6/6 100%（18件）」→ 実 1/6（間接1件）**。cited した `IT-API-TddHandler-*` / `IT-API-CovHandler-*` / `IT-API-PlanHandler-*` / `IT-API-LessHandler-*` / `IT-API-CascHandler-*` / `IT-API-SkillHandler-*` はテストツリーに 1 件も存在しない（捏造 ID）。実在するのは `ApplyCascadeUpdateHandler` の間接検証のみ。
2. **§5 Infrastructure Adapter「11/11 100%（29件）」→ 実 5/11**。専用テストファイルが実在するのは 5 adapter のみ。残る 6 adapter の `IT-REPO-*` ID は不存在。
3. **H12-06-AC-2/AC-3「SKILL.md が必須構造に適合」→ 未カバー**。`IT-UC-ValSkill-001/002` は実在するが、**モックした `SkillFileReaderPort` にコード内ハードコードの Markdown を注入**してバリデータロジックを検証するもので、実 `skills/*/SKILL.md` コーパスの適合は検証していない（実成果物検証と誤計上）。cited した `IT-API-SkillE2E-001/002` は不存在。
4. **H12-01-AC-4「TDD 品質契約が SKILL.md に定義」→ 未カバー**。cited した `UT-TC-004〜007` は `CommitReadiness` 値オブジェクトのロジックを検証するもので、SKILL.md の内容ではない（誤アーティファクト）。
5. **H12-06-AC-1「requiredSections 6件」→ 7件**（`skill-structure.ts` の `REQUIRED_SECTIONS` は 7 件）。VO ロジックは実テスト済みのため件数のみ修正（本行はカバー維持）。
6. 波及: H12-02-AC-4 / H12-04-AC-4 を 部分 へ、INV-7 を 未カバー へ下方修正（いずれも sole citation が捏造 ID）。

総合カバレッジ: **旧 98.4%（61/62）→ 訂正後 71.0%（44/62）**。

**実ソースは実装済みであり、これはテスト/引用のギャップであってフィーチャの欠落ではない。** 実テスト追加・`@ac` 束縛・L3-005 ゲーティングは後続フェーズ（WI-235+）で行う。

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
