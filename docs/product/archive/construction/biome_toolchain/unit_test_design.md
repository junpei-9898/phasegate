# ユニットテスト設計: biome-toolchain

> **Unit**: biome-toolchain
> **作成日**: 2026-03-11
> **対応ストーリー**: US-036, US-037, US-038, US-039
> **テストフレームワーク**: Vitest 3.0.0
> **テストサイズ**: Small

---

## 1. テスト対象 x テストレイヤー対応表

| # | テスト対象 | レイヤー | テストファイル | モック戦略 |
|---|-----------|---------|--------------|----------|
| U-01 | BiomeRule集約 | Domain | `tests/domain/biome-rule.test.ts` | モック不使用（実体のみ） |
| U-02 | LintExecution集約 | Domain | `tests/domain/lint-execution.test.ts` | モック不使用（実体のみ） |
| U-03 | AntiPatternDetector集約 | Domain | `tests/domain/anti-pattern-detector.test.ts` | モック不使用（実体のみ） |
| U-04 | HookConfiguration集約 | Domain | `tests/domain/hook-configuration.test.ts` | モック不使用（実体のみ） |
| U-05 | CIGateConfiguration集約 | Domain | `tests/domain/ci-gate-configuration.test.ts` | モック不使用（実体のみ） |
| U-06 | 値オブジェクト群 | Domain | `tests/domain/value-objects/*.test.ts` | モック不使用（実体のみ） |
| U-07 | LintOrchestrationService | Domain Service | `tests/domain/lint-orchestration-service.test.ts` | Portモック（BiomeExecutor, FileReader） |
| U-08 | ImportGraphAnalyzer | Domain Service | `tests/domain/import-graph-analyzer.test.ts` | Portモック（FileReader） |
| U-09 | ParityTestService | Domain Service | `tests/domain/parity-test-service.test.ts` | Portモック（BiomeExecutor, FileReader） |
| U-10 | ExecuteLintUseCase | UseCase | `tests/usecase/execute-lint-usecase.test.ts` | Portモック |
| U-11 | ExecutePostToolUseHookUseCase | UseCase | `tests/usecase/execute-post-tool-use-hook-usecase.test.ts` | Portモック |
| U-12 | EvaluateCIGateUseCase | UseCase | `tests/usecase/evaluate-ci-gate-usecase.test.ts` | Portモック |
| U-13 | DetectAntiPatternsUseCase | UseCase | `tests/usecase/detect-anti-patterns-usecase.test.ts` | Portモック |
| U-14 | VerifyParityUseCase | UseCase | `tests/usecase/verify-parity-usecase.test.ts` | Portモック |
| U-15 | CLI Controller | Controller | `tests/controller/cli-controller.test.ts` | UseCaseモック |
| U-16 | Hook Controller | Controller | `tests/controller/hook-controller.test.ts` | UseCaseモック |
| U-17 | CI Controller | Controller | `tests/controller/ci-controller.test.ts` | UseCaseモック |
| U-18 | GritQLルール | Biome Plugin | `tests/plugins/gritql-rules.test.ts` | Biome CLI実行（フィクスチャ検証） |
| U-19 | Rust Plugin | Biome Plugin | `tests/plugins/rust-plugin-rules.test.ts` | Biome CLI実行（フィクスチャ検証）+ `cargo test` |

---

## 2. 不変条件カバレッジマッピング

| 不変条件 | テスト対象 | テストID |
|---------|-----------|---------|
| INV-1 | BiomeRule集約（check） / ExecuteLintUseCase（実行保証） | U-01, U-10 |
| INV-2 | BiomeRule集約 / RuleName値オブジェクト | U-01, U-06 |
| INV-3 | BiomeRule集約 / RuleType値オブジェクト | U-01, U-06 |
| INV-4 | LintExecution集約 | U-02 |
| INV-5 | LintExecution集約 / ExecutionStatus値オブジェクト | U-02, U-06 |
| INV-6 | LintExecution集約 | U-02 |
| INV-7 | AntiPatternDetector集約 | U-03 |
| INV-8 | AntiPatternDetector集約 | U-03 |
| INV-9 | HookConfiguration集約 | U-04 |
| INV-10 | HookConfiguration集約 / ExecutePostToolUseHookUseCase | U-04, U-11 |
| INV-11 | CIGateConfiguration集約 | U-05 |
| INV-12 | CIGateConfiguration集約 | U-05 |

---

## 3. Domain層テスト

### 3.1 U-01: BiomeRule集約

**テストファイル**: `packages/biome-toolchain/tests/domain/biome-rule.test.ts`

**モック戦略**: モック不使用。BiomeRule集約の実体を直接生成してテストする。

**不変条件カバレッジ**: INV-1, INV-2, INV-3

#### テストケースツリー

```typescript
target('BiomeRule.create', () => {
  describe('ルール名からBiomeRuleを生成する', () => {
    it('有効なルール名を渡した場合、対応するBiomeRuleが生成されること', () => {});

    context('GritQL系ルール名の場合', () => {
      it('ruleTypeがGritQLに自動設定されること', () => {});
    });

    context('RustPlugin系ルール名の場合', () => {
      it('ruleTypeがRustPluginに自動設定されること', () => {});
    });

    context('不正なルール名の場合', () => {
      it('InvalidRuleNameErrorが送出されること', () => {}); // INV-2
    });

    it('生成時のデフォルト状態が有効であること', () => {});
    it('デフォルトのapplicableFilePatternsが設定されること', () => {});
  });
});

target('enable', () => {
  describe('ルールを有効化する', () => {
    context('無効状態のルールの場合', () => {
      it('有効状態に変更されること', () => {});
    });
  });
});

target('disable', () => {
  describe('ルールを無効化する', () => {
    context('有効状態のルールの場合', () => {
      it('無効状態に変更されること', () => {});
    });
  });
});

target('check', () => {
  describe('対象ファイルに対してルール検査を実行する', () => {
    context('ルールが有効で対象ファイルが適用可能な場合', () => {
      it('検査結果（RuleViolation[]）を返すこと', () => {}); // INV-1
    });

    context('ルールが有効だが対象ファイルが適用外の場合', () => {
      it('スキップ結果（空配列）を返すこと', () => {}); // INV-1
    });

    context('ルールが無効の場合', () => {
      it('検査をスキップしてスキップ結果を返すこと', () => {});
    });
  });
});

target('isApplicable', () => {
  describe('ファイルパスに対してルールが適用可能か判定する', () => {
    context('対象パターンにマッチするファイルの場合', () => {
      it('trueを返すこと', () => {});
    });

    context('対象パターンにマッチしないファイルの場合', () => {
      it('falseを返すこと', () => {});
    });

    context('テストファイルの場合', () => {
      it('falseを返すこと', () => {});
    });
  });
});
```

#### 代表的AAAパターン（INV-1: check対象ファイルが適用可能な場合）

```typescript
it('検査結果（RuleViolation[]）を返すこと', () => {
  // Arrange
  const rule = BiomeRule.create('require-unit-comment');
  const sourceFile = FilePath.of('src/domain/model/example.ts');

  // Act
  const actual = rule.check(sourceFile);

  // Assert
  expect(Array.isArray(actual)).toBe(true);
});
```

> **備考**: INV-1「有効ルールで対象ファイルの検査がスキップされない」保証はUseCase層（U-10: ExecuteLintUseCase）でも検証する。logical_design.md §3.1で `check()` はBiomeExecutorポート経由のBiome CLIに委譲する設計であるため、Domain層ではメタデータ判定ロジック、UseCase層では実行保証をそれぞれ担う。

