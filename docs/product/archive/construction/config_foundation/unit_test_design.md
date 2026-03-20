# ユニットテスト設計: config-foundation

> **Unit ID**: config-foundation
> **作成日**: 2026-03-11
> **対応ストーリー**: US-027, US-028, US-029, US-030
> **テストフレームワーク**: Vitest 3.0.0
> **前提ドキュメント**: `domain_model.md`、`logical_design.md`（同ディレクトリ）

---

## 1. テスト対象×テストレイヤー対応表

| テスト対象 | 層 | ユニットテスト | モック戦略 |
|-----------|-----|:----------:|----------|
| HarnessConfig（集約ルート） | Domain | ○ | Domain: 実体、Port: 不要 |
| ConfigVersion | Domain (VO) | ○ | 実体のみ |
| FilePath | Domain (VO) | ○ | 実体のみ |
| Mode | Domain (VO) | ○ | 実体のみ |
| Preset | Domain (VO) | ○ | 実体のみ |
| FeatureToggleMap | Domain (VO) | ○ | 実体のみ |
| EnvironmentOverride | Domain (VO) | ○ | 実体のみ |
| OrchestrationConfig | Domain (VO) | ○ | 実体のみ |
| SessionConfig | Domain (VO) | ○ | 実体のみ |
| QuickModeConfig | Domain (VO) | ○ | 実体のみ |
| MigrationResult | Domain (VO) | ○ | 実体のみ |
| ValidationResult | Domain (VO) | ○ | 実体のみ |
| ParallelizationConfig 等 | Domain (VO) | ○ | 実体のみ |
| ConfigMigrationService | Domain (Service) | ○ | Domain: 実体、Port: モック |
| ConfigValidationService | Domain (Service) | ○ | Domain: 実体、Port: モック |
| LoadConfigUseCase | UseCase | ○ | Domain: 実体、Port: モック |
| EnableFeatureUseCase | UseCase | ○ | Domain: 実体、Port: モック |
| DisableFeatureUseCase | UseCase | ○ | Domain: 実体、Port: モック |
| ListToggleableFeaturesUseCase | UseCase | ○ | Domain: 実体、Port: モック |
| MigrateConfigUseCase | UseCase | ○ | Domain: 実体、Port: モック |
| EnableFeatureHandler | Controller | ○ | UseCase: モック |
| DisableFeatureHandler | Controller | ○ | UseCase: モック |
| MigrateConfigHandler | Controller | ○ | UseCase: モック |
| FileSystemConfigRepository | Infrastructure | ○ | 実体（一時ディレクトリ） |
| JsonSchemaValidator (ajv) | Infrastructure | ○ | 実体（ajv実動作） |
| FileSystemBackupCreator | Infrastructure | ○ | 実体（一時ディレクトリ） |
| ProcessEnvironmentReader | Infrastructure | ○ | 実体（process.env操作） |

### モック戦略まとめ（論理設計§9.6準拠）

| テスト対象層 | Domain | Port | Infrastructure |
|------------|--------|------|---------------|
| Domain層テスト | 実体 | モック（vi.fn()） | — |
| UseCase層テスト | 実体 | モック（vi.fn()） | — |
| Controller層テスト | — | — | モック（UseCase単位） |
| Infrastructure層テスト | — | — | 実体（一時ディレクトリ等） |

---

## 2. Domain層テスト

### 2.1 HarnessConfig（集約ルート）

**テストファイル**: `scripts/harness/__tests__/config-foundation/domain/harness-config.test.ts`

**モック戦略**: Domain層のためモック不使用。全て実体オブジェクトを使用。テスト用のJSONスキーマとJSONデータはテスト内にリテラルとして定義する。

**不変条件カバレッジ**:

| 不変条件 | テストケース |
|---------|-----------|
| INV-1 | `create` > JSONがスキーマに適合しない場合 > スキーマ不適合な設定では生成に失敗する |
| INV-2 | `create` > GSD由来設定のデフォルト値が検証される |
| INV-3 | `create` > v2設定にversionフィールドがない場合 > バージョン情報が欠落した設定では生成に失敗する |
| INV-4 | `enableFeature` / `disableFeature` > 存在しない機能名を指定した場合 > 無効な機能名を指定した場合は失敗する |
| INV-5 | `create` > v2設定からv1既存フィールドが欠落している場合 > v1必須フィールドが欠落した設定では生成に失敗する |
| INV-6 | `resolveFilePaths` > 解決後のパスがプロジェクトルート外の場合 > プロジェクト外のパスには解決できない |
| INV-7 | `resolveEnvironmentOverrides` > 不正な値でオーバーライドした場合はバリデーション失敗する |
| INV-8 | `getOrchestration` > orchestration.enabledがfalseの場合でも値は保持 |

#### テストケースツリー

