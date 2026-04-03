# テストカバレッジレポート: harness-api

> **Unit ID**: harness-api
> **作成日**: 2026-03-19
> **Wave**: 2（コア品質機構）
> **参照ドキュメント**: domain_model.md, logical_design.md, unit_test_design.md, it_test_design.md
> **計画参照**: `docs/inception/harness-api/test_coverage_plan.md`

---

## 1. サマリー

### 全体評価

| 観点 | 評価 | 備考 |
|-----|------|------|
| 受け入れ基準カバレッジ | **PASS** | 全17AC対応テストが存在 |
| ドメインロジックカバレッジ | **PASS** | 全7不変条件（INV-1〜INV-7）+ D5ルールをカバー |
| UseCaseカバレッジ | **PASS** | 4UseCase × 正常系/異常系/境界値を網羅 |
| APIカバレッジ | **PARTIAL** | 8コマンドハンドラーのうち、phasegate:status D5ルール周辺に軽微な補強余地あり |
| Engineering Perspective（ケント・ベック） | **PASS** | TDD粒度適切。一部改善提案あり |
| Engineering Perspective（マーティン・ファウラー） | **WARN** | 境界値横断セクションに複合テスト候補あり |
| Engineering Perspective（アンクル・ボブ） | **PASS** | SRP・DIP準拠確認 |
| Engineering Perspective（エリック・エヴァンス） | **PASS** | ユビキタス言語準拠。軽微な混在リスクあり |

### テストケース総数

| 種別 | ケース数 |
|-----|---------|
| ユニットテスト（unit_test_design.md） | 93 |
| ITテスト（it_test_design.md） | 推定102 |
| **合計** | **推定195** |

---

## 2. 受け入れ基準カバレッジ詳細

harness_api_unit.md §3 の機能要件（H09-01〜H09-04）に定義された受け入れ基準（AC）と、対応するテストケースのマッピングを示す。

### H09-01: phasegate:check-ready / phasegate:check-phase

| AC内容 | 対応テストケース | カバー状況 |
|-------|---------------|---------|
| check-readyが全storyのPhase Gate通過状態をJSON形式で返却 | UT-CDS-001, IT-UC-DispatchCmd-001, IT-API-CheckReady-001 | ✓ COVERED |
| check-phase \<unit\>が指定Unitの現在フェーズを返却 | UT-CDS-003, IT-UC-DispatchCmd-002, IT-API-CheckPhase-001 | ✓ COVERED |
| Phase Gate未通過storyが存在する場合、未通過story一覧を含むレスポンス | UT-CDS-002, IT-UC-DispatchCmd-008, IT-API-CheckReady-002 | ✓ COVERED |
| 存在しないUnit名が指定された場合、適切なエラーメッセージを表示 | UT-CDS-012, IT-UC-DispatchCmd-008, IT-API-CheckPhase-004 | ✓ COVERED |

### H09-02: phasegate:ci-check

| AC内容 | 対応テストケース | カバー状況 |
|-------|---------------|---------|
| 全L3バリデータ（security/performance/coverage/nyquist）を順次実行 | UT-CDS-004, IT-UC-DispatchCmd-003, IT-REPO-ValidatorExec-001 | ✓ COVERED |
| 全バリデータ通過時Pass判定、1つでも失敗時Fail判定 | UT-CCR-004/005/006, IT-UC-DispatchCmd-003 | ✓ COVERED |
| 実行結果にバリデータ別のPass/Fail詳細を含める | UT-CCR-001/002, IT-REPO-ValidatorExec-001/002, IT-API-CiCheck-001/002 | ✓ COVERED |
| 失敗時のレスポンスにHarnessError一覧を含める | UT-HAR-006, IT-API-CiCheck-002 | ✓ COVERED |

### H09-03: phasegate:detect-drift

| AC内容 | 対応テストケース | カバー状況 |
|-------|---------------|---------|
| 設計→コード方向とコード→設計方向の双方向乖離を検出 | UT-CDS-005/006, IT-REPO-ValidatorExec-003/004 | ✓ COVERED |
| 乖離レポートにUnit名・乖離方向・対象要素の詳細を含める | UT-DRS-001/002, IT-REPO-ValidatorExec-004 | ✓ COVERED |
| 乖離が0件の場合「乖離なし」のサマリーを返却 | UT-CDS-005, IT-UC-DispatchCmd-004 | ✓ COVERED |
| --jsonフラグでJSON形式のレポート出力（drifts[]フィールド含む） | IT-API-DetectDrift-001/002 | ✓ COVERED（--jsonフラグの振る舞い差分の検証は軽微な補強余地あり） |