#### 代表的AAAパターン（INV-2: 不正なルール名でのファクトリ生成）

> **AAAパターン補足**: 例外送出テストでは `Act & Assert` を `expect(() => ...).toThrow()` として結合するパターンを採用する。testing-rules.mdのAAAパターン規約に対し、例外テストはAct単独で記述すると例外が捕捉されないため、この結合パターンを許容する。

```typescript
it('InvalidRuleNameErrorが送出されること', () => {
  // Arrange
  const invalidRuleName = 'unknown-rule';

  // Act & Assert
  expect(() => BiomeRule.create(invalidRuleName)).toThrow(InvalidRuleNameError);
});
```

#### 代表的AAAパターン（INV-3: ruleTypeの自動決定）

```typescript
it('ruleTypeがGritQLに自動設定されること', () => {
  // Arrange
  const ruleName = 'require-unit-comment';

  // Act
  const actual = BiomeRule.create(ruleName);

  // Assert
  expect(actual.ruleType).toBe(RuleType.GritQL);
});
```

---

### 3.2 U-02: LintExecution集約

**テストファイル**: `packages/biome-toolchain/tests/domain/lint-execution.test.ts`

**モック戦略**: モック不使用。LintExecution集約の実体と、関連する値オブジェクト（FilePath, RuleName, RuleViolation等）の実体を使用する。

**不変条件カバレッジ**: INV-4, INV-5, INV-6

#### テストケースツリー

```typescript
target('start', () => {
  describe('リント実行を開始する', () => {
    it('Pending状態からRunning状態に遷移すること', () => {}); // INV-5

    context('対象ファイルが空の場合', () => {
      it('エラーが送出されること', () => {});
    });

    context('有効ルールが空の場合', () => {
      it('エラーが送出されること', () => {});
    });

    context('Running状態でstartを呼んだ場合', () => {
      it('InvalidStateTransitionErrorが送出されること', () => {}); // INV-5
    });
  });
});

target('recordViolation', () => {
  describe('違反を記録する', () => {
    context('Running状態の場合', () => {
      it('違反がviolationsリストに追加されること', () => {});
      it('対応するファイルxルールペアがcheckedPairsに記録されること', () => {});
    });

    context('Pending状態の場合', () => {
      it('ViolationRecordErrorが送出されること', () => {}); // INV-6
    });

    context('Completed状態の場合', () => {
      it('ViolationRecordErrorが送出されること', () => {}); // INV-6
    });

    context('Failed状態の場合', () => {
      it('ViolationRecordErrorが送出されること', () => {}); // INV-6
    });
  });
});

target('markChecked', () => {
  describe('ファイルxルールペアを検査済みとして記録する', () => {
    context('Running状態の場合', () => {
      it('checkedPairsに記録されること', () => {});
    });

    context('Running以外の状態の場合', () => {
      it('エラーが送出されること', () => {});
    });
  });
});

target('complete', () => {
  describe('リント実行を完了する', () => {
    context('全ファイルx全ルールが検査済みの場合', () => {
      it('Completed状態に遷移すること', () => {}); // INV-5
      it('LintReportが生成されること', () => {});
      it('LintReportのtotalFilesが正しいこと', () => {});
      it('LintReportのerrorCountが正しいこと', () => {});
      it('LintReportのwarningCountが正しいこと', () => {});
      it('LintReportのdurationMsが正の値であること', () => {});
    });

    context('違反がない場合', () => {
      it('LintReportのpassedがtrueであること', () => {});
    });

    context('errorの違反がある場合', () => {
      it('LintReportのpassedがfalseであること', () => {});
    });

    context('未検査のファイルxルールペアがある場合', () => {
      it('IncompleteExecutionErrorが送出されること', () => {}); // INV-4
    });

    context('Pending状態でcompleteを呼んだ場合', () => {
      it('InvalidStateTransitionErrorが送出されること', () => {}); // INV-5
    });
  });
});

target('fail', () => {
  describe('リント実行を異常終了させる', () => {
    context('Running状態の場合', () => {
      it('Failed状態に遷移すること', () => {}); // INV-5
    });

    context('Pending状態の場合', () => {
      it('InvalidStateTransitionErrorが送出されること', () => {}); // INV-5
    });
  });
});

target('getReport', () => {
  describe('LintReportを取得する', () => {
    context('Completed状態の場合', () => {
      it('完了済みのLintExecutionからLintReportが取得できること', () => {});
    });

    context('Pending状態の場合', () => {
      it('InvalidStateTransitionErrorが送出されること', () => {});
    });

    context('Running状態の場合', () => {
      it('InvalidStateTransitionErrorが送出されること', () => {});
    });

    context('Failed状態の場合', () => {
      it('InvalidStateTransitionErrorが送出されること', () => {});
    });
  });
});
```

#### 代表的AAAパターン（INV-4: 全ファイルx全ルール未検査でcomplete）

```typescript
it('IncompleteExecutionErrorが送出されること', () => {
  // Arrange
  const execution = LintExecution.create();
  const targetFiles = [FilePath.of('src/domain/model/example.ts')];
  const enabledRules = [RuleName.of('require-unit-comment'), RuleName.of('no-layer-violation')];
  execution.start(targetFiles, enabledRules);
  // 1つ目のルールのみ検査済みにする（2つ目は未検査）
  execution.markChecked(targetFiles[0], enabledRules[0]);

  // Act & Assert
  expect(() => execution.complete()).toThrow(IncompleteExecutionError);
});
```

#### 代表的AAAパターン（INV-5: 正常な状態遷移）

```typescript
it('Completed状態に遷移すること', () => {
  // Arrange
  const execution = LintExecution.create();
  const targetFiles = [FilePath.of('src/domain/model/example.ts')];
  const enabledRules = [RuleName.of('require-unit-comment')];
  execution.start(targetFiles, enabledRules);
  execution.markChecked(targetFiles[0], enabledRules[0]);

  // Act
  const actual = execution.complete();

  // Assert
  expect(execution.status).toBe(ExecutionStatus.Completed);
  expect(actual.totalFiles).toBe(1);
  expect(actual.passed).toBe(true);
});
```

---

### 3.3 U-03: AntiPatternDetector集約

**テストファイル**: `packages/biome-toolchain/tests/domain/anti-pattern-detector.test.ts`

**モック戦略**: モック不使用。

**不変条件カバレッジ**: INV-7, INV-8

#### テストケースツリー

```typescript
target('AntiPatternDetectorFactory.create', () => {
  describe('検出器種別に応じたDetectorを生成する', () => {
    it('AnyTypeAbuse用DetectorがBiomeRule実装タイプで生成されること', () => {});
    it('CommentFlood用DetectorがBiomeRule実装タイプで生成されること', () => {});
    it('CodeDuplication用DetectorがExternalScript実装タイプで生成されること', () => {});
    it('GhostFile用DetectorがExternalScript実装タイプで生成されること', () => {});
    it('デフォルト閾値が設定されること', () => {});
  });
});

target('AntiPatternDetectorFactory.createAll', () => {
  describe('全種別のDetectorを一括生成する', () => {
    it('4種のDetectorが生成されること', () => {});
  });
});

target('setThreshold', () => {
  describe('検出閾値を設定する', () => {
    context('正の数値を設定した場合', () => {
      it('閾値が更新されること', () => {});
    });

    context('0を設定した場合', () => {
      it('InvalidThresholdErrorが送出されること', () => {}); // INV-8
    });

    context('負の数値を設定した場合', () => {
      it('InvalidThresholdErrorが送出されること', () => {}); // INV-8
    });
  });
});

target('detect', () => {
  describe('アンチパターンを検出する', () => {
    context('各検出器が独立して動作する場合', () => {
      it('他の検出器の状態に影響されず検出結果を返すこと', () => {}); // INV-7
    });
  });
});
```