```
target('create', () => {
  describe('HarnessConfigファクトリメソッドによる集約生成', () => {
    it('有効なv2 JSONとスキーマからHarnessConfigが生成される')
    it('有効なv1 JSONからv1互換のHarnessConfigが生成される')
    it('GSD由来設定のデフォルト値がenabled: falseで初期化される')               // INV-2
    it('スキーマから動的抽出されたトグル対象がFeatureToggleMapに設定される')

    context('JSONがスキーマに適合しない場合', () => {
      it('スキーマ不適合な設定では生成に失敗する')                              // INV-1
    })
    context('GSD由来設定のenabledがtrueに明示設定されている場合', () => {
      it('ユーザー指定値が尊重されてエラーにならない')
    })
    context('v2設定にversionフィールドがない場合', () => {
      it('バージョン情報が欠落した設定では生成に失敗する')                      // INV-3
    })
    context('v2設定からv1既存フィールド（project等）が欠落している場合', () => {
      it('v1必須フィールドが欠落した設定では生成に失敗する')                    // INV-5
    })
  })
})

target('enableFeature', () => {
  describe('指定された機能を有効化する', () => {
    it('対象機能のenabled状態がtrueになる')
    it('FeatureToggledドメインイベントが生成される')
    it('イベントのfeatureNameとnewStateが正しく設定される')

    context('存在しない機能名を指定した場合', () => {
      it('無効な機能名を指定した場合は失敗する')                               // INV-4
      it('エラーメッセージに利用可能な機能名一覧が含まれる')
    })
    context('既に有効な機能を再度有効化した場合', () => {
      it('エラーにならずenabled状態がtrueのままである')
    })
  })
})

target('disableFeature', () => {
  describe('指定された機能を無効化する', () => {
    it('対象機能のenabled状態がfalseになる')
    it('FeatureToggledドメインイベントが生成される')

    context('存在しない機能名を指定した場合', () => {
      it('無効な機能名を指定した場合は失敗する')                               // INV-4
    })
    context('既に無効な機能を再度無効化した場合', () => {
      it('エラーにならずenabled状態がfalseのままである')
    })
  })
})

target('getToggleableFeatures', () => {
  describe('トグル可能な機能名一覧を返す', () => {
    it('スキーマから抽出された機能名が全て含まれる')
    it('v1既存セクション名は含まれない')
  })
})

target('applyPreset', () => {
  describe('プリセットに基づくデフォルト値を一括適用する', () => {
    context('minimalプリセットの場合', () => {
      it('GSD由来機能が全てdisabledになる')
    })
    context('strictプリセットの場合', () => {
      it('全機能がenabledになる')
    })
    context('ユーザーが明示的に設定した値がある場合', () => {
      it('プリセットにより上書きされない')
    })
  })
})

target('resolveEnvironmentOverrides', () => {
  describe('環境変数によるオーバーライドを適用する', () => {
    it('x-env-overrideに対応する環境変数の値で設定が上書きされる')
    it('未設定の環境変数に対応する設定は変更されない')
    it('boolean型の環境変数が正しく変換される')

    context('オーバーライド適用後にスキーマバリデーションが失敗する場合', () => {
      it('不正な値でオーバーライドした場合はバリデーション失敗する')             // INV-7
    })
  })
})

target('resolveFilePaths', () => {
  describe('相対パスを絶対パスに解決する', () => {
    it('相対パスがプロジェクトルートを基準に絶対パスに変換される')
    it('既に絶対パスの場合はそのまま維持される')

    context('解決後のパスがプロジェクトルート外の場合', () => {
      it('プロジェクト外のパスには解決できない')                                // INV-6
    })
  })
})

target('getOrchestration', () => {
  describe('OrchestrationConfig値オブジェクトを返す', () => {
    it('設定されたOrchestrationConfigが返却される')

    context('orchestration.enabledがfalseの場合', () => {
      it('OrchestrationConfigが返却される（値は保持されている）')               // INV-8
    })
  })
})

target('getSession', () => {
  describe('SessionConfig値オブジェクトを返す', () => {
    it('設定されたSessionConfigが返却される')
    it('stateFileとroadmapFileが正しく取得できる')
  })
})

target('toJSON', () => {
  describe('シリアライズ可能なオブジェクトを返す', () => {
    it('JSONとして書き出し可能な形式に変換される')
    it('schemaフィールドは含まれない')
    it('domainEventsフィールドは含まれない')
    it('v1既存フィールドが正しく出力される')
  })
})

target('pullDomainEvents', () => {
  describe('未発行のドメインイベントを取得する', () => {
    it('enableFeature実行後にFeatureToggledイベントが取得される')
    it('取得後に内部キューがクリアされる')
    it('イベント未発行時は空配列が返される')
  })
})
```

#### AAAパターンの例外テスト方針

> 例外発生を検証するテストでは、`expect(() => ...).toThrow()` の構文上 Act と Assert を分離できないため、`// Act & Assert` として結合することを許容パターンとする。エラークラス名は `toThrow()` の引数としてAssertセクション内でのみ使用し、`it()` のテストケース名には含めない（testing-rules.md「実装の詳細はテストケース名に表さない」準拠）。

#### 代表的AAAパターン例

```typescript
// create: 有効なv2 JSONからHarnessConfigが生成される
it('有効なv2 JSONとスキーマからHarnessConfigが生成される', () => {
  // Arrange
  const rawJson = {
    version: 2,
    preset: 'standard',
    project: { name: 'test-project' },
    layers: {},
    harnesses: {},
    paths: { root: '.' },
    reporting: {},
    orchestration: { enabled: false, mode: 'single',
      parallelization: { enabled: false }, modelProfile: { enabled: false },
      contextStrategy: { enabled: false }, commitStrategy: { enabled: false },
      workflow: { enabled: false }
    },
    session: { enabled: false, stateFile: '.harness/session-state.json', roadmapFile: '.harness/roadmap.json' },
    quick_mode: { enabled: false, targetConditions: [], excludeConditions: [], validators: [] },
  };
  const schema = loadTestSchema();

  // Act
  const actual = HarnessConfig.create(rawJson, schema);

  // Assert
  expect(actual.getVersion().isV2()).toBe(true);
  expect(actual.getOrchestration().enabled).toBe(false);
});

// enableFeature: 存在しない機能名でINV-4違反
it('無効な機能名を指定した場合は失敗する', () => {
  // Arrange
  const config = createValidHarnessConfig();

  // Act & Assert（例外テストではAct & Assert結合を許容パターンとする）
  expect(() => config.enableFeature('nonexistent'))
    .toThrow(InvalidFeatureNameError); // Assert: エラー型はAssertコメントで補足
});

// resolveEnvironmentOverrides: INV-7
it('不正な値でオーバーライドした場合はバリデーション失敗する', () => {
  // Arrange
  const config = createValidHarnessConfig();
  const envVars = new Map([
    ['HARNESS_ORCHESTRATION_MODE', 'invalid_mode_value'],
  ]);

  // Act & Assert（例外テストではAct & Assert結合を許容パターンとする）
  expect(() => config.resolveEnvironmentOverrides(envVars))
    .toThrow(ConfigValidationError); // Assert: エラー型はAssertコメントで補足
});
```

---

### 2.2 値オブジェクト群

全値オブジェクトは以下の観点を検証する:
- **正常生成**: 有効な値からインスタンスが正しく生成される
- **バリデーション**: 不正値に対してドメインエラーがスローされる
- **等価性**: 同一値のインスタンス同士が`equals`で`true`を返す
- **不変性**: 変更操作が新インスタンスを返し、元インスタンスは不変

#### 2.2.1 ConfigVersion

**テストファイル**: `scripts/harness/__tests__/config-foundation/domain/values/config-version.test.ts`

**モック戦略**: モック不使用（値オブジェクト単体）

```
target('create', () => {
  describe('バージョンを判定して生成する', () => {
    context('versionフィールドが存在しないJSONの場合', () => {
      it('V1として生成される')
    })
    context('versionフィールドが2のJSONの場合', () => {
      it('V2として生成される')
    })
    context('versionフィールドが"1.0"（文字列）のJSONの場合', () => {
      it('V1として生成される')
    })
    context('versionフィールドが2以外の数値のJSONの場合', () => {
      it('V1として生成される')
    })
  })
})

target('isV1', () => {
  describe('V1かどうかを判定する', () => {
    it('V1の場合trueが返される')
    it('V2の場合falseが返される')
  })
})

target('isV2', () => {
  describe('V2かどうかを判定する', () => {
    it('V2の場合trueが返される')
    it('V1の場合falseが返される')
  })
})

target('equals', () => {
  describe('等価判定を行う', () => {
    it('同じバージョン同士はtrueが返される')
    it('異なるバージョン同士はfalseが返される')
  })
})
```

**AAAパターン例**:

```typescript
it('V1の場合trueが返される', () => {
  // Arrange
  const version = ConfigVersion.create({});

  // Act
  const actual = version.isV1();

  // Assert
  expect(actual).toBe(true);
});
```

#### 2.2.2 FilePath