### H09-04: phasegate:status（成果物駆動状態導出）

| AC内容 | 対応テストケース | カバー状況 |
|-------|---------------|---------|
| ファイルシステム上の成果物存在からハーネス検査状態を導出 | UT-SDS-001〜004, IT-UC-DeriveStatus-001/002, IT-REPO-ArtifactScan-001〜005 | ✓ COVERED |
| L1-L4各レイヤーの健全性（有効/無効/最終実行結果）を含む | UT-HSS-001, IT-API-Status-001, IT-API-StatusInteg-001/002 | ✓ COVERED |
| Phase Gate通過状態のサマリーを含む | IT-UC-DeriveStatus-001, IT-API-StatusInteg-001 | ✓ COVERED（phaseGateSummaryフィールドの具体的な値検証が1ケースのみ）|
| プリセット名と有効設定のサマリーを含む | IT-UC-DeriveStatus-001/002/006, IT-REPO-ConfigQuery-001/002 | ✓ COVERED |
| JSON形式での出力が可能 | IT-API-Status-001/002 | ✓ COVERED |

**AC合計**: 17AC全てにカバーするテストケースが存在する（**AC カバレッジ: 100%**）

---

## 3. ドメインロジックカバレッジ詳細

domain_model.md §5 に定義された不変条件・ビジネスルール。

### 3.1 CommandRegistryの不変条件

| 不変条件ID | 内容 | カバーテスト | 正常系 | 異常系 |
|-----------|------|------------|--------|--------|
| INV-1 | 同一CommandName重複禁止 | UT-CRG-003, IT-UC-InitRegistry-003 | ✓ | ✓ |
| INV-2 | harness:プレフィックス必須非空文字列 | UT-CRG-004/005, UT-CCD-003/004/005, UT-BND-001/002, IT-UC-InitRegistry-004 | ✓ | ✓ |

### 3.2 HarnessApiResponseの不変条件

| 不変条件ID | 内容 | カバーテスト | 正常系 | 異常系 |
|-----------|------|------------|--------|--------|
| INV-3 | status='pass'のとき errors=[] | UT-HAR-001〜004, UT-HAR-005, UT-BND-003 | ✓ | ✓ |
| INV-4 | status='fail'/'error'のとき errors>=1件 | UT-HAR-002/003, UT-HAR-006/007 | ✓ | ✓ |

### 3.3 CiCheckResultの不変条件

| 不変条件ID | 内容 | カバーテスト | 正常系 | 異常系 |
|-----------|------|------------|--------|--------|
| INV-5 | validatorResults>=1件 | UT-CCR-001/002, UT-CCR-003, UT-BND-004 | ✓ | ✓ |
| INV-6 | allPassed=validatorResults全件passed論理積 | UT-CCR-004/005/006 | ✓ | ✓ |

### 3.4 DriftReportSummaryの不変条件

| 不変条件ID | 内容 | カバーテスト | 正常系 | 異常系 |
|-----------|------|------------|--------|--------|
| INV-7 | totalCount === drifts.length | UT-DRS-001/002, UT-DRS-003/004, UT-BND-005/006 | ✓ | ✓ |

### 3.5 ExitCode決定ルール / D5ルール

| ルール | 内容 | カバーテスト | 正常系 | 異常系 |
|-------|------|------------|--------|--------|
| ExitCode基本 | pass=0, fail=1, error=2 | UT-CDS-001〜012, IT-UC-DecideExit-001〜003 | ✓ | ✓ |
| D5ルール | phasegate:statusはFail=1を返さない | UT-CDS-009/010, IT-UC-DecideExit-004/005/006, IT-API-Status-003 | ✓ | ✓ |

### 3.6 StatusDerivationServiceのルール

| ルール | 内容 | カバーテスト | カバー状況 |
|-------|------|------------|---------|
| 成果物存在→pass | 全成果物が存在すればlastResult=pass | UT-SDS-001/004, IT-UC-DeriveStatus-001/002 | ✓ COVERED |
| 成果物不在→unknown | 成果物が存在しなければlastResult=unknown | UT-SDS-002/003, IT-UC-DeriveStatus-003 | ✓ COVERED |
| enabled反映 | HarnessConfigV2のenabled値を反映 | UT-SDS-005/006, IT-UC-DeriveStatus-001/006 | ✓ COVERED |