#### 代表的AAAパターン（INV-8: 不正な閾値）

```typescript
it('InvalidThresholdErrorが送出されること', () => {
  // Arrange
  const detector = AntiPatternDetectorFactory.create(
    AntiPatternType.AnyTypeAbuse,
    5
  );

  // Act & Assert
  expect(() => detector.setThreshold(AntiPatternType.AnyTypeAbuse, 0)).toThrow(
    InvalidThresholdError
  );
});
```

---

### 3.4 U-04: HookConfiguration集約

**テストファイル**: `packages/biome-toolchain/tests/domain/hook-configuration.test.ts`

**モック戦略**: モック不使用。

**不変条件カバレッジ**: INV-9, INV-10

#### テストケースツリー

```typescript
target('shouldExecute', () => {
  describe('ファイルに対してフックを実行すべきか判定する', () => {
    context('フックが有効でファイルが対象パターンにマッチする場合', () => {
      it('trueを返すこと', () => {});
    });

    context('フックが無効の場合', () => {
      it('falseを返すこと', () => {});
    });

    context('ファイルが対象パターンにマッチしない場合', () => {
      it('falseを返すこと', () => {});
    });

    context('.tsファイルの場合', () => {
      it('trueを返すこと', () => {});
    });

    context('.tsxファイルの場合', () => {
      it('trueを返すこと', () => {});
    });

    context('.jsonファイルの場合', () => {
      it('falseを返すこと', () => {});
    });

    context('同一ファイルに対して複数回呼び出した場合', () => {
      it('毎回同じ結果を返すこと', () => {}); // INV-9
    });
  });
});

target('getCommand', () => {
  describe('実行コマンドを返す', () => {
    context('フックが有効の場合', () => {
      it('biome check --changed --apply コマンドを返すこと', () => {});
    });

    context('フックが無効の場合', () => {
      it('エラーが送出されること', () => {});
    });
  });
});

target('isWithinTimeout', () => {
  describe('実行時間がタイムアウト内か判定する', () => {
    context('経過時間がタイムアウト以下の場合', () => {
      it('trueを返すこと', () => {});
    });

    context('経過時間がタイムアウトちょうどの場合', () => {
      it('trueを返すこと', () => {}); // INV-10 境界値
    });

    context('経過時間がタイムアウトを超過した場合', () => {
      it('falseを返すこと', () => {}); // INV-10
    });

    context('デフォルトタイムアウト500msの場合', () => {
      it('500ms以下でtrueを返すこと', () => {});
      it('501msでfalseを返すこと', () => {});
    });
  });
});
```

#### 代表的AAAパターン（INV-10: タイムアウト境界値）

```typescript
it('trueを返すこと', () => {
  // Arrange
  const hookConfig = HookConfiguration.create({
    enabled: true,
    targetPatterns: ['*.ts', '*.tsx'],
    timeoutMs: 500,
  });

  // Act
  const actual = hookConfig.isWithinTimeout(500);

  // Assert
  expect(actual).toBe(true);
});
```

---

### 3.5 U-05: CIGateConfiguration集約

**テストファイル**: `packages/biome-toolchain/tests/domain/ci-gate-configuration.test.ts`

**モック戦略**: モック不使用。LintReport等の値オブジェクトは実体を生成する。

**不変条件カバレッジ**: INV-11, INV-12

#### テストケースツリー

```typescript
target('evaluate', () => {
  describe('LintReportに基づくCIゲート判定を行う', () => {
    context('エラー0件・警告0件の場合', () => {
      it('trueを返すこと', () => {}); // INV-11
    });

    context('エラーが1件以上ある場合', () => {
      it('falseを返すこと', () => {}); // INV-11
    });

    context('警告のみで許容警告数以下の場合', () => {
      it('trueを返すこと', () => {});
    });

    context('警告が許容警告数を超過した場合', () => {
      it('falseを返すこと', () => {});
    });

    context('maxErrorsが0でerrorCountが0の場合', () => {
      it('trueを返すこと', () => {});
    });
  });
});

target('checkEslintRemoval', () => {
  describe('ESLint関連ファイル・依存の残存をチェックする', () => {
    context('.eslintrc.jsが存在する場合', () => {
      it('違反を返すこと', () => {}); // INV-12
    });

    context('.eslintrc.jsonが存在する場合', () => {
      it('違反を返すこと', () => {}); // INV-12
    });

    context('.eslintignoreが存在する場合', () => {
      it('違反を返すこと', () => {}); // INV-12
    });

    context('eslint.config.jsが存在する場合', () => {
      it('違反を返すこと', () => {}); // INV-12
    });

    context('package.jsonにeslintパッケージが含まれる場合', () => {
      it('違反を返すこと', () => {}); // INV-12
    });

    context('package.jsonにeslint-plugin-*が含まれる場合', () => {
      it('違反を返すこと', () => {}); // INV-12
    });

    context('import文にeslintを含むファイルがある場合', () => {
      it('違反を返すこと', () => {}); // INV-12
    });

    context('ESLint関連が完全に除去されている場合', () => {
      it('空の違反リストを返すこと', () => {});
    });
  });
});

target('formatError', () => {
  describe('違反をHarnessCompatibleError形式に変換する', () => {
    it('codeがLINT_プレフィックス付きのルール名であること', () => {});
    it('severityが元の違反と同一であること', () => {});
    it('suggestionが設定されること', () => {});
    it('adr_refが設定されること', () => {});

    context('suggestionがない違反の場合', () => {
      it('デフォルトの修正提案が設定されること', () => {});
    });
  });
});
```

#### 代表的AAAパターン（INV-11: ゲート判定）

```typescript
it('falseを返すこと', () => {
  // Arrange
  const ciGate = CIGateConfiguration.create({
    gateId: 'aidlc-gate',
    passCondition: PassCondition.of({ maxErrors: 0, maxWarnings: 10, requireEslintRemoval: true }),
  });
  const lintReport = LintReport.of({
    totalFiles: 5,
    totalViolations: 2,
    errorCount: 2,
    warningCount: 0,
    violations: [
      RuleViolation.of({
        filePath: FilePath.of('src/domain/model/example.ts'),
        line: 1,
        column: 1,
        ruleName: RuleName.of('require-unit-comment'),
        message: '@unitコメントが必要です',
        severity: ViolationSeverity.Error,
      }),
      RuleViolation.of({
        filePath: FilePath.of('src/domain/model/example.ts'),
        line: 2,
        column: 1,
        ruleName: RuleName.of('require-layer-comment'),
        message: '@layerコメントが必要です',
        severity: ViolationSeverity.Error,
      }),
    ],
    durationMs: 150,
  });

  // Act
  const actual = ciGate.evaluate(lintReport);

  // Assert
  expect(actual).toBe(false);
});
```

#### 代表的AAAパターン（INV-12: ESLint残存チェック）

```typescript
it('違反を返すこと', () => {
  // Arrange
  const ciGate = CIGateConfiguration.create({
    gateId: 'aidlc-gate',
    passCondition: PassCondition.of({ maxErrors: 0, maxWarnings: 10, requireEslintRemoval: true }),
  });
  const projectFiles = [
    FilePath.of('.eslintrc.js'),
    FilePath.of('src/index.ts'),
    FilePath.of('package.json'),
  ];

  // Act
  const actual = ciGate.checkEslintRemoval(projectFiles);

  // Assert
  expect(actual).toHaveLength(1);
  expect(actual[0].ruleName.value).toBe('eslint-remnant');
});
```