**テストファイル**: `scripts/harness/__tests__/config-foundation/domain/values/file-path.test.ts`

**モック戦略**: モック不使用

```
target('create', () => {
  describe('FilePathを生成する', () => {
    it('有効な相対パスからFilePathが生成される')
    it('有効な絶対パスからFilePathが生成される')

    context('空文字列が渡された場合', () => {
      it('空のパスでは生成できない')
    })
    context('~/で始まるパスが渡された場合', () => {
      it('ホームディレクトリ参照のパスでは生成できない')
    })
    context('$HOMEを含むパスが渡された場合', () => {
      it('環境変数展開を含むパスでは生成できない')
    })
    context('$USERを含むパスが渡された場合', () => {
      it('環境変数展開を含むパスでは生成できない')
    })
  })
})

target('isProjectLocal', () => {
  describe('プロジェクトローカルかどうかを判定する', () => {
    context('プロジェクトルート配下のパスの場合', () => {
      it('trueが返される')
    })
    context('プロジェクトルート外の絶対パスの場合', () => {
      it('falseが返される')
    })
  })
})

target('resolve', () => {
  describe('相対パスを絶対パスに解決する', () => {
    it('basePathを基準に解決された新しいFilePathが返される')
    it('元のFilePathインスタンスは変更されない')
  })
})

target('equals', () => {
  describe('等価判定を行う', () => {
    it('同じパス文字列のインスタンス同士はtrueが返される')
    it('異なるパス文字列のインスタンス同士はfalseが返される')
  })
})

target('toString', () => {
  describe('パス文字列を返す', () => {
    it('生成時に指定したパス文字列が返される')
  })
})
```

**AAAパターン例**:

```typescript
it('空のパスでは生成できない', () => {
  // Arrange
  const emptyPath = '';

  // Act & Assert（例外テストではAct & Assert結合を許容パターンとする）
  expect(() => FilePath.create(emptyPath)).toThrow(EmptyFilePathError); // Assert: エラー型はAssertコメントで補足
});

it('basePathを基準に解決された新しいFilePathが返される', () => {
  // Arrange
  const filePath = FilePath.create('.harness/session-state.json');
  const basePath = '/Users/test/project';

  // Act
  const actual = filePath.resolve(basePath);

  // Assert
  expect(actual.toString()).toBe('/Users/test/project/.harness/session-state.json');
});
```

#### 2.2.3 Mode

**テストファイル**: `scripts/harness/__tests__/config-foundation/domain/values/mode.test.ts`

**モック戦略**: モック不使用

```
target('fromString', () => {
  describe('文字列からModeを生成する', () => {
    context('"single"が渡された場合', () => {
      it('single Modeが生成される')
    })
    context('"parallel"が渡された場合', () => {
      it('parallel Modeが生成される')
    })
    context('不正な文字列が渡された場合', () => {
      it('不正なモード文字列では生成できない')
    })
  })
})

target('equals', () => {
  describe('等価判定を行う', () => {
    it('同じモード同士はtrueが返される')
    it('異なるモード同士はfalseが返される')
  })
})
```

> **注記**: Mode は列挙型的な値オブジェクトであり、不変性テスト（変更操作が新インスタンスを返す）は不要。変更操作自体を持たないため。

#### 2.2.4 Preset

**テストファイル**: `scripts/harness/__tests__/config-foundation/domain/values/preset.test.ts`

**モック戦略**: モック不使用

```
target('fromString', () => {
  describe('文字列からPresetを生成する', () => {
    context('"minimal"が渡された場合', () => {
      it('minimal Presetが生成される')
    })
    context('"standard"が渡された場合', () => {
      it('standard Presetが生成される')
    })
    context('"strict"が渡された場合', () => {
      it('strict Presetが生成される')
    })
    context('不正な文字列が渡された場合', () => {
      it('不正なプリセット文字列では生成できない')
    })
  })
})

target('equals', () => {
  describe('等価判定を行う', () => {
    it('同じプリセット同士はtrueが返される')
    it('異なるプリセット同士はfalseが返される')
  })
})
```

> **注記**: Preset は列挙型的な値オブジェクトであり、不変性テスト（変更操作が新インスタンスを返す）は不要。変更操作自体を持たないため。

#### 2.2.5 FeatureToggleMap

**テストファイル**: `scripts/harness/__tests__/config-foundation/domain/values/feature-toggle-map.test.ts`

**モック戦略**: モック不使用

```
target('isEnabled', () => {
  describe('指定機能の有効状態を返す', () => {
    context('機能が有効な場合', () => {
      it('trueが返される')
    })
    context('機能が無効な場合', () => {
      it('falseが返される')
    })
    context('存在しない機能名の場合', () => {
      it('falseが返される')
    })
  })
})

target('enable', () => {
  describe('指定機能を有効にした新インスタンスを返す', () => {
    it('対象機能がenabledの新しいFeatureToggleMapが返される')
    it('元のインスタンスは変更されない')
  })
})

target('disable', () => {
  describe('指定機能を無効にした新インスタンスを返す', () => {
    it('対象機能がdisabledの新しいFeatureToggleMapが返される')
    it('元のインスタンスは変更されない')
  })
})

target('hasFeature', () => {
  describe('機能名の存在を確認する', () => {
    it('存在する機能名に対してtrueが返される')
    it('存在しない機能名に対してfalseが返される')
  })
})

target('getFeatureNames', () => {
  describe('全機能名を返す', () => {
    it('登録された全機能名の配列が返される')
  })
})
```

**AAAパターン例**:

```typescript
it('元のインスタンスは変更されない', () => {
  // Arrange
  const toggles = new Map([['orchestration', false], ['session', false]]);
  const original = FeatureToggleMap.create(toggles);

  // Act
  const actual = original.enable('orchestration');

  // Assert
  expect(actual.isEnabled('orchestration')).toBe(true);
  expect(original.isEnabled('orchestration')).toBe(false);
});
```

#### 2.2.6 EnvironmentOverride

**テストファイル**: `scripts/harness/__tests__/config-foundation/domain/values/environment-override.test.ts`

**モック戦略**: モック不使用

```
target('create', () => {
  describe('EnvironmentOverrideを生成する', () => {
    it('環境変数名・設定パス・値からインスタンスが生成される')
  })
})

target('equals', () => {
  describe('等価判定を行う', () => {
    it('同一属性のインスタンス同士はtrueが返される')
    it('異なる属性のインスタンス同士はfalseが返される')
  })
})
```

#### 2.2.7 OrchestrationConfig

**テストファイル**: `scripts/harness/__tests__/config-foundation/domain/values/orchestration-config.test.ts`

**モック戦略**: モック不使用