### 3.7 カバレッジ未達・境界ケース

| ルール | 内容 | 補強推奨テスト |
|-------|------|-------------|
| HarnessStatusSummary 4レイヤー制約 | layers=[L1/L2/L3の3件]（L4欠落）は失敗 | UT-HSS-003はある。L1/L2/L4（L3欠落）ケースも補強推奨 |
| CheckReadyResult allPassed整合 | allPassedはstories.every(s => s.passed)と同期 | UT-CRR-004はあるが、全passed=true & allPassed=falseのケースが未設計 |
| CommandName正規表現 | `^harness:[a-z][a-z0-9-]*$` | UT-BND-002で大文字プレフィックスをカバー。数字始まり（`harness:1cmd`）ケースが未設計 |

**不変条件カバレッジ**: 7不変条件 + D5ルール の全てに対し正常系・異常系テストが存在（**不変条件カバレッジ: 100%**）

---

## 4. UseCaseカバレッジ詳細

logical_design.md §3 の4UseCaseについて、正常系/異常系/境界値のカバー状況を確認する。

### 4.1 InitializeCommandRegistryUseCase

| シナリオ分類 | ケース数 | 代表ケース | カバー状況 |
|------------|--------|----------|---------|
| 正常系（全8コマンド登録） | 2 | IT-UC-InitRegistry-001/002 | ✓ COVERED |
| 異常系（重複コマンド名） | 1 | IT-UC-InitRegistry-003 | ✓ COVERED |
| 異常系（不正プレフィックス） | 1 | IT-UC-InitRegistry-004 | ✓ COVERED |
| 境界値（空入力） | 1 | IT-UC-InitRegistry-005 | ✓ COVERED |

**評価**: 完全網羅。登録結果の昇順ソート確認（IT-UC-InitRegistry-002）も含めて実装者にとって明確な仕様が示されている。

### 4.2 DispatchCommandUseCase

| シナリオ分類 | ケース数 | 代表ケース | カバー状況 |
|------------|--------|----------|---------|
| 正常系（6コマンド別通過） | 6 | IT-UC-DispatchCmd-001〜006 | ✓ COVERED |
| 異常系（未登録コマンド） | 1 | IT-UC-DispatchCmd-007 | ✓ COVERED |
| 異常系（存在しないUnit名） | 1 | IT-UC-DispatchCmd-008 | ✓ COVERED |
| 異常系（ポート例外） | 1 | IT-UC-DispatchCmd-009 | ✓ COVERED |
| 異常系（乖離検出あり） | 1 | IT-UC-DispatchCmd-010 | ✓ COVERED |

**補強余地**: phasegate:complete-checkのDispatchCommandUseCase正常系（ValidatorExecutionPort + BiomeLintPort両方委譲）が独立したIT-UCケースとして存在しない（Cross-Layer統合フローIT-API-DispatchInteg-004でカバーされているが、UseCaseレベルでの単独検証が推奨される）。

### 4.3 DecideExitCodeUseCase

| シナリオ分類 | ケース数 | 代表ケース | カバー状況 |
|------------|--------|----------|---------|
| 正常系（基本3値） | 3 | IT-UC-DecideExit-001/002/003 | ✓ COVERED |
| 特殊ルール（D5: status特殊処理） | 3 | IT-UC-DecideExit-004/005/006 | ✓ COVERED |

**評価**: DecideExitCodeUseCaseはモックなしの純粋関数テストとして6ケースが設計されており、TDD的に優れた設計。

### 4.4 DeriveHarnessStatusUseCase

| シナリオ分類 | ケース数 | 代表ケース | カバー状況 |
|------------|--------|----------|---------|
| 正常系（standardプリセット） | 1 | IT-UC-DeriveStatus-001 | ✓ COVERED |
| 正常系（strictプリセット） | 1 | IT-UC-DeriveStatus-002 | ✓ COVERED |
| 異常系（成果物欠損） | 1 | IT-UC-DeriveStatus-003 | ✓ COVERED |
| 異常系（ArtifactScannerPort例外） | 1 | IT-UC-DeriveStatus-004 | ✓ COVERED |
| 異常系（ConfigQueryPort例外） | 1 | IT-UC-DeriveStatus-005 | ✓ COVERED |
| 境界値（minimalプリセット） | 1 | IT-UC-DeriveStatus-006 | ✓ COVERED |