---

### 3.6 U-06: 値オブジェクト群

各値オブジェクトは個別のテストファイルに分割する。

#### 3.6.1 RuleName

**テストファイル**: `packages/biome-toolchain/tests/domain/value-objects/rule-name.test.ts`

```typescript
target('RuleName.of', () => {
  describe('文字列からRuleNameを生成する', () => {
    it('有効なルール名からRuleNameが生成されること', () => {});

    context('不正な文字列の場合', () => {
      it('InvalidRuleNameErrorが送出されること', () => {});
    });
  });
});

target('isGritQL', () => {
  describe('GritQL系ルールか判定する', () => {
    context('require-unit-commentの場合', () => {
      it('trueを返すこと', () => {});
    });

    context('no-layer-violationの場合', () => {
      it('falseを返すこと', () => {});
    });
  });
});

target('isRustPlugin', () => {
  describe('RustPlugin系ルールか判定する', () => {
    context('no-layer-violationの場合', () => {
      it('trueを返すこと', () => {});
    });

    context('require-unit-commentの場合', () => {
      it('falseを返すこと', () => {});
    });
  });
});

target('equals', () => {
  describe('等価性を判定する', () => {
    it('同一のルール名同士はtrueを返すこと', () => {});
    it('異なるルール名同士はfalseを返すこと', () => {});
  });
});
```

#### 3.6.2 RuleType

**テストファイル**: `packages/biome-toolchain/tests/domain/value-objects/rule-type.test.ts`

```typescript
target('RuleType.fromRuleName', () => {
  describe('RuleNameからRuleTypeを導出する', () => {
    context('require-unit-commentの場合', () => {
      it('GritQLを返すこと', () => {});
    });

    context('require-layer-commentの場合', () => {
      it('GritQLを返すこと', () => {});
    });

    context('no-layer-violationの場合', () => {
      it('RustPluginを返すこと', () => {});
    });

    context('enforce-folder-structureの場合', () => {
      it('RustPluginを返すこと', () => {});
    });
  });
});
```

#### 3.6.3 FilePath

**テストファイル**: `packages/biome-toolchain/tests/domain/value-objects/file-path.test.ts`

```typescript
target('FilePath.of', () => {
  describe('パス文字列からFilePathを生成する', () => {
    it('正規化されたパスが保持されること', () => {});

    context('空文字列の場合', () => {
      it('エラーが送出されること', () => {});
    });
  });
});

target('matches', () => {
  describe('globパターンとのマッチングを判定する', () => {
    context('パターンにマッチする場合', () => {
      it('trueを返すこと', () => {});
    });

    context('パターンにマッチしない場合', () => {
      it('falseを返すこと', () => {});
    });
  });
});

target('getLayer', () => {
  describe('パスからレイヤー名を推定する', () => {
    context('/domain/を含むパスの場合', () => {
      it('LayerName.domainを返すこと', () => {});
    });

    context('/usecase/を含むパスの場合', () => {
      it('LayerName.usecaseを返すこと', () => {});
    });

    context('レイヤーが判定できないパスの場合', () => {
      it('undefinedを返すこと', () => {});
    });
  });
});

target('equals', () => {
  describe('等価性を判定する', () => {
    it('同一パス同士はtrueを返すこと', () => {});
    it('異なるパス同士はfalseを返すこと', () => {});
  });
});
```

#### 3.6.4 LayerName

**テストファイル**: `packages/biome-toolchain/tests/domain/value-objects/layer-name.test.ts`

```typescript
target('canDependOn', () => {
  describe('レイヤー間の依存許可を判定する', () => {
    context('domainの場合', () => {
      it('いずれのレイヤーにも依存できないこと', () => {});
    });

    context('portの場合', () => {
      it('domainにのみ依存できること', () => {});
    });

    context('usecaseの場合', () => {
      it('domainとportに依存できること', () => {});
      it('controllerに依存できないこと', () => {});
      it('infrastructureに依存できないこと', () => {});
    });

    context('controllerの場合', () => {
      it('usecase, domain, portに依存できること', () => {});
      it('infrastructureに依存できないこと', () => {});
    });

    context('infrastructureの場合', () => {
      it('domainとportに依存できること', () => {});
      it('usecaseに依存できないこと', () => {});
    });
  });
});
```

#### 代表的AAAパターン

```typescript
it('domainとportに依存できること', () => {
  // Arrange
  const usecase = LayerName.of('usecase');

  // Act & Assert
  expect(usecase.canDependOn(LayerName.of('domain'))).toBe(true);
  expect(usecase.canDependOn(LayerName.of('port'))).toBe(true);
});
```

#### 3.6.5 ImportEdge

**テストファイル**: `packages/biome-toolchain/tests/domain/value-objects/import-edge.test.ts`

```typescript
target('isViolation', () => {
  describe('レイヤー依存違反を判定する', () => {
    context('usecaseからdomainへのインポートの場合', () => {
      it('違反ではないこと', () => {});
    });

    context('domainからusecaseへのインポートの場合', () => {
      it('違反であること', () => {});
    });

    context('infrastructureからcontrollerへのインポートの場合', () => {
      it('違反であること', () => {});
    });
  });
});
```

#### 3.6.6 ExecutionStatus

**テストファイル**: `packages/biome-toolchain/tests/domain/value-objects/execution-status.test.ts`

```typescript
target('canTransitionTo', () => {
  describe('有効な状態遷移先を判定する', () => {
    context('Pendingの場合', () => {
      it('Runningへの遷移が許可されること', () => {});
      it('Completedへの遷移が許可されないこと', () => {});
      it('Failedへの遷移が許可されないこと', () => {});
    });

    context('Runningの場合', () => {
      it('Completedへの遷移が許可されること', () => {});
      it('Failedへの遷移が許可されること', () => {});
      it('Pendingへの遷移が許可されないこと', () => {});
    });

    context('Completedの場合', () => {
      it('いずれの状態にも遷移できないこと', () => {});
    });

    context('Failedの場合', () => {
      it('いずれの状態にも遷移できないこと', () => {});
    });
  });
});
```

#### 3.6.7 RuleViolation

**テストファイル**: `packages/biome-toolchain/tests/domain/value-objects/rule-violation.test.ts`

```typescript
target('equals', () => {
  describe('等価性を判定する', () => {
    it('同一のfilePath+line+column+ruleNameの組み合わせはtrueを返すこと', () => {});
    it('異なる行番号の場合はfalseを返すこと', () => {});
    it('異なるルール名の場合はfalseを返すこと', () => {});
  });
});

target('RuleViolation.of', () => {
  describe('値オブジェクトを生成する', () => {
    it('全属性が正しく設定されること', () => {});
    it('生成後に変更不可であること', () => {});
  });
});
```

#### 3.6.8 LintReport

**テストファイル**: `packages/biome-toolchain/tests/domain/value-objects/lint-report.test.ts`

```typescript
target('passed', () => {
  describe('合格判定を返す', () => {
    context('errorCountが0の場合', () => {
      it('trueを返すこと', () => {});
    });

    context('errorCountが1以上の場合', () => {
      it('falseを返すこと', () => {});
    });
  });
});

target('merge', () => {
  describe('2つのLintReportを統合する', () => {
    it('totalFilesが合算されること', () => {});
    it('violationsが結合されること', () => {});
    it('errorCountが再計算されること', () => {});
  });
});
```

#### 3.6.9 その他の値オブジェクト

以下は基本的な生成・等価性・バリデーションを検証する。