```
target('create', () => {
  describe('OrchestrationConfigを生成する', () => {
    it('全属性を指定して正しく生成される')
    it('デフォルト値で生成した場合、全サブ設定がdisabledである')

    context('mode属性に不正な値が含まれる場合', () => {
      it('不正なモード値では生成できない')
    })
    context('サブ設定にenabledフィールドが欠落している場合', () => {
      it('enabledを持たないサブ設定では生成できない')
    })
  })
})

target('equals', () => {
  describe('等価判定を行う', () => {
    it('全属性が同一のインスタンス同士はtrueが返される')
    it('属性が異なるインスタンス同士はfalseが返される')
  })
})

target('immutability', () => {
  describe('不変性を検証する', () => {
    it('生成後にプロパティを外部から変更してもインスタンスの状態は変わらない')
  })
})
```

#### 2.2.8 SessionConfig

**テストファイル**: `scripts/harness/__tests__/config-foundation/domain/values/session-config.test.ts`

**モック戦略**: モック不使用

```
target('create', () => {
  describe('SessionConfigを生成する', () => {
    it('全属性を指定して正しく生成される')
    it('デフォルト値が正しく設定される')

    context('stateFileに無効なパスが指定された場合', () => {
      it('ドメインエラーがスローされる')
    })
    context('roadmapFileに無効なパスが指定された場合', () => {
      it('ドメインエラーがスローされる')
    })
  })
})
```

#### 2.2.9 QuickModeConfig

**テストファイル**: `scripts/harness/__tests__/config-foundation/domain/values/quick-mode-config.test.ts`

**モック戦略**: モック不使用

```
target('create', () => {
  describe('QuickModeConfigを生成する', () => {
    it('全属性を指定して正しく生成される')
    it('デフォルト値で生成した場合、enabledがfalseで配列が空である')
  })
})

target('equals', () => {
  describe('等価判定を行う', () => {
    it('全属性が同一のインスタンス同士はtrueが返される')
    it('属性が異なるインスタンス同士はfalseが返される')
  })
})

target('immutability', () => {
  describe('不変性を検証する', () => {
    it('生成後に配列プロパティを外部から変更してもインスタンスの状態は変わらない')
  })
})
```

#### 2.2.10 MigrationResult

**テストファイル**: `scripts/harness/__tests__/config-foundation/domain/values/migration-result.test.ts`

**モック戦略**: モック不使用

```
target('create', () => {
  describe('MigrationResultを生成する', () => {
    it('成功結果が正しく生成される')
    it('失敗結果がエラー情報付きで生成される')
    it('警告付き成功結果が正しく生成される')
  })
})

target('equals', () => {
  describe('等価判定を行う', () => {
    it('全属性が同一のインスタンス同士はtrueが返される')
    it('属性が異なるインスタンス同士はfalseが返される')
  })
})

target('immutability', () => {
  describe('不変性を検証する', () => {
    it('生成後にerrors配列を外部から変更してもインスタンスの状態は変わらない')
    it('生成後にwarnings配列を外部から変更してもインスタンスの状態は変わらない')
  })
})
```

#### 2.2.11 ValidationResult

**テストファイル**: `scripts/harness/__tests__/config-foundation/domain/values/validation-result.test.ts`

**モック戦略**: モック不使用

```
target('create', () => {
  describe('ValidationResultを生成する', () => {
    it('valid: trueの結果が正しく生成される')
    it('valid: falseの結果がエラー一覧付きで生成される')
  })
})

target('errors', () => {
  describe('エラー情報を返す', () => {
    it('各エラーにpath・message・keywordが含まれる')
  })
})

target('equals', () => {
  describe('等価判定を行う', () => {
    it('同一のバリデーション結果同士はtrueが返される')
    it('異なるバリデーション結果同士はfalseが返される')
  })
})

target('immutability', () => {
  describe('不変性を検証する', () => {
    it('生成後にerrors配列を外部から変更してもインスタンスの状態は変わらない')
  })
})
```

#### 2.2.12 ParallelizationConfig / ModelProfileConfig / ContextStrategyConfig / CommitStrategyConfig / WorkflowConfig

**テストファイル**: `scripts/harness/__tests__/config-foundation/domain/values/sub-configs.test.ts`

**モック戦略**: モック不使用

全て同構造のため1ファイルにまとめる。

```
target('ParallelizationConfig.create', () => {
  describe('ParallelizationConfigを生成する', () => {
    it('enabled: trueで正しく生成される')
    it('enabled: falseで正しく生成される')
  })
})

target('ModelProfileConfig.create', () => {
  describe('ModelProfileConfigを生成する', () => {
    it('enabled: trueで正しく生成される')
    it('enabled: falseで正しく生成される')
  })
})

target('ContextStrategyConfig.create', () => {
  describe('ContextStrategyConfigを生成する', () => {
    it('enabled: trueで正しく生成される')
    it('enabled: falseで正しく生成される')
  })
})

target('CommitStrategyConfig.create', () => {
  describe('CommitStrategyConfigを生成する', () => {
    it('enabled: trueで正しく生成される')
    it('enabled: falseで正しく生成される')
  })
})

target('WorkflowConfig.create', () => {
  describe('WorkflowConfigを生成する', () => {
    it('enabled: trueで正しく生成される')
    it('enabled: falseで正しく生成される')
  })
})
```

---

### 2.3 ドメインサービス

#### 2.3.1 ConfigMigrationService

**テストファイル**: `scripts/harness/__tests__/config-foundation/domain/services/config-migration-service.test.ts`

**モック戦略**:
- **モック対象**: `ConfigRepository`（vi.fn()）、`BackupCreator`（vi.fn()）、`ConfigSchemaValidator`（vi.fn()）
- **実体使用**: `ConfigVersion`、`MigrationResult`、`FilePath` 等のドメインオブジェクト

> **設計文書間の整合性に関する注記**: `domain_model.md` では `ConfigMigrationService.migrate(v1Config)` として純粋なドメイン契約（HarnessConfig集約を受け取る）を定義している。一方、本テスト設計は `logical_design.md` のオーケストレーション契約に従い、`migrate(v1ConfigPath, schema)` としてリポジトリ統合を含むコーディネーション・シグネチャを採用している。`domain_model.md` が純粋ドメイン契約を定義するのに対し、`logical_design.md` はインフラストラクチャ協調を含む実装契約を拡張定義しており、テストは後者に準拠する。同様に `HarnessConfig.create` のシグネチャも `logical_design.md` の `create(rawJson, schema)` に従う。