**評価**: 3プリセット（minimal/standard/strict）全てをカバー。ポート例外を各ポートごとに独立してテストしている点はSRP原則に沿った良設計。

---

## 5. APIカバレッジ詳細

### 5.1 CLIコマンドハンドラー（8本）の網羅状況

| ハンドラー | 正常系 | 異常系 | バリデーション | エラーハンドリング | D5ルール検証 | 総評 |
|-----------|--------|--------|-------------|---------------|------------|------|
| CheckReadyHandler | IT-API-CheckReady-001 | IT-API-CheckReady-002 | IT-API-CheckReady-003 | IT-API-CheckReady-004 | — | ✓ 完全 |
| CheckPhaseHandler | IT-API-CheckPhase-001 | IT-API-CheckPhase-004 | IT-API-CheckPhase-002/003 | IT-API-CheckPhase-005 | — | ✓ 完全 |
| CiCheckHandler | IT-API-CiCheck-001 | IT-API-CiCheck-002 | IT-API-CiCheck-003（--pretty） | IT-API-CiCheck-004 | — | ✓ 完全 |
| DetectDriftHandler | IT-API-DetectDrift-001 | IT-API-DetectDrift-002 | IT-API-DetectDrift-003 | IT-API-DetectDrift-004 | — | △ --jsonフラグ差分が軽微 |
| StatusHandler | IT-API-Status-001 | IT-API-Status-002 | — | IT-API-Status-004 | IT-API-Status-003 | ✓ 完全（D5検証含む） |
| LintHandler | IT-API-Lint-001 | IT-API-Lint-002 | IT-API-Lint-003 | IT-API-Lint-004 | — | ✓ 完全 |
| CompleteCheckHandler | IT-API-CompleteCheck-001 | IT-API-CompleteCheck-002 | IT-API-CompleteCheck-003 | IT-API-CompleteCheck-004 | — | ✓ 完全 |
| ImpactAnalysisHandler | IT-API-ImpactAnalysis-001 | IT-API-ImpactAnalysis-004 | IT-API-ImpactAnalysis-002/003 | IT-API-ImpactAnalysis-005 | — | ✓ 完全 |

**ハンドラーカバレッジ**: 8本中8本に正常系・異常系テストが存在（**ハンドラーカバレッジ: 100%**）

### 5.2 CommandRegistry カバレッジ

| 操作 | 正常系 | 異常系 | 境界値 |
|-----|--------|--------|--------|
| registerCommand | UT-CRG-001/002 | UT-CRG-003/004/005 | — |
| findByName | UT-CRG-006 | UT-CRG-007, UT-BND-009 | — |
| listAll | UT-CRG-008 | — | — |
| 8コマンド一括登録 | IT-UC-InitRegistry-001 | IT-UC-InitRegistry-003/004 | IT-UC-InitRegistry-005 |

**CommandRegistryカバレッジ**: INV-1/INV-2の全違反パターン + 全操作（**完全カバー**）

### 5.3 DispatchService カバレッジ

| 操作 | ケース | カバー状況 |
|-----|-------|---------|
| 8コマンドディスパッチ（正常系） | UT-CDS-001〜010, IT-UC-DispatchCmd-001〜006 | ✓（8コマンド中6コマンドをIT-UCレベルでカバー。complete-checkはCross-Layer統合でカバー） |
| 未登録コマンドエラー | UT-CDS-012, IT-UC-DispatchCmd-007 | ✓ COVERED |
| ポート例外処理 | UT-CDS-011, IT-UC-DispatchCmd-009 | ✓ COVERED |
| ExitCode決定 | UT-CDS-009/010, IT-UC-DecideExit-001〜006 | ✓ COVERED |

**注記**: phasegate:statusコマンドのUT-CDS-009/010はCommandDispatchService単体レベルでのExitCode決定テストとしており、D5ルール適用のテストをDecideExitCodeUseCaseのIT-UC-DecideExit-004に委譲する設計となっている。この責務分離は適切。

---

## 6. Engineering Perspective 評価

### ケント・ベック視点: TDD適切性

#### 評価概要