| テストファイル | テスト対象 | 主要テストケース |
|-------------|-----------|---------------|
| `violation-severity.test.ts` | ViolationSeverity | error/warningの2値生成、不正値でエラー |
| `anti-pattern-type.test.ts` | AntiPatternType | 4値生成、getImplementationType |
| `implementation-type.test.ts` | ImplementationType | 2値生成 |
| `unit-name.test.ts` | UnitName | 空文字列不可、kebab-case検証 |
| `hook-command.test.ts` | HookCommand | toCommandString、イミュータブル |
| `pass-condition.test.ts` | PassCondition | isSatisfiedBy、生成バリデーション |
| `ci-step.test.ts` | CIStep | 生成、イミュータブル |
| `harness-compatible-error.test.ts` | HarnessCompatibleError | code/severity/suggestion/adr_ref/fix_example設定 |

---

### 3.7 U-07: LintOrchestrationService

**テストファイル**: `packages/biome-toolchain/tests/domain/lint-orchestration-service.test.ts`

**モック戦略**: BiomeExecutor, FileReaderはPortインターフェースであるため `vi.fn()` でモックする。Domain層のオブジェクト（BiomeRule, LintExecution等）は実体を使用する。

#### テストケースツリー

```typescript
target('executeLint', () => {
  describe('対象ファイル群に対してフルリントを実行する', () => {
    context('全ルールが有効で違反がない場合', () => {
      it('passedがtrueのLintReportを返すこと', () => {});
    });

    context('違反が検出された場合', () => {
      it('違反を含むLintReportを返すこと', () => {});
    });

    context('BiomeExecutorがエラーを返した場合', () => {
      it('LintExecutionがFailed状態になること', () => {});
    });

    context('AntiPatternDetector結果も含める場合', () => {
      it('BiomeRule結果とAntiPattern結果が統合されたLintReportを返すこと', () => {});
    });
  });
});

target('executePostToolUseHook', () => {
  describe('PostToolUse Hook用の軽量リントを実行する', () => {
    context('対象ファイルがフックの対象パターンに合致する場合', () => {
      it('LintReportを返すこと', () => {});
    });

    context('対象ファイルがフックの対象パターンに合致しない場合', () => {
      it('null LintReportを返すこと', () => {});
    });

    it('AntiPatternDetectorが実行されないこと', () => {});
  });
});
```

#### 代表的AAAパターン

```typescript
it('passedがtrueのLintReportを返すこと', () => {
  // Arrange
  const mockBiomeExecutor = {
    check: vi.fn().mockResolvedValue({
      violations: [],
      checkedFiles: [FilePath.of('src/domain/model/example.ts')],
      checkedRules: [RuleName.of('require-unit-comment')],
    }),
    checkChanged: vi.fn(),
    format: vi.fn(),
    checkAndApply: vi.fn(),
  };
  const mockFileReader = {
    read: vi.fn(),
    exists: vi.fn(),
    glob: vi.fn(),
    readPackageJson: vi.fn(),
  };
  const service = new LintOrchestrationService(mockBiomeExecutor, mockFileReader);
  const targetFiles = [FilePath.of('src/domain/model/example.ts')];
  const config = { enabledRules: [BiomeRule.create('require-unit-comment')] };

  // Act
  const actual = await service.executeLint(targetFiles, config);

  // Assert
  expect(actual.passed).toBe(true);
  expect(actual.totalFiles).toBe(1);
});
```

---

### 3.8 U-08: ImportGraphAnalyzer

**テストファイル**: `packages/biome-toolchain/tests/domain/import-graph-analyzer.test.ts`

**モック戦略**: FileReaderはPortであるため `vi.fn()` でモックする。ImportEdge等の値オブジェクトは実体を使用する。

#### テストケースツリー

```typescript
target('buildGraph', () => {
  describe('ソースファイル群からインポートグラフを構築する', () => {
    it('import文からImportEdgeが生成されること', () => {});
    it('相対パスのimportが解決されること', () => {});

    context('@/domain/... 形式のエイリアスimportの場合', () => {
      it('エイリアスパスが正しいレイヤーに解決されること', () => {});
    });

    context('@layerコメントがある場合', () => {
      it('コメントからレイヤーが判定されること', () => {});
    });

    context('@layerコメントがない場合', () => {
      it('ディレクトリパスからレイヤーが推定されること', () => {});
    });
  });
});

target('detectLayerViolations', () => {
  describe('レイヤー境界違反を検出する', () => {
    context('domainからusecaseへのimportがある場合', () => {
      it('違反として検出されること', () => {});
    });

    context('usecaseからdomainへのimportがある場合', () => {
      it('違反として検出されないこと', () => {});
    });

    context('違反が複数ある場合', () => {
      it('全ての違反がRuleViolationとして返されること', () => {});
    });
  });
});

target('detectCircularDependencies', () => {
  describe('循環依存を検出する', () => {
    context('A→B→Cの非循環グラフの場合', () => {
      it('空のリストを返すこと', () => {});
    });

    context('A→B→A の循環がある場合', () => {
      it('循環依存の違反が検出されること', () => {});
    });

    context('A→B→C→A の間接循環がある場合', () => {
      it('循環依存の違反が検出されること', () => {});
    });
  });
});
```

#### 代表的AAAパターン

```typescript
it('違反として検出されること', () => {
  // Arrange
  const mockFileReader = {
    read: vi.fn()
      .mockResolvedValueOnce('// @layer domain\nimport { something } from "../usecase/some-usecase";')
      .mockResolvedValueOnce('// @layer usecase\nexport const something = {};'),
    exists: vi.fn().mockResolvedValue(true),
    glob: vi.fn(),
    readPackageJson: vi.fn(),
  };
  const analyzer = new ImportGraphAnalyzer(mockFileReader);
  const sourceFiles = [
    FilePath.of('src/domain/model/example.ts'),
    FilePath.of('src/usecase/some-usecase.ts'),
  ];

  // Act
  const graph = await analyzer.buildGraph(sourceFiles);
  const actual = analyzer.detectLayerViolations(graph, LayerName.dependencyMap);

  // Assert
  expect(actual).toHaveLength(1);
  expect(actual[0].ruleName.value).toBe('no-layer-violation');
});
```

---

### 3.9 U-09: ParityTestService

**テストファイル**: `packages/biome-toolchain/tests/domain/parity-test-service.test.ts`

**モック戦略**: BiomeExecutor, FileReaderはPortであるため `vi.fn()` でモックする。

#### テストケースツリー

```typescript
target('verify', () => {
  describe('v0 ESLintルールとBiomeルールの等価性を検証する', () => {
    context('全テストケースで結果が一致する場合', () => {
      it('パリティ検証が成功すること', () => {});
    });

    context('検出位置が異なるテストケースがある場合', () => {
      it('パリティ違反として報告されること', () => {});
    });

    context('検出有無が異なるテストケースがある場合', () => {
      it('パリティ違反として報告されること', () => {});
    });

    it('4ルール全てが検証対象であること', () => {});
  });
});
```

---

## 4. UseCase層テスト

### 4.1 U-10: ExecuteLintUseCase

**テストファイル**: `packages/biome-toolchain/tests/usecase/execute-lint-usecase.test.ts`

**モック戦略**: BiomeExecutor, FileReader, BiomeConfigLoaderは `vi.fn()` でモック。Domain層は実体使用。

#### テストケースツリー