```
target('migrate', () => {
  describe('v1設定をv2に変換する', () => {
    it('v1設定にv2セクションが追加されたMigrationResultが返される')
    it('v1既存フィールドが変更されずに保持されている')
    it('バックアップが作成される')
    it('GSD由来設定のenabledがfalseに設定される')
    it('version: 2フィールドが追加される')
    it('マイグレーション後のv2スキーマバリデーションが実行される')
    it('マイグレーション成功時にConfigMigratedドメインイベントが生成される')

    context('既にv2形式の設定が渡された場合', () => {
      it('警告付きのMigrationResult（success: true）が返される')
      it('バックアップは作成されない')
    })
    context('マイグレーション後のバリデーションが失敗する場合', () => {
      it('MigrationResult（success: false）が返される')
      it('errorsにバリデーションエラーが含まれる')
    })
    context('バックアップ作成に失敗した場合', () => {
      it('バックアップ失敗時はマイグレーションが中断される')
    })
  })
})

target('detectVersion', () => {
  describe('JSONからバージョンを判定する', () => {
    context('versionフィールドがない場合', () => {
      it('V1が返される')
    })
    context('versionフィールドが2の場合', () => {
      it('V2が返される')
    })
    context('入力がオブジェクトでない場合', () => {
      it('V1が返される')
    })
    context('versionフィールドが2以外の数値の場合', () => {
      it('V1が返される')
    })
  })
})
```

**AAAパターン例**:

```typescript
it('v1設定にv2セクションが追加されたMigrationResultが返される', async () => {
  // Arrange
  const v1Json = { project: { name: 'test' }, layers: {}, harnesses: {}, paths: {}, reporting: {} };
  const schema = loadTestSchema();
  const v1ConfigPath = FilePath.create('harness.config.json');
  const backupPath = FilePath.create('.harness/backups/harness.config.1234567890.json');

  const mockConfigRepository: ConfigRepository = {
    load: vi.fn().mockResolvedValue(v1Json),
    save: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(true),
  };
  const mockBackupCreator: BackupCreator = {
    createBackup: vi.fn().mockResolvedValue(backupPath),
  };
  const mockSchemaValidator: ConfigSchemaValidator = {
    validate: vi.fn().mockReturnValue(ValidationResult.valid()),
    extractCustomProperty: vi.fn().mockReturnValue(new Map()),
  };
  const service = new ConfigMigrationService(mockConfigRepository, mockBackupCreator, mockSchemaValidator);

  // Act
  const actual = await service.migrate(v1ConfigPath, schema);

  // Assert
  expect(actual.success).toBe(true);
  expect(actual.migratedConfig).toHaveProperty('version', 2);
  expect(actual.migratedConfig).toHaveProperty('orchestration');
  expect(actual.migratedConfig).toHaveProperty('session');
  expect(actual.migratedConfig).toHaveProperty('quick_mode');
  expect(actual.backupPath.toString()).toBe(backupPath.toString());
});

it('V1が返される', () => {
  // Arrange
  const rawJson = { project: { name: 'test' } };

  // Act
  const actual = ConfigMigrationService.detectVersion(rawJson);

  // Assert
  expect(actual.isV1()).toBe(true);
});
```

#### 2.3.2 ConfigValidationService

**テストファイル**: `scripts/harness/__tests__/config-foundation/domain/services/config-validation-service.test.ts`

**モック戦略**:
- **モック対象**: `ConfigSchemaValidator`（vi.fn()）
- **実体使用**: `ValidationResult` 等のドメインオブジェクト

```
target('validate', () => {
  describe('JSONスキーマバリデーションを実行する', () => {
    it('有効なJSONに対してvalid: trueのValidationResultが返される')

    context('スキーマに適合しないJSONの場合', () => {
      it('valid: falseのValidationResultが返される')
      it('errorsにエラー箇所と違反キーワードが含まれる')
    })
  })
})

target('extractToggleableFeatures', () => {
  describe('スキーマからトグル対象を動的抽出する', () => {
    it('enabledフィールドを持つセクション名が抽出される')
    it('v1既存セクション（project, layers等）は除外される')
    it('ネストされたenabledフィールド（orchestration.parallelization等）も抽出される')
    it('enabledフィールドを持たないセクションは含まれない')
  })
})
```

**AAAパターン例**:

```typescript
it('enabledフィールドを持つセクション名が抽出される', () => {
  // Arrange
  const schema = {
    properties: {
      version: { type: 'number' },
      project: { type: 'object', properties: { name: { type: 'string' } } },
      orchestration: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          mode: { type: 'string' },
        },
      },
      session: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
        },
      },
    },
  };
  const mockSchemaValidator: ConfigSchemaValidator = {
    validate: vi.fn(),
    extractCustomProperty: vi.fn(),
  };
  const service = new ConfigValidationService(mockSchemaValidator);

  // Act
  const actual = service.extractToggleableFeatures(schema);

  // Assert
  expect(actual).toContain('orchestration');
  expect(actual).toContain('session');
  expect(actual).not.toContain('project');
  expect(actual).not.toContain('version');
});
```

---

## 3. UseCase層テスト

### 共通モック戦略

全UseCaseテストで以下のポートをモックする:
- `ConfigRepository` — `vi.fn()` で `load` / `save` / `exists` をモック
- `ConfigSchemaValidator` — `vi.fn()` で `validate` / `extractCustomProperty` をモック
- `EnvironmentVariableReader` — `vi.fn()` で `read` / `readAll` をモック
- `BackupCreator` — `vi.fn()` で `createBackup` をモック（MigrateConfigUseCaseのみ）

Domain層のオブジェクトは全て実体を使用する。

> **例外: ConfigMigrationServiceのモック使用について**: `MigrateConfigUseCase`のテストでは、`ConfigMigrationService`をコンストラクタ経由で注入されるコラボレーターとして扱い、呼び出し検証（call verification）を行う。`ConfigMigrationService`は複数ポート（ConfigRepository, BackupCreator, ConfigSchemaValidator）を協調させるドメインサービスであり、UseCase層からはPort同様にコンストラクタ注入される依存として扱われるため、モック使用は許容パターンとする。他のドメインオブジェクト（値オブジェクト、集約）は引き続き実体を使用する。

### 3.1 LoadConfigUseCase

**テストファイル**: `scripts/harness/__tests__/config-foundation/usecase/load-config-usecase.test.ts`

```
target('execute', () => {
  describe('設定ファイルを読み込みHarnessConfigを返す', () => {
    it('指定パスから設定ファイルが読み込まれHarnessConfigが返される')
    it('環境変数オーバーライドが適用される')
    it('ファイルパスが解決される')

    context('設定ファイルパスを省略した場合', () => {
      it('プロジェクトルートからharness.config.jsonが自動検出される')
    })
    context('設定ファイルが存在しない場合', () => {
      it('デフォルト設定でHarnessConfigが生成される')
    })
    context('スキーマバリデーションが失敗する場合', () => {
      it('バリデーション失敗時は設定の読み込みに失敗する')
    })
  })
})
```

**AAAパターン例**:

```typescript
it('指定パスから設定ファイルが読み込まれHarnessConfigが返される', async () => {
  // Arrange
  const validV2Json = createValidV2Json();
  const schema = loadTestSchema();
  const mockConfigRepository: ConfigRepository = {
    load: vi.fn().mockResolvedValue(validV2Json),
    save: vi.fn(),
    exists: vi.fn().mockResolvedValue(true),
  };
  const mockSchemaValidator: ConfigSchemaValidator = {
    validate: vi.fn().mockReturnValue(ValidationResult.valid()),
    extractCustomProperty: vi.fn().mockReturnValue(new Map()),
  };
  const mockEnvReader: EnvironmentVariableReader = {
    read: vi.fn().mockReturnValue(undefined),
    readAll: vi.fn().mockReturnValue(new Map()),
  };
  const usecase = new LoadConfigUseCase(mockConfigRepository, mockSchemaValidator, mockEnvReader);

  // Act
  const actual = await usecase.execute('harness.config.json');

  // Assert
  expect(actual.getVersion().isV2()).toBe(true);
  expect(mockConfigRepository.load).toHaveBeenCalledTimes(1);
});
```

### 3.2 EnableFeatureUseCase

**テストファイル**: `scripts/harness/__tests__/config-foundation/usecase/enable-feature-usecase.test.ts`

```
target('execute', () => {
  describe('指定機能を有効化して設定を保存する', () => {
    it('対象機能が有効化された設定がファイルに保存される')
    it('ドメインイベントが取得される')

    context('存在しない機能名を指定した場合', () => {
      it('無効な機能名を指定した場合は失敗する')
    })
    context('設定ファイルの保存に失敗した場合', () => {
      it('エラーがスローされる')
    })
  })
})
```

### 3.3 DisableFeatureUseCase

**テストファイル**: `scripts/harness/__tests__/config-foundation/usecase/disable-feature-usecase.test.ts`

```
target('execute', () => {
  describe('指定機能を無効化して設定を保存する', () => {
    it('対象機能が無効化された設定がファイルに保存される')
    it('ドメインイベントが取得される')

    context('存在しない機能名を指定した場合', () => {
      it('無効な機能名を指定した場合は失敗する')
    })
  })
})
```

### 3.4 ListToggleableFeaturesUseCase

**テストファイル**: `scripts/harness/__tests__/config-foundation/usecase/list-toggleable-features-usecase.test.ts`

```
target('execute', () => {
  describe('トグル可能な機能一覧と各状態を返す', () => {
    it('機能名とenabled状態の配列が返される')
    it('全機能の状態が正しく取得される')

    context('トグル可能な機能が存在しない場合', () => {
      it('空配列が返される')
    })
  })
})
```

**AAAパターン例**:

```typescript
it('機能名とenabled状態の配列が返される', async () => {
  // Arrange
  const validV2Json = createValidV2Json();
  const mockConfigRepository: ConfigRepository = {
    load: vi.fn().mockResolvedValue(validV2Json),
    save: vi.fn(),
    exists: vi.fn().mockResolvedValue(true),
  };
  const mockSchemaValidator: ConfigSchemaValidator = {
    validate: vi.fn().mockReturnValue(ValidationResult.valid()),
    extractCustomProperty: vi.fn().mockReturnValue(new Map()),
  };
  const mockEnvReader: EnvironmentVariableReader = {
    read: vi.fn().mockReturnValue(undefined),
    readAll: vi.fn().mockReturnValue(new Map()),
  };
  const usecase = new ListToggleableFeaturesUseCase(mockConfigRepository, mockSchemaValidator, mockEnvReader);

  // Act
  const actual = await usecase.execute();

  // Assert
  expect(actual).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'orchestration', enabled: false }),
      expect.objectContaining({ name: 'session', enabled: false }),
    ]),
  );
});
```

### 3.5 MigrateConfigUseCase

**テストファイル**: `scripts/harness/__tests__/config-foundation/usecase/migrate-config-usecase.test.ts`

```
target('execute', () => {
  describe('v1→v2マイグレーションを実行する', () => {
    it('マイグレーション成功時にMigrationResult（success: true）が返される')
    it('ConfigMigrationService.migrateが正しい引数で呼び出される')

    context('設定ファイルが存在しない場合', () => {
      it('設定ファイル未検出時はマイグレーションに失敗する')
    })
    context('設定ファイルパスを省略した場合', () => {
      it('プロジェクトルートからharness.config.jsonが自動検出される')
    })
  })
})
```

---

## 4. Controller層テスト

### 共通モック戦略

UseCaseをモックする。`process.argv`をテスト前に設定し、`console.log` / `console.error` / `process.exit` をスタブする。

### 4.1 EnableFeatureHandler

**テストファイル**: `scripts/harness/__tests__/config-foundation/controller/enable-feature-handler.test.ts`

**モック戦略**: `EnableFeatureUseCase` / `ListToggleableFeaturesUseCase` をモック

```
target('harness:enable', () => {
  describe('機能有効化CLIコマンド', () => {
    it('機能名を指定した場合、有効化成功メッセージが表示される')
    it('更新されたファイルパスが表示される')

    context('--listフラグが指定された場合', () => {
      it('トグル可能な機能一覧が表示される')
      it('各機能のenabled/disabled状態が表示される')
    })
    context('引数なしで実行された場合', () => {
      it('Usage情報が表示されてexit(1)で終了する')
    })
    context('存在しない機能名を指定した場合', () => {
      it('エラーメッセージと利用可能な機能名一覧が表示される')
    })
    context('バリデーションエラーが発生した場合', () => {
      it('エラー詳細が表示されてexit(1)で終了する')
    })
    context('v1レイヤー名を渡した場合', () => {
      it('既存のv1ロジックへ委譲される')
    })
    context('v2とv1双方に該当しうる入力の場合', () => {
      it('v2機能名が優先的に判定される')
    })
  })
})
```

**AAAパターン例**:

```typescript
it('機能名を指定した場合、有効化成功メッセージが表示される', async () => {
  // Arrange
  const mockEnableFeatureUseCase = { execute: vi.fn().mockResolvedValue(undefined) };
  const mockListUseCase = { execute: vi.fn() };
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const handler = new EnableFeatureHandler(mockEnableFeatureUseCase, mockListUseCase);

  // Act
  await handler.handle(['orchestration']);

  // Assert
  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Enabled feature: orchestration'));
  expect(mockEnableFeatureUseCase.execute).toHaveBeenCalledWith('orchestration');
  consoleSpy.mockRestore();
});
```

### 4.2 DisableFeatureHandler

**テストファイル**: `scripts/harness/__tests__/config-foundation/controller/disable-feature-handler.test.ts`

**モック戦略**: `DisableFeatureUseCase` をモック

```
target('harness:disable', () => {
  describe('機能無効化CLIコマンド', () => {
    it('機能名を指定した場合、無効化成功メッセージが表示される')
    it('更新されたファイルパスが表示される')

    context('引数なしで実行された場合', () => {
      it('Usage情報が表示されてexit(1)で終了する')
    })
    context('存在しない機能名を指定した場合', () => {
      it('エラーメッセージが表示される')
    })
    context('v1レイヤー名を渡した場合', () => {
      it('既存のv1ロジックへ委譲される')
    })
    context('v2とv1双方に該当しうる入力の場合', () => {
      it('v2機能名が優先的に判定される')
    })
  })
})
```