| 評価軸 | 判定 | 根拠 |
|--------|------|------|
| Red-Green-Refactorサイクルに沿った粒度 | PASS | VO生成テスト（UT-CCD-001〜008）は各テストが1つの振る舞いのみを検証し、細粒度に設計されている |
| YAGNIに反する過剰テスト | PASS | 実装されていない機能（例: バッチ処理、非同期パターン）のテストは見当たらない |
| 小さなステップで実装可能なケース設計 | PASS | VOの生成テスト → 不変条件テスト → ドメインサービステスト → UseCaseテスト → Presentation層テストという実装順序が自然に導ける構造 |

#### 詳細評価

**良好な点:**

- `CliCommandDefinition` の生成テスト（UT-CCD-001〜005）は各バリデーションルールを1テスト1ルールで分離している。`^harness:[a-z][a-z0-9-]*$` 正規表現の3つの違反パターン（空文字、プレフィックスなし、プレフィックスのみ）を独立したケースに分けており、TDDのRed段階でどのルールが未実装かが明確になる。

- `StatusDerivationService` テスト（UT-SDS-001〜008）は純粋関数テストとして設計されており、ポートモックなしで直接実行可能。Green段階のコスト最小化に貢献する。

- `DecideExitCodeUseCase` のIT-UC-DecideExit-001〜006はモックなしの純粋関数テストとして設計されており、実装開始直後にすぐRed/Green確認できる。

**改善推奨点:**

- `CommandDispatchService` のUT-CDS-001〜012（12ケース）は各コマンドの正常系・異常系をディスパッチサービス全体でテストしており、テスト数が多い。TDD実践時にどのコマンドから実装すべきかの優先度が設計から読み取りにくい。実装順序ガイド（例: `unit_test_logic.md` への記載）を推奨する。

- `HarnessStatusSummary` の UT-HSS-002〜004（3件の異常系）は生成エラーのテストだが、エラー種別（`HarnessApiDomainError`）の型名が明記されていない。TDD実装時の「何をスローすべきか」が曖昧なため、unit_test_logic.md での補完を推奨する。

### マーティン・ファウラー視点: テスト設計スメル

#### 評価概要

| スメル種別 | 検出有無 | 詳細 |
|-----------|---------|------|
| Test Method Too Long（テストが長すぎる） | 軽微な懸念 | IT-API-DispatchInteg-001〜005の統合テストはモック設定が複数ポートにまたがる可能性 |
| テスト間の依存関係 | 懸念なし | 各テストは独立したモック/実体を使用 |
| Excessive Setup（過剰セットアップ） | 軽微な懸念 | IT-API-StatusInteg-001はArtifactScannerPort + ConfigQueryPort + StatusDerivationServiceの実体を使用し、セットアップが複雑になりやすい |

#### 詳細評価

**良好な点:**

- `unit_test_design.md §3 CommandDispatchService` のテストは全ポートを `vi.fn()` でモック化する方針を明記しており、テストのセットアップが予測可能。テスト実装者がセットアップを過剰に複雑化するリスクを設計レベルで制御できている。

- `it_test_design.md §5 StatusDerivation統合フロー` は `DeriveHarnessStatusUseCase + StatusDerivationService（実体） + ポートモック` という正確な組み合わせを定義しており、統合レベルとして適切な粒度。Full End-to-End（CLIプロセス起動まで含む）にエスカレートしていない。

- `it_test_design.md §5 Shared Kernel Contract検証` の3ケースは Contract Test として適切に分離されており、HarnessApiResponse DTOの契約検証を他の機能テストと混在させていない。

**改善推奨点:**

- `UT-BND-001〜012`（境界値・異常系横断セクション、12ケース）は複数のVO・サービスを対象とした横断的テストケースの集合体となっている。一部のケース（例: UT-BND-009 CommandRegistry.findByName 0件登録）は `CommandRegistry` テストセクション（UT-CRG-XXX）に移動すべきで、ケースが2箇所に分散している状態がテストメンテナンス時の認知負荷を高める。また UT-BND-010（complete-check両ポート委譲）は CommandDispatchService セクション（UT-CDS-XXX）への統合を推奨する。

- `IT-API-DispatchInteg-004`（complete-checkコマンド全フロー）は「ValidatorExecutionPortとBiomeLintPortの両方が呼ばれること」を1テストで検証しており、2つの振る舞い（ValidatorExecutionPort呼び出し確認 + BiomeLintPort呼び出し確認）を1テストに詰め込んでいる。ファウラーの「1テスト1振る舞い」原則からは分割を推奨する。