```typescript
target('execute', () => {
  describe('対象ファイル群に対してフルリントを実行する', () => {
    context('全ルールが有効な場合', () => {
      it('全ファイルx全ルールの検査結果を含むLintReportを返すこと', () => {});
    });

    context('違反が検出された場合', () => {
      it('errorCountが0より大きいLintReportを返すこと', () => {});
    });

    context('BiomeExecutorがエラーを送出した場合', () => {
      it('LintExecutionがFailed状態のLintReportを返すこと', () => {});
    });

    context('対象ファイルがglob展開で0件の場合', () => {
      it('エラーが送出されること', () => {});
    });
  });
});
```

#### 代表的AAAパターン

```typescript
it('全ファイルx全ルールの検査結果を含むLintReportを返すこと', () => {
  // Arrange
  const mockBiomeExecutor = {
    check: vi.fn().mockResolvedValue({
      violations: [],
      checkedFiles: [FilePath.of('src/domain/model/example.ts')],
      checkedRules: [RuleName.of('require-unit-comment'), RuleName.of('require-layer-comment')],
    }),
    checkChanged: vi.fn(),
    format: vi.fn().mockResolvedValue({ formattedFiles: [], issues: [] }),
    checkAndApply: vi.fn(),
  };
  const mockFileReader = {
    read: vi.fn(),
    exists: vi.fn(),
    glob: vi.fn().mockResolvedValue([FilePath.of('src/domain/model/example.ts')]),
    readPackageJson: vi.fn(),
  };
  const mockConfigLoader = {
    load: vi.fn(),
    getEnabledRules: vi.fn().mockResolvedValue([
      BiomeRule.create('require-unit-comment'),
      BiomeRule.create('require-layer-comment'),
    ]),
    getAntiPatternConfig: vi.fn().mockResolvedValue({ detectors: [] }),
  };
  const usecase = new ExecuteLintUseCase(mockBiomeExecutor, mockFileReader, mockConfigLoader);

  // Act
  const actual = await usecase.execute(['src/**/*.ts']);

  // Assert
  expect(actual.totalFiles).toBe(1);
  expect(actual.passed).toBe(true);
});
```

---

### 4.2 U-11: ExecutePostToolUseHookUseCase

**テストファイル**: `packages/biome-toolchain/tests/usecase/execute-post-tool-use-hook-usecase.test.ts`

**モック戦略**: Portモック。**500ms制約テスト**に特に注力する。

#### テストケースツリー

```typescript
target('execute', () => {
  describe('PostToolUse Hookを実行する', () => {
    context('対象ファイルがフックの対象パターンに合致する場合', () => {
      it('LintReportを返すこと', () => {});
    });

    context('対象ファイルがフックの対象パターンに合致しない場合', () => {
      it('null結果を返すこと', () => {});
    });

    context('フックが無効の場合', () => {
      it('null結果を返すこと', () => {});
    });

    it('AntiPatternDetectorが実行されないこと', () => {});

    describe('500msタイムアウト制約を遵守する', () => {
      context('実行時間が100msの場合', () => {
        it('warningなしのLintReportを返すこと', () => {});
      });

      context('実行時間が500msちょうどの場合', () => {
        it('warningなしのLintReportを返すこと', () => {});
      });

      context('実行時間が600msの場合', () => {
        it('warningつきのLintReportを返すこと', () => {});
        it('結果がブロッキングされないこと', () => {});
      });
    });
  });
});
```

#### 代表的AAAパターン（500ms超過ケース）

> **タイマー制御方針**: 500ms制約テストでは実時間に依存するとテストが不安定になるため、`vi.useFakeTimers()` を使用して時間経過を制御する。UseCaseが `performance.now()` 等の時刻取得に依存する場合は、Clock（時刻提供）をコンストラクタインジェクション可能にし、テスト時にFake Clockを注入する設計とする。

```typescript
it('warningつきのLintReportを返すこと', async () => {
  // Arrange
  vi.useFakeTimers();
  const mockBiomeExecutor = {
    check: vi.fn(),
    checkChanged: vi.fn(),
    format: vi.fn(),
    checkAndApply: vi.fn().mockImplementation(async () => {
      // Fake timersで600ms経過をシミュレート
      vi.advanceTimersByTime(600);
      return {
        violations: [],
        checkedFiles: [FilePath.of('src/domain/model/example.ts')],
        checkedRules: [RuleName.of('require-unit-comment')],
      };
    }),
  };
  const mockConfigLoader = {
    load: vi.fn(),
    getEnabledRules: vi.fn().mockResolvedValue([BiomeRule.create('require-unit-comment')]),
    getAntiPatternConfig: vi.fn(),
  };
  const fakeClock = { now: () => vi.getMockedSystemTime()?.getTime() ?? Date.now() };
  const usecase = new ExecutePostToolUseHookUseCase(mockBiomeExecutor, mockConfigLoader, fakeClock);

  // Act
  const actual = await usecase.execute(FilePath.of('src/domain/model/example.ts'));

  // Assert
  expect(actual).not.toBeNull();
  expect(actual.warningCount).toBeGreaterThan(0);

  // Cleanup
  vi.useRealTimers();
});
```

---

### 4.3 U-12: EvaluateCIGateUseCase

**テストファイル**: `packages/biome-toolchain/tests/usecase/evaluate-ci-gate-usecase.test.ts`

**モック戦略**: Portモック。

#### テストケースツリー

```typescript
target('execute', () => {
  describe('CIゲート判定を実行する', () => {
    context('リント違反なし・ESLint残存なしの場合', () => {
      it('合格判定を返すこと', () => {});
    });

    context('リント違反ありの場合', () => {
      it('不合格判定を返すこと', () => {});
      it('HarnessCompatibleError形式のエラーリストを返すこと', () => {});
    });

    context('ESLint残存が検出された場合', () => {
      it('不合格判定を返すこと', () => {});
    });

    context('リント違反とESLint残存の両方がある場合', () => {
      it('両方のエラーを含む不合格判定を返すこと', () => {});
    });

    context('ESLint残存違反がLintReportにマージされHarnessCompatibleErrorに変換される場合', () => {
      it('code/severity/suggestion/adr_ref/fix_exampleが全て正しく設定されること', () => {});
    });
  });
});
```

#### 代表的AAAパターン（HarnessCompatibleError完全変換チェーン）

```typescript
it('code/severity/suggestion/adr_ref/fix_exampleが全て正しく設定されること', async () => {
  // Arrange
  const mockBiomeExecutor = {
    check: vi.fn().mockResolvedValue({
      violations: [
        RuleViolation.of({
          filePath: FilePath.of('src/domain/model/example.ts'),
          line: 1, column: 1,
          ruleName: RuleName.of('require-unit-comment'),
          message: '@unitコメントが必要です',
          severity: ViolationSeverity.Error,
          suggestion: '// @unit biome-toolchain を追加してください',
        }),
      ],
      checkedFiles: [FilePath.of('src/domain/model/example.ts')],
      checkedRules: [RuleName.of('require-unit-comment')],
    }),
    checkChanged: vi.fn(),
    format: vi.fn().mockResolvedValue({ formattedFiles: [], issues: [] }),
    checkAndApply: vi.fn(),
  };
  const mockFileReader = {
    read: vi.fn(),
    exists: vi.fn().mockResolvedValue(true),
    glob: vi.fn().mockResolvedValue([
      FilePath.of('src/domain/model/example.ts'),
      FilePath.of('.eslintrc.js'),
    ]),
    readPackageJson: vi.fn().mockResolvedValue({ dependencies: {}, devDependencies: {} }),
  };
  const mockConfigLoader = {
    load: vi.fn(),
    getEnabledRules: vi.fn().mockResolvedValue([BiomeRule.create('require-unit-comment')]),
    getAntiPatternConfig: vi.fn().mockResolvedValue({ detectors: [] }),
  };
  const usecase = new EvaluateCIGateUseCase(mockBiomeExecutor, mockFileReader, mockConfigLoader);

  // Act
  const actual = await usecase.execute();

  // Assert
  expect(actual.passed).toBe(false);
  expect(actual.errors.length).toBeGreaterThan(0);
  const error = actual.errors[0];
  expect(error.code).toBe('LINT_REQUIRE_UNIT_COMMENT');
  expect(error.severity).toBe('error');
  expect(error.suggestion).toBeDefined();
  expect(error.adr_ref).toBeDefined();
  expect(error.fix_example).toBeDefined();
});
```