### 4.3 MigrateConfigHandler

**テストファイル**: `scripts/harness/__tests__/config-foundation/controller/migrate-config-handler.test.ts`

**モック戦略**: `MigrateConfigUseCase` をモック

```
target('harness:migrate-config', () => {
  describe('v1→v2マイグレーションCLIコマンド', () => {
    it('マイグレーション成功時にバックアップパスと更新パスが表示される')
    it('追加されたセクション一覧が表示される')

    context('設定ファイルが見つからない場合', () => {
      it('エラーメッセージとharness:initへの案内が表示される')
      it('exit(1)で終了する')
    })
    context('--dry-runフラグが指定された場合', () => {
      it('ファイル書き込みが行われずにマイグレーション結果のみ表示される')
    })
    context('既にv2形式の場合', () => {
      it('マイグレーション不要のメッセージが表示される')
    })
    context('マイグレーション中にバリデーションエラーが発生した場合', () => {
      it('エラー詳細とsuggestionが表示されてexit(1)で終了する')
    })
  })
})
```

**AAAパターン例**:

```typescript
it('マイグレーション成功時にバックアップパスと更新パスが表示される', async () => {
  // Arrange
  const migrationResult = MigrationResult.create({
    success: true,
    backupPath: FilePath.create('.harness/backups/harness.config.1234567890.json'),
    migratedConfig: { version: 2 },
    errors: [],
    warnings: [],
  });
  const mockMigrateUseCase = { execute: vi.fn().mockResolvedValue(migrationResult) };
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const handler = new MigrateConfigHandler(mockMigrateUseCase);

  // Act
  await handler.handle([]);

  // Assert
  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Migration complete'));
  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Backup:'));
  consoleSpy.mockRestore();
});
```

---

## 5. Infrastructure層テスト

### 5.1 FileSystemConfigRepository

**テストファイル**: `scripts/harness/__tests__/config-foundation/infrastructure/file-system-config-repository.test.ts`

**モック戦略**: モック不使用。一時ディレクトリ（`fs.mkdtempSync()`）に実ファイルを作成して検証する。テスト後にクリーンアップ。

```
target('load', () => {
  describe('JSONファイルを読み込みパース済みオブジェクトを返す', () => {
    it('有効なJSONファイルからパース済みオブジェクトが返される')

    context('ファイルが存在しない場合', () => {
      it('エラーがスローされる')
    })
    context('ファイル内容が不正なJSONの場合', () => {
      it('不正なJSON形式のファイルは読み込みに失敗する')
    })
  })
})

target('save', () => {
  describe('オブジェクトをJSONファイルとして書き出す', () => {
    it('インデント2のJSONとしてファイルに書き出される')
    it('末尾に改行が付与される')
    it('エンコーディングがutf-8である')
  })
})

target('exists', () => {
  describe('ファイルの存在を確認する', () => {
    context('ファイルが存在する場合', () => {
      it('trueが返される')
    })
    context('ファイルが存在しない場合', () => {
      it('falseが返される')
    })
  })
})
```

**AAAパターン例**:

```typescript
it('有効なJSONファイルからパース済みオブジェクトが返される', async () => {
  // Arrange
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-repo-test-'));
  const configPath = path.join(tmpDir, 'harness.config.json');
  const expectedData = { version: 2, project: { name: 'test' } };
  fs.writeFileSync(configPath, JSON.stringify(expectedData, null, 2), 'utf-8');
  const repository = new FileSystemConfigRepository();
  const filePath = FilePath.create(configPath);

  try {
    // Act
    const actual = await repository.load(filePath);

    // Assert
    expect(actual).toEqual(expectedData);
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});
```

### 5.2 JsonSchemaValidator (ajv)

**テストファイル**: `scripts/harness/__tests__/config-foundation/infrastructure/json-schema-validator.test.ts`

**モック戦略**: モック不使用。ajvの実動作を検証する。

```
target('validate', () => {
  describe('ajvによるJSONスキーマバリデーション', () => {
    it('有効なJSONに対してvalid: trueが返される')
    it('必須フィールド欠落時にvalid: falseが返される')
    it('型不一致時にエラーパスとキーワードが正しく設定される')
    it('enum違反時にエラーメッセージに許可値が含まれる')
    it('allErrors: trueにより全エラーが一括で返される')
    it('useDefaults: trueによりdefault値が自動適用される')
  })
})

target('extractCustomProperty', () => {
  describe('スキーマからカスタムプロパティを抽出する', () => {
    it('x-env-overrideが設定されたフィールドのconfigPathと環境変数名が抽出される')
    it('カスタムプロパティが未設定のフィールドは除外される')
    it('ネストされたフィールドのカスタムプロパティも抽出される')
    it('$refで定義されたフィールドのカスタムプロパティも抽出される')
  })
})
```

**AAAパターン例**:

```typescript
it('必須フィールド欠落時にvalid: falseが返される', () => {
  // Arrange
  const schema = {
    type: 'object',
    required: ['version', 'project'],
    properties: {
      version: { type: 'number' },
      project: { type: 'object' },
    },
  };
  const invalidJson = { version: 2 }; // projectが欠落
  const validator = new JsonSchemaValidator();

  // Act
  const actual = validator.validate(invalidJson, schema);

  // Assert
  expect(actual.valid).toBe(false);
  expect(actual.errors).toHaveLength(1);
  expect(actual.errors[0].keyword).toBe('required');
});
```

### 5.3 FileSystemBackupCreator

**テストファイル**: `scripts/harness/__tests__/config-foundation/infrastructure/file-system-backup-creator.test.ts`

**モック戦略**: モック不使用。一時ディレクトリに実ファイルを作成して検証する。

```
target('createBackup', () => {
  describe('ファイルのバックアップを作成する', () => {
    it('.harness/backups/配下にタイムスタンプ付きバックアップが作成される')
    it('バックアップファイルの内容が元ファイルと一致する')
    it('バックアップ先のFilePathが返される')

    context('バックアップディレクトリが存在しない場合', () => {
      it('ディレクトリが自動作成されてバックアップが成功する')
    })
    context('元ファイルが存在しない場合', () => {
      it('エラーがスローされる')
    })
  })
})
```

**AAAパターン例**:

```typescript
it('.harness/backups/配下にタイムスタンプ付きバックアップが作成される', async () => {
  // Arrange
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-test-'));
  const configPath = path.join(tmpDir, 'harness.config.json');
  fs.writeFileSync(configPath, '{"version":1}', 'utf-8');
  const creator = new FileSystemBackupCreator(tmpDir);
  const filePath = FilePath.create(configPath);

  try {
    // Act
    const actual = await creator.createBackup(filePath);

    // Assert
    expect(actual.toString()).toMatch(/\.harness\/backups\/harness\.config\.\d+\.json$/);
    const backupContent = fs.readFileSync(actual.toString(), 'utf-8');
    expect(backupContent).toBe('{"version":1}');
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});
```