- `IT-REPO-ValidatorExec-006`（runAllValidatorsのL1-L4全集約）はケース内に期待値として「length>=4（L1×8 + L2×3 + L3×4 + L4×3）」という複合計算が含まれており、テストが読みにくくなるリスクがある。各レイヤー別の集約確認テストに分割することを推奨する。

### アンクル・ボブ視点: SOLID・責務分離

#### 評価概要

| SOLID原則 | 評価 | 詳細 |
|-----------|------|------|
| SRP（ユニットテスト/ITテストの責務分離） | PASS | 適切に分離されている |
| DIP（CommandRegistry/DispatchServiceのポート注入） | PASS | ポートをモック化する設計が明記されている |
| 単一振る舞いテスト | PARTIAL | 横断UT-BNDセクションに複合テストあり |

#### 詳細評価

**良好な点:**

- `unit_test_design.md` と `it_test_design.md` の責務境界が明確に設計されている。Domain VO・ドメインサービスは `unit_test_design.md` でカバーし、UseCase・Infrastructure Adapter・Presentation Handler は `it_test_design.md` に分離されている。論理設計の4層（Domain/Application/Infrastructure/Presentation）に対応したテストファイル構成（logical_design.md §1.3 テスト配置）がSRP原則を構造的に保証している。

- `CommandDispatchService` テスト（UT-CDS-XXX）では全6ポートをモック化することが明記されており、DIP原則（依存性逆転）に沿ったテスト設計になっている。テスト時にポート実装への直接依存が生じない設計はDIPの模範例といえる。

- `StatusDerivationService` は純粋計算処理として設計されており、ポート依存がないためモックなしでテスト可能（UT-SDS-001〜008）。これはCommandDispatchServiceからStatusDerivationServiceを分離した `domain_model.md §9 D2` の設計判断がテスト容易性に直接反映された良い例。

- `it_test_design.md §7 モック設定` の表で、各コンポーネントをモック化するか実体を使用するかが明示されている（CommandRegistry=実体、StatusDerivationService=実体、外部ポート=vi.fn()）。これによりテスト実装者が誤ってポート実体を使うリスクを設計レベルで制御できている。

**改善推奨点:**

- `UT-BND-010`（`commandName='phasegate:complete-check'`のポート両方委譲確認）はドメインサービス（CommandDispatchService）の振る舞いテストと、Application UseCaseの統合確認が混在している可能性がある。UT-XXX（Unit Test）で行うべき確認とIT-XXX（Integration Test）で行うべき確認の境界が不明確なため、unit_test_logic.md で実装時の責務を明確にすることを推奨する。

- `IT-API-SharedKernel-003`（TypeScript型検証）はランタイムテストではなくコンパイル時検証であり、通常のVitestテストケースとして記述することが困難な可能性がある。型テスト専用ツール（tsd, expect-type等）の利用か、コンパイル成功確認のみとするか、方針を明示することを推奨する。

### エリック・エヴァンス視点: ドメイン表現

#### 評価概要

| 評価軸 | 評価 | 詳細 |
|--------|------|------|
| ユビキタス言語の使用 | PASS | コアドメイン概念がテストケース名に反映されている |
| ドメイン概念の正確な表現 | PASS | CommandDispatch・StatusDerivationのドメイン概念が適切に表現されている |
| ドメイン不変条件/アプリケーション層の分離 | PARTIAL | ITテストの一部でUT相当のドメイン確認が混在 |

#### 詳細評価

**良好な点:**

- `unit_test_design.md` のテストケースIDとテーブルの「期待結果」欄は日本語で記述されており（testing-rules.md 準拠）、ドメイン語彙（「全storyのPhase Gate通過状態」「成果物駆動の状態導出」「双方向乖離」等）がテストケース設計から実装に自然に流れる構造になっている。

- `StatusDerivationService` テスト（UT-SDS-001〜008）は「成果物駆動の状態導出」（H09-04のコアドメイン概念）を独立したサービスとして検証しており、CommandDispatch（UT-CDS-XXX）との概念的分離が明確。エヴァンスの「ドメイン概念を実装構造に直接マッピングすること」の実践例となっている。

- `IT-UC-DecideExit-004` のシナリオ説明「phasegate:statusでstatus='fail'でもexitCode=0を返すこと（D5ルール）」はドメインルールへの明示的な参照（D5ルール）を含んでおり、テストがドキュメントとして機能するユビキタス言語の実践例。