---

### 4.4 U-13: DetectAntiPatternsUseCase

**テストファイル**: `packages/biome-toolchain/tests/usecase/detect-anti-patterns-usecase.test.ts`

**モック戦略**: Portモック。

#### テストケースツリー

```typescript
target('execute', () => {
  describe('アンチパターン検出を実行する', () => {
    context('全検出器が有効な場合', () => {
      it('4種全ての検出結果が統合されたリストを返すこと', () => {});
    });

    context('BiomeRule型検出器のみ有効な場合', () => {
      it('BiomeExecutor経由の結果のみ返すこと', () => {});
    });

    context('ExternalScript型検出器のみ有効な場合', () => {
      it('FileReader経由の分析結果のみ返すこと', () => {});
    });

    context('閾値未超過の場合', () => {
      it('空のリストを返すこと', () => {});
    });

    it('ExternalScript型検出器がPromise.allで並列実行されること', () => {});
  });
});
```

---

### 4.5 U-14: VerifyParityUseCase

**テストファイル**: `packages/biome-toolchain/tests/usecase/verify-parity-usecase.test.ts`

**モック戦略**: Portモック。

#### テストケースツリー

```typescript
target('execute', () => {
  describe('v0 ESLintとの等価性を検証する', () => {
    context('全ルールで等価な場合', () => {
      it('パリティ成功レポートを返すこと', () => {});
    });

    context('一部ルールで差異がある場合', () => {
      it('差異のあるルールを含む検証レポートを返すこと', () => {});
    });

    it('ParityTestServiceに委譲されること', () => {});
  });
});
```

---

## 5. Controller層テスト

### 5.1 U-15: CLI Controller

**テストファイル**: `packages/biome-toolchain/tests/controller/cli-controller.test.ts`

**モック戦略**: ExecuteLintUseCase, DetectAntiPatternsUseCase, VerifyParityUseCaseを `vi.fn()` でモックする。

#### テストケースツリー

```typescript
target('handleLint', () => {
  describe('lintコマンドを処理する', () => {
    context('引数にファイルパスが指定された場合', () => {
      it('指定ファイルに対してリントを実行すること', () => {});
    });

    context('--rulesオプションが指定された場合', () => {
      it('指定ルールのみでリントを実行すること', () => {});
    });

    context('違反が検出された場合', () => {
      it('終了コード1を返すこと', () => {});
    });

    context('違反がない場合', () => {
      it('終了コード0を返すこと', () => {});
    });

    context('実行エラーが発生した場合', () => {
      it('終了コード2を返すこと', () => {});
    });

    context('--fixオプションが指定された場合', () => {
      it('自動修正モードでUseCaseを呼び出すこと', () => {});
      it('修正適用後の結果を出力すること', () => {});
    });

    context('--fixオプションが指定されていない場合', () => {
      it('チェックのみモードでUseCaseを呼び出すこと', () => {});
    });

    context('--format jsonオプションの場合', () => {
      it('JSON形式で結果を出力すること', () => {});
    });

    context('デフォルト出力の場合', () => {
      it('テキスト形式で結果を出力すること', () => {});
    });
  });
});

target('handleDetectAntiPatterns', () => {
  describe('detect-anti-patternsコマンドを処理する', () => {
    context('--typeオプションが指定された場合', () => {
      it('指定タイプのアンチパターンのみ検出すること', () => {});
    });

    it('検出結果を出力すること', () => {});
  });
});

target('handleVerifyParity', () => {
  describe('verify-parityコマンドを処理する', () => {
    context('--fixturesオプションが指定された場合', () => {
      it('指定ディレクトリのフィクスチャで検証を実行すること', () => {});
    });
  });
});
```

#### 代表的AAAパターン（出力フォーマット）

```typescript
it('テキスト形式で結果を出力すること', () => {
  // Arrange
  const mockUseCase = {
    execute: vi.fn().mockResolvedValue(
      LintReport.of({
        totalFiles: 3,
        totalViolations: 1,
        errorCount: 1,
        warningCount: 0,
        violations: [
          RuleViolation.of({
            filePath: FilePath.of('src/domain/model/example.ts'),
            line: 1,
            column: 1,
            ruleName: RuleName.of('require-unit-comment'),
            message: '@unitコメントが必要です',
            severity: ViolationSeverity.Error,
          }),
        ],
        durationMs: 100,
      })
    ),
  };
  const controller = new CLIController(mockUseCase);
  const stdout: string[] = [];

  // Act
  const actual = await controller.handleLint(['src/**/*.ts'], { output: stdout });

  // Assert
  expect(actual.exitCode).toBe(1);
  expect(stdout.join('\n')).toContain('src/domain/model/example.ts:1:1');
  expect(stdout.join('\n')).toContain('3 files checked, 1 errors, 0 warnings');
});
```

---

### 5.2 U-16: Hook Controller

**テストファイル**: `packages/biome-toolchain/tests/controller/hook-controller.test.ts`

**モック戦略**: ExecutePostToolUseHookUseCaseを `vi.fn()` でモックする。

#### テストケースツリー

```typescript
target('handle', () => {
  describe('PostToolUse Hook入力を処理する', () => {
    context('有効なJSON入力を受け取った場合', () => {
      it('UseCaseに変更ファイルパスを渡して実行すること', () => {});
    });

    context('不正なJSON入力の場合', () => {
      it('エラーレスポンスを返すこと', () => {});
    });

    context('違反がない場合', () => {
      it('status: "pass"のJSON出力を返すこと', () => {});
    });

    context('違反がある場合', () => {
      it('status: "fail"とviolationsを含むJSON出力を返すこと', () => {});
    });

    context('write以外のtoolの場合', () => {
      it('処理をスキップしてpassを返すこと', () => {});
    });
  });
});
```

#### 代表的AAAパターン

```typescript
it('status: "pass"のJSON出力を返すこと', () => {
  // Arrange
  const mockUseCase = {
    execute: vi.fn().mockResolvedValue(
      LintReport.of({
        totalFiles: 1,
        totalViolations: 0,
        errorCount: 0,
        warningCount: 0,
        violations: [],
        durationMs: 50,
      })
    ),
  };
  const controller = new HookController(mockUseCase);
  const input = JSON.stringify({ tool: 'write', filePath: 'src/domain/model/example.ts' });

  // Act
  const actual = await controller.handle(input);

  // Assert
  const parsed = JSON.parse(actual);
  expect(parsed.status).toBe('pass');
});
```

---

### 5.3 U-17: CI Controller

**テストファイル**: `packages/biome-toolchain/tests/controller/ci-controller.test.ts`

**モック戦略**: EvaluateCIGateUseCaseを `vi.fn()` でモックする。

#### テストケースツリー