### 5.4 ProcessEnvironmentReader

**テストファイル**: `scripts/harness/__tests__/config-foundation/infrastructure/process-environment-reader.test.ts`

**モック戦略**: モック不使用。`process.env` を直接操作し、テスト後にクリーンアップする。

```
target('read', () => {
  describe('指定した環境変数の値を返す', () => {
    it('設定されている環境変数の値が返される')

    context('未設定の環境変数の場合', () => {
      it('undefinedが返される')
    })
  })
})

target('readAll', () => {
  describe('全環境変数をMap形式で返す', () => {
    it('process.envの内容がMap形式で返される')
    it('HARNESS_プレフィックスの環境変数が含まれる')
  })
})
```

**AAAパターン例**:

```typescript
it('設定されている環境変数の値が返される', () => {
  // Arrange
  const originalValue = process.env.HARNESS_ORCHESTRATION_MODE;
  process.env.HARNESS_ORCHESTRATION_MODE = 'parallel';
  const reader = new ProcessEnvironmentReader();

  try {
    // Act
    const actual = reader.read('HARNESS_ORCHESTRATION_MODE');

    // Assert
    expect(actual).toBe('parallel');
  } finally {
    if (originalValue === undefined) {
      delete process.env.HARNESS_ORCHESTRATION_MODE;
    } else {
      process.env.HARNESS_ORCHESTRATION_MODE = originalValue;
    }
  }
});
```

---

## 6. テストファイル一覧

| # | テストファイルパス | テスト対象 | テスト数（概算） |
|---|----------------|----------|:----------:|
| 1 | `scripts/harness/__tests__/config-foundation/domain/harness-config.test.ts` | HarnessConfig集約 | 27 |
| 2 | `scripts/harness/__tests__/config-foundation/domain/values/config-version.test.ts` | ConfigVersion | 8 |
| 3 | `scripts/harness/__tests__/config-foundation/domain/values/file-path.test.ts` | FilePath | 12 |
| 4 | `scripts/harness/__tests__/config-foundation/domain/values/mode.test.ts` | Mode | 5 |
| 5 | `scripts/harness/__tests__/config-foundation/domain/values/preset.test.ts` | Preset | 6 |
| 6 | `scripts/harness/__tests__/config-foundation/domain/values/feature-toggle-map.test.ts` | FeatureToggleMap | 9 |
| 7 | `scripts/harness/__tests__/config-foundation/domain/values/environment-override.test.ts` | EnvironmentOverride | 3 |
| 8 | `scripts/harness/__tests__/config-foundation/domain/values/orchestration-config.test.ts` | OrchestrationConfig | 8 |
| 9 | `scripts/harness/__tests__/config-foundation/domain/values/session-config.test.ts` | SessionConfig | 4 |
| 10 | `scripts/harness/__tests__/config-foundation/domain/values/quick-mode-config.test.ts` | QuickModeConfig | 5 |
| 11 | `scripts/harness/__tests__/config-foundation/domain/values/migration-result.test.ts` | MigrationResult | 7 |
| 12 | `scripts/harness/__tests__/config-foundation/domain/values/validation-result.test.ts` | ValidationResult | 6 |
| 13 | `scripts/harness/__tests__/config-foundation/domain/values/sub-configs.test.ts` | Parallelization等 | 10 |
| 14 | `scripts/harness/__tests__/config-foundation/domain/services/config-migration-service.test.ts` | ConfigMigrationService | 12 |
| 15 | `scripts/harness/__tests__/config-foundation/domain/services/config-validation-service.test.ts` | ConfigValidationService | 7 |
| 16 | `scripts/harness/__tests__/config-foundation/usecase/load-config-usecase.test.ts` | LoadConfigUseCase | 6 |
| 17 | `scripts/harness/__tests__/config-foundation/usecase/enable-feature-usecase.test.ts` | EnableFeatureUseCase | 4 |
| 18 | `scripts/harness/__tests__/config-foundation/usecase/disable-feature-usecase.test.ts` | DisableFeatureUseCase | 3 |
| 19 | `scripts/harness/__tests__/config-foundation/usecase/list-toggleable-features-usecase.test.ts` | ListToggleableFeaturesUseCase | 3 |
| 20 | `scripts/harness/__tests__/config-foundation/usecase/migrate-config-usecase.test.ts` | MigrateConfigUseCase | 4 |
| 21 | `scripts/harness/__tests__/config-foundation/controller/enable-feature-handler.test.ts` | EnableFeatureHandler | 8 |
| 22 | `scripts/harness/__tests__/config-foundation/controller/disable-feature-handler.test.ts` | DisableFeatureHandler | 6 |
| 23 | `scripts/harness/__tests__/config-foundation/controller/migrate-config-handler.test.ts` | MigrateConfigHandler | 6 |
| 24 | `scripts/harness/__tests__/config-foundation/infrastructure/file-system-config-repository.test.ts` | FileSystemConfigRepository | 7 |
| 25 | `scripts/harness/__tests__/config-foundation/infrastructure/json-schema-validator.test.ts` | JsonSchemaValidator | 10 |
| 26 | `scripts/harness/__tests__/config-foundation/infrastructure/file-system-backup-creator.test.ts` | FileSystemBackupCreator | 5 |
| 27 | `scripts/harness/__tests__/config-foundation/infrastructure/process-environment-reader.test.ts` | ProcessEnvironmentReader | 4 |

**合計**: 27ファイル、約193テストケース

---

## 7. 不変条件カバレッジマトリクス

| 不変条件 | 説明 | カバーするテストファイル | テストケース |
|---------|------|---------------------|-----------|
| INV-1 | JSONスキーマ適合 | harness-config.test.ts | `create` > スキーマ不適合な設定では生成に失敗する |
| INV-2 | GSD由来デフォルトOFF | harness-config.test.ts | `create` > GSD由来設定のデフォルト値がenabled: falseで初期化される |
| INV-3 | v2にversion: 2フィールド | harness-config.test.ts | `create` > バージョン情報が欠落した設定では生成に失敗する |
| INV-4 | enableFeature/disableFeature対象の妥当性 | harness-config.test.ts | `enableFeature` / `disableFeature` > 無効な機能名を指定した場合は失敗する |
| INV-5 | v2はv1のスーパーセット | harness-config.test.ts, config-migration-service.test.ts | `create` > v1必須フィールドが欠落した設定では生成に失敗する、`migrate` > v1既存フィールドが保持 |
| INV-6 | FilePathのプロジェクトローカル | harness-config.test.ts, file-path.test.ts | `resolveFilePaths` > プロジェクト外のパスには解決できない |
| INV-7 | オーバーライド後のスキーマ適合 | harness-config.test.ts | `resolveEnvironmentOverrides` > 不正な値でオーバーライドした場合はバリデーション失敗する |
| INV-8 | enabled=false時も値保持 | harness-config.test.ts | `getOrchestration` > enabledがfalseの場合 |