- `IT-API-DispatchInteg-005` の「statusコマンド全フロー。ArtifactScannerPort・ConfigQueryPort・StatusDerivationServiceが連携すること」というシナリオ名は、ドメイン内の概念（ArtifactScanner、StatusDerivation）が統合文脈でも自然に使われており一貫性が高い。

**改善推奨点:**

- `IT-UC-DeriveStatus-001` のモック設定内 `phaseGateSummary{totalStories:5, passedStories:5}` は `DeriveHarnessStatusUseCase` の責務（ステータス導出）とPhase Gate情報の取得責務の境界が曖昧に見える。`DeriveHarnessStatusUseCase` が `ArtifactScannerPort` に加えて Phase Gate 情報も取得するならば、その Port 依存がit_test_design.md §2のポート一覧に明示されていない。ドメイン語彙の観点から「StatusDerivationとPhaseGateSummaryは同じUseCaseが担うべきか」の設計判断を明示することを推奨する。

- `IT-REPO-ValidatorExec-001〜006` の Infrastructure Adapter テストは外部システム（validator-system）とのインターフェース検証であり、ドメイン概念（ValidatorCheckItem）への変換確認が含まれる。しかしシナリオ名が「runL3Validators実行」「runDriftDetection実行」という技術的な記述にとどまっており、「L3バリデータ統合実行結果のValidatorCheckItem変換確認」など、ドメイン語彙を含む記述への改善を推奨する。

- `UT-ASR-003`（ArtifactScanResult）の期待結果カラムに「各ArtifactPresenceのpresent=trueが正しく格納される」と「正常に生成される」の2つの期待値が記載されており、1ケースで2つの確認を行っている。ArtifactPresenceドメインオブジェクトの構造確認テストとして独立させることを推奨する。

### Engineering Perspective 総合判定

| 視点 | 総合評価 | 主要所見 |
|-----|---------|---------|
| ケント・ベック（TDD適切性） | **PASS** | TDD粒度・YAGNI準拠・小ステップ設計は良好。CommandDispatchService実装順序ガイドの補完を推奨 |
| マーティン・ファウラー（テスト設計スメル） | **WARN** | UT-BNDセクションのケース分散、IT-API-DispatchInteg-004の複合テスト、IT-REPO-ValidatorExec-006の複合期待値に改善余地あり |
| アンクル・ボブ（SOLID・責務分離） | **PASS** | SRP・DIP準拠は適切。IT-API-SharedKernel-003の型テスト実装方針の明示を推奨 |
| エリック・エヴァンス（ドメイン表現） | **PASS** | ユビキタス言語準拠・ドメイン概念分離は良好。DeriveHarnessStatusUseCaseとPhaseGateSummaryの責務境界明示を推奨 |

**Engineering Perspective 総合判定: PASS（WARN付き）**

4視点全体を通じて、テスト設計文書はTDD実践可能な品質水準に達している。WARNが1点（ファウラー視点）あるが、これはBLOCKレベルの問題ではなく、unit_test_logic.md/it_test_logic.md の詳細設計段階での補正が可能。

---

## 7. 未カバー項目一覧（優先度付き）

### Priority: High（実装前に補強推奨）

| 項目ID | 分類 | 内容 | 推奨追加先 |
|-------|------|------|----------|
| GAP-001 | ドメインルール | CommandName正規表現: `harness:1cmd`（数字始まりコマンド名）の拒否確認 | unit_test_design.md §2 CliCommandDefinition 境界値テスト |
| GAP-002 | ドメインルール | CheckReadyResult: stories全件passed=true & allPassed=falseのケース（現行はUT-CRR-004のみ逆方向） | unit_test_design.md §2 CheckReadyResult 不変条件テスト |
| GAP-003 | UseCase | DispatchCommandUseCase の phasegate:complete-check 正常系（IT-UCレベルの単独検証） | it_test_design.md §2 DispatchCommandUseCase |

### Priority: Medium（unit_test_logic.md設計時に補強推奨）

| 項目ID | 分類 | 内容 | 推奨追加先 |
|-------|------|------|----------|
| GAP-004 | テスト構造 | UT-BNDセクションのケース（UT-BND-009, UT-BND-010）を適切なセクションに移動 | unit_test_design.md §3/§4 リファクタリング |
| GAP-005 | テスト構造 | IT-API-DispatchInteg-004のcomplete-check両ポート確認を2ケースに分割 | it_test_design.md §5 CommandDispatch統合フロー |
| GAP-006 | ドメイン表現 | IT-REPO-ValidatorExec-001〜006のシナリオ名にドメイン語彙を追加 | it_test_design.md §3 シナリオ名改訂 |
| GAP-007 | 設計明示 | DeriveHarnessStatusUseCaseとPhaseGateSummaryの責務境界の明示 | logical_design.md §3 DeriveHarnessStatusUseCase |