```typescript
target('handle', () => {
  describe('CIゲート判定を実行する', () => {
    context('合格の場合', () => {
      it('終了コード0を返すこと', () => {});
    });

    context('不合格の場合', () => {
      it('終了コード1を返すこと', () => {});
    });

    context('--output annotationsオプションの場合', () => {
      it('GitHub annotations形式で出力すること', () => {});
    });

    context('--output jsonオプションの場合', () => {
      it('JSON形式で出力すること', () => {});
    });
  });
});

target('formatAnnotation', () => {
  describe('違反をGitHub annotations形式に変換する', () => {
    context('error severityの場合', () => {
      it('::error形式の文字列を返すこと', () => {});
    });

    context('warning severityの場合', () => {
      it('::warning形式の文字列を返すこと', () => {});
    });
  });
});
```

#### 代表的AAAパターン（annotations出力）

```typescript
it('::error形式の文字列を返すこと', () => {
  // Arrange
  const controller = new CIController(vi.fn() as any);
  const violation = RuleViolation.of({
    filePath: FilePath.of('src/domain/model/example.ts'),
    line: 1,
    column: 1,
    ruleName: RuleName.of('require-unit-comment'),
    message: '@unitコメントが必要です',
    severity: ViolationSeverity.Error,
  });

  // Act
  const actual = controller.formatAnnotation(violation);

  // Assert
  expect(actual).toBe(
    '::error file=src/domain/model/example.ts,line=1,col=1::@unitコメントが必要です'
  );
});
```

---

## 6. Biomeプラグイン層テスト

> **テストサイズに関する注記**: U-18/U-19はBiome CLI実行（`child_process.execFile`）や`cargo test`を伴うため、厳密にはSmallテストサイズの定義（外部プロセス起動なし）を超えている。しかし、以下の理由からユニットテスト設計に含める判断とした。
> - GritQL/Rust Pluginの正確性検証はBiome CLI経由でしか行えず、他のテストレイヤーに移管するとフィードバックサイクルが遅延する
> - 実行コストは1テストケースあたり数百ms〜数秒であり、Smallテストのビルド時間内に収まる
> - 統合テスト設計（it_test_design.md）ではインフラ層アダプターとの結合を対象とするため、プラグイン単体の検証はここで扱うのが適切である

### 6.1 U-18: GritQLルール

**テストファイル**: `packages/biome-toolchain/tests/plugins/gritql-rules.test.ts`

**テスト方式**: テストフィクスチャファイルに対してBiome CLIを `child_process.execFile` で実行し、JSON出力をパースして検証する。

**フィクスチャ配置**: `packages/biome-toolchain/tests/fixtures/gritql/`

#### テストケースツリー

```typescript
target('require-unit-comment', () => {
  describe('@unitコメントの必須チェックを行う', () => {
    context('@unitコメントがあるファイルの場合', () => {
      it('違反が報告されないこと', () => {});
    });

    context('@unitコメントがないファイルの場合', () => {
      it('違反が報告されること', () => {});
      it('行番号1, 列番号1で報告されること', () => {});
    });

    context('@unitコメントはあるがunit名がないファイルの場合', () => {
      it('違反が報告されること', () => {});
    });
  });
});

target('require-layer-comment', () => {
  describe('@layerコメントの必須チェックを行う', () => {
    context('@layerコメントが有効な値の場合', () => {
      it('違反が報告されないこと', () => {});
    });

    context('@layerコメントがないファイルの場合', () => {
      it('違反が報告されること', () => {});
    });

    context('@layerの値がdomainでもportでもusecaseでもcontrollerでもinfrastructureでもない場合', () => {
      it('違反が報告されること', () => {});
    });

    context('5つの有効なレイヤー名それぞれで検証する場合', () => {
      it('domain, port, usecase, controller, infrastructure全てで違反なしとなること', () => {});
    });
  });
});

describe('除外パターンの検証', () => {
  context('*.test.ts ファイルの場合', () => {
    it('GritQLルールの検査対象外となること', () => {});
  });

  context('*.spec.ts ファイルの場合', () => {
    it('GritQLルールの検査対象外となること', () => {});
  });

  context('__tests__/ 配下のファイルの場合', () => {
    it('GritQLルールの検査対象外となること', () => {});
  });

  context('dist/ 配下のファイルの場合', () => {
    it('GritQLルールの検査対象外となること', () => {});
  });
});
```

---

### 6.2 U-19: Rust Plugin

**テストファイル**:
- Rustネイティブテスト: `packages/biome-toolchain/biome-plugins/rust/tests/no_layer_violation_test.rs`, `enforce_folder_structure_test.rs`
- WASM統合テスト: `packages/biome-toolchain/tests/plugins/rust-plugin-rules.test.ts`

**フィクスチャ配置**: `packages/biome-toolchain/tests/fixtures/rust-plugin/`

#### WASM統合テスト ケースツリー

```typescript
target('no-layer-violation', () => {
  describe('レイヤー依存違反を検出する', () => {
    context('domainからusecaseへのimportがある場合', () => {
      it('レイヤー違反が報告されること', () => {});
    });

    context('usecaseからdomainへのimportがある場合', () => {
      it('違反が報告されないこと', () => {});
    });

    context('controllerからdomainへのimportがある場合', () => {
      it('違反が報告されないこと', () => {});
    });

    context('infrastructureからusecaseへのimportがある場合', () => {
      it('レイヤー違反が報告されること', () => {});
    });
  });
});

target('enforce-folder-structure', () => {
  describe('フォルダ構造を検証する', () => {
    context('正しいディレクトリ構成のファイルの場合', () => {
      it('違反が報告されないこと', () => {});
    });

    context('domain層に不正なサブディレクトリがある場合', () => {
      it('違反が報告されること', () => {});
    });

    context('usecase層のファイル名が*-usecase.tsでない場合', () => {
      it('違反が報告されること', () => {});
    });

    context('controller層のファイル名が*-controller.tsでない場合', () => {
      it('違反が報告されること', () => {});
    });

    context('infrastructure層のファイルがPort実装と対応していない場合', () => {
      it('違反が報告されること', () => {});
    });

    context('infrastructure層の正しいファイル構成の場合', () => {
      it('違反が報告されないこと', () => {});
    });

    context('tests/配下がdomain/usecase/controller/infrastructure構成でない場合', () => {
      it('違反が報告されること', () => {});
    });

    context('tests/配下が正しいミラー構成の場合', () => {
      it('違反が報告されないこと', () => {});
    });
  });
});
```

#### Rustネイティブテスト概要

```rust
// no_layer_violation_test.rs
#[test] fn domain層から他層への依存がない場合は許可される()
#[test] fn domain層からusecase層へのインポートは違反として検出される()
#[test] fn infrastructure層からport層へのインポートは許可される()
#[test] fn レイヤー判定でatlayerコメントが優先される()
#[test] fn ディレクトリパスからレイヤーが推定される()

// enforce_folder_structure_test.rs
#[test] fn 正しいdomain層のディレクトリ構成が許可される()
#[test] fn 不正なdomain層のサブディレクトリが検出される()
#[test] fn usecase層のファイル命名規則が検証される()
#[test] fn infrastructure層のファイルがPort実装と対応していることが検証される()
#[test] fn tests配下がミラー構成であることが検証される()
```

---

## 7. テスト全体サマリー

| レイヤー | テストファイル数 | 推定テストケース数 |
|---------|:-------------:|:---------------:|
| Domain - 集約 | 5 | 約75 |
| Domain - 値オブジェクト | 13 | 約60 |
| Domain - サービス | 3 | 約27 |
| UseCase | 5 | 約33 |
| Controller | 3 | 約28 |
| Biome Plugin (GritQL) | 1 | 約14 |
| Biome Plugin (Rust/WASM) | 1 (+2 Rust) | 約23 (+12 Rust) |
| **合計** | **31** | **約272** |