### Priority: Low（実装後のリファクタリングで対応可）

| 項目ID | 分類 | 内容 | 推奨追加先 |
|-------|------|------|----------|
| GAP-008 | テスト構造 | IT-REPO-ValidatorExec-006のrunAllValidators集約テストをレイヤー別に分割 | it_test_design.md §3 ValidatorSystemExecutionAdapter |
| GAP-009 | 実装方針 | IT-API-SharedKernel-003のTypeScript型テスト実装方針の明示（tsd/expect-type利用またはコンパイル確認のみ） | it_test_design.md §5 SharedKernel Contract検証 |
| GAP-010 | テスト構造 | UT-ASR-003の2重期待値を独立ケースに分割 | unit_test_design.md §2 ArtifactScanResult |

---

## 8. 推奨追加ケース

以下の補強ケースは優先度Highの未カバー項目に対応する具体的なテストケース仕様である。

### 追加ケース A: CommandName数字始まり拒否

```
ケースID: UT-CCD-009（補強）
対象: CliCommandDefinition
入力: commandName='harness:1cmd'（数字始まり）
期待結果: エラーをスロー / 生成失敗
理由: domain_model.md §5 / logical_design.md §2.2.1 のバリデーションルール
      `^harness:[a-z][a-z0-9-]*$` のa-z先頭制約のカバー
```

### 追加ケース B: CheckReadyResult allPassed逆方向整合テスト

```
ケースID: UT-CRR-005（補強）
対象: CheckReadyResult 不変条件テスト
不変条件: allPassedはstories全件のpassedの論理積と整合
入力: stories=[passed=true, passed=true], allPassed=false
期待結果: エラーをスロー / 生成失敗
理由: 現行UT-CRR-004（stories=[true,false], allPassed=true）は一方向のみ。
      双方向の不変条件違反カバーが必要
```

### 追加ケース C: DispatchCommandUseCase complete-check正常系

```
ケースID: IT-UC-DispatchCmd-011（補強）
シナリオ: complete-checkコマンドがValidatorExecutionPortとBiomeLintPortの両方を呼び出すこと
入力: commandName='phasegate:complete-check', args={}, flags={}
モック設定: ValidatorExecutionPortモック: runAllValidators→全通過ValidatorCheckItem[]; BiomeLintPortモック: runLint→{passed:true}
期待結果: response.status='pass', exitCode=0, ValidatorExecutionPort.runAllValidatorsが1回呼び出される, BiomeLintPort.runLintが1回呼び出される
理由: complete-checkはharness-api固有の「L1+L2-L4全バリデータ統合実行」コマンドであり、UseCaseレベルでの両ポート委譲確認が設計の核心部分
```

---

## 9. 次のアクション

### 即時対応（unit_test_logic.md / it_test_logic.md 設計前）

1. **GAP-001/GAP-002/GAP-003** を `unit_test_design.md` / `it_test_design.md` に追記する（Priority: High）
2. **GAP-004** のUT-BNDセクション整理を `unit_test_design.md` でリファクタリングする

### unit_test_logic.md 設計時

3. `CommandDispatchService` の実装優先順序ガイドを追記する（ケント・ベック視点フィードバック）
4. `HarnessStatusSummary` 異常系の `HarnessApiDomainError` 型名を明示する
5. **GAP-007** の `DeriveHarnessStatusUseCase` と `PhaseGateSummary` 責務境界を `logical_design.md` §3 に補記する

### it_test_logic.md 設計時

6. **GAP-005** の IT-API-DispatchInteg-004 分割を反映する
7. **GAP-006** の IT-REPO-ValidatorExec-001〜006 シナリオ名改訂を反映する
8. **GAP-009** の IT-API-SharedKernel-003 実装方針（型テストツール選定）を明示する

### story-implementor（TDD実装）時

9. UT-BND-010 の実装配置（CommandDispatchServiceのunit test内 vs Cross-Layer IT test内）を story の `tdd_implementation_plan.md` で確認する
10. IT-REPO-ValidatorExec-006 の期待値（length>=4）の具体的な計算根拠をフィクスチャーで明示する
