# インテグレーションテスト設計: config-foundation

> **Unit ID**: config-foundation
> **作成日**: 2026-03-11
> **対応ストーリー**: US-027, US-028, US-029, US-030
> **テストフレームワーク**: Vitest 3.0.0
> **前提ドキュメント**: `domain_model.md`、`logical_design.md`、`unit_test_design.md`（同ディレクトリ）

---

## 1. テスト対象と方針

### 1.1 インテグレーションテスト対象

| # | テスト対象 | 目的 |
|---|----------|------|
| 1 | loadConfig ファサード全フロー | ファイル読み込み → スキーマバリデーション → 環境変数オーバーライド → パス解決の一連の流れ |
| 2 | v1→v2マイグレーション全フロー | ファイル読み込み → バックアップ → マージ → バリデーション → 保存の一連の流れ |
| 3 | 既存CLI互換性 | v1レイヤー/ハーネストグルとv2機能トグルの共存 |

### 1.2 モック戦略

インテグレーションテストでは全て実体を使用する（論理設計§9.6準拠）。

| Domain | Port | Infrastructure |
|--------|------|---------------|
| 実体 | 実体 | 実体（一時ディレクトリ） |

### 1.3 一時ディレクトリ戦略

- **作成**: `fs.mkdtempSync(path.join(os.tmpdir(), 'config-it-'))` でテストごとに一意のディレクトリを作成
- **クリーンアップ**: `afterEach` で `fs.rmSync(tmpDir, { recursive: true })` を実行
- **ファイル配置**: 一時ディレクトリをプロジェクトルートとみなし、`phasegate.config.json` やスキーマファイルを配置

```typescript
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-it-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true });
});
```

---

## 2. フィクスチャデータ設計

### 2.1 v1設定JSONフィクスチャ

```typescript
const V1_CONFIG_FIXTURE = {
  project: {
    name: 'test-project',
    description: 'Integration test project',
  },
  layers: {
    domain: { enabled: true },
    usecase: { enabled: true },
    infrastructure: { enabled: true },
  },
  harnesses: {
    lint: { enabled: true },
    test: { enabled: true },
  },
  paths: {
    root: '.',
    scripts: './scripts',
  },
  reporting: {
    format: 'json',
  },
};
```

### 2.2 v2設定JSONフィクスチャ

```typescript
const V2_CONFIG_FIXTURE = {
  version: 2,
  preset: 'standard',
  project: {
    name: 'test-project',
    description: 'Integration test project',
  },
  layers: {
    domain: { enabled: true },
    usecase: { enabled: true },
    infrastructure: { enabled: true },
  },
  harnesses: {
    lint: { enabled: true },
    test: { enabled: true },
  },
  paths: {
    root: '.',
    scripts: './scripts',
  },
  reporting: {
    format: 'json',
  },
  orchestration: {
    enabled: false,
    mode: 'single',
    parallelization: { enabled: false },
    modelProfile: { enabled: false },
    contextStrategy: { enabled: false },
    commitStrategy: { enabled: false },
    workflow: { enabled: false },
  },
  session: {
    enabled: false,
    stateFile: '.harness/session-state.json',
    roadmapFile: '.harness/roadmap.json',
  },
  quick_mode: {
    enabled: false,
    targetConditions: [],
    excludeConditions: [],
    validators: [],
  },
};
```

### 2.3 v2 JSONスキーマフィクスチャ

実際のスキーマファイル（`scripts/harness/config-foundation/schema/harness-config-v2.schema.json`）を使用する。テスト時は一時ディレクトリにコピーするか、直接パスを参照する。

```typescript
function loadV2Schema(): object {
  // NOTE: 相対パスは実際のプロジェクトレイアウトに応じて実装時に調整すること
  const schemaPath = path.resolve(
    __dirname,
    '../../../config-foundation/schema/harness-config-v2.schema.json'
  );
  return JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
}
```

### 2.4 フィクスチャヘルパー関数

```typescript
function writeConfigFile(dir: string, config: object): string {
  const configPath = path.join(dir, 'phasegate.config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  return configPath;
}

function readConfigFile(configPath: string): object {
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

function setEnvVars(vars: Record<string, string>): () => void {
  const originals: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(vars)) {
    originals[key] = process.env[key];
    process.env[key] = value;
  }
  return () => {
    for (const [key] of Object.entries(vars)) {
      if (originals[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originals[key];
      }
    }
  };
}
```

---

## 3. loadConfig ファサード全フローテスト

**テストファイル**: `scripts/harness/__tests__/config-foundation/integration/load-config.test.ts`

### 3.1 テストケースツリー

```
target('loadConfig', () => {
  describe('設定ファイルを読み込み設定オブジェクトを返す', () => {
    it('v2設定ファイルから設定が正しく構築される')
    it('v1設定ファイルがバージョン検出・v2正規化を経て透過的に読み込まれる')
    it('スキーマのdefault値が未設定フィールドに自動適用される')

    context('プリセットが指定されている場合', () => {
      it('minimalプリセットの設定ファイルが正しく読み込まれる')
      it('standardプリセットの設定ファイルが正しく読み込まれる')
      it('strictプリセットの設定ファイルが正しく読み込まれる')
      it('明示的に設定した値がプリセットのデフォルト値より優先される')
    })

    context('環境変数が設定されている場合', () => {
      it('x-env-overrideに対応する設定値が環境変数の値で上書きされる')
      it('HARNESS_ORCHESTRATION_MODEでmodeがparallelに変更される')
      it('HARNESS_SESSION_ENABLEDでsessionが有効化される')
      it('複数の環境変数が同時に適用される')
      it('環境変数の文字列"1"がブール値trueに変換される')
      it('環境変数の文字列"0"がブール値falseに変換される')
      it('環境変数に不正な値が設定されている場合、読み込みに失敗する')
    })

    context('ファイルパスの解決', () => {
      it('sessionのstateFileが絶対パスに解決される')
      it('sessionのroadmapFileが絶対パスに解決される')
      it('環境変数で~/を含むパスが指定された場合、読み込みに失敗する')
      it('環境変数で$HOMEを含むパスが指定された場合、読み込みに失敗する')
    })

    context('設定ファイルが存在しない場合', () => {
      it('デフォルト設定で設定オブジェクトが生成される')
    })

    context('設定ファイルのJSONが不正な場合', () => {
      it('設定読み込みに失敗する')
    })

    context('スキーマバリデーションに失敗する場合', () => {
      it('設定読み込みに失敗する')
      it('エラーにバリデーション違反箇所の詳細が含まれる')
    })

    context('環境変数オーバーライド後にスキーマ違反となる場合', () => {
      it('設定読み込みに失敗する')
    })

    context('パス解決後にプロジェクトルート外のパスが検出された場合', () => {
      it('パス検証に失敗する')
    })

    context('キャッシュ動作', () => {
      it('2回目の呼び出しではキャッシュされた結果が返される')
      it('clearConfigCache後は再読み込みが行われる')
    })
  })
})
```

### 3.2 代表的AAAパターン例

```typescript
it('v2設定ファイルから設定が正しく構築される', async () => {
  // Arrange
  const configPath = writeConfigFile(tmpDir, V2_CONFIG_FIXTURE);

  // Act
  const actual = await loadConfig(configPath);

  // Assert
  expect(actual.version).toBe(2);
  expect(actual.orchestration.enabled).toBe(false);
  expect(actual.orchestration.mode).toBe('single');
  expect(actual.session.enabled).toBe(false);
  expect(actual.session.stateFile).toBeDefined();
  expect(actual.quick_mode.enabled).toBe(false);
});

it('x-env-overrideに対応する設定値が環境変数の値で上書きされる', async () => {
  // Arrange
  const configPath = writeConfigFile(tmpDir, V2_CONFIG_FIXTURE);
  const restoreEnv = setEnvVars({
    HARNESS_ORCHESTRATION_MODE: 'parallel',
    HARNESS_SESSION_ENABLED: 'true',
  });

  try {
    // Act
    const actual = await loadConfig(configPath);

    // Assert
    expect(actual.orchestration.mode).toBe('parallel');
    expect(actual.session.enabled).toBe(true);
  } finally {
    restoreEnv();
  }
});

it('sessionのstateFileが絶対パスに解決される', async () => {
  // Arrange
  const configPath = writeConfigFile(tmpDir, V2_CONFIG_FIXTURE);

  // Act
  const actual = await loadConfig(configPath);

  // Assert
  expect(path.isAbsolute(actual.session.stateFile)).toBe(true);
  expect(actual.session.stateFile).toContain('.harness/session-state.json');
});

it('デフォルト設定で設定オブジェクトが生成される', async () => {
  // Arrange
  const nonExistentPath = path.join(tmpDir, 'nonexistent', 'phasegate.config.json');

  // Act
  const actual = await loadConfig(nonExistentPath);

  // Assert
  expect(actual.orchestration.enabled).toBe(false);
  expect(actual.session.enabled).toBe(false);
  expect(actual.quick_mode.enabled).toBe(false);
});

it('設定読み込みに失敗する', async () => {
  // Arrange
  const configPath = path.join(tmpDir, 'phasegate.config.json');
  fs.writeFileSync(configPath, 'invalid json {{{', 'utf-8');

  // Act & Assert
  await expect(loadConfig(configPath)).rejects.toThrow();
});
```

---

## 4. v1→v2マイグレーション全フローテスト

**テストファイル**: `scripts/harness/__tests__/config-foundation/integration/migration-flow.test.ts`

### 4.1 テストケースツリー

```
target('v1→v2マイグレーション', () => {
  describe('v1設定ファイルをv2形式に自動変換する', () => {
    it('v1設定ファイルがv2形式に変換されて上書き保存される')
    it('変換後のファイルにversion: 2が追加される')
    it('変換後のファイルにorchestrationセクションが追加される')
    it('変換後のファイルにsessionセクションが追加される')
    it('変換後のファイルにquick_modeセクションが追加される')
    it('GSD由来設定の全enabledがfalseに設定される')
    it('v1既存フィールドが全て変更されずに保持される')

    context('バックアップの作成', () => {
      it('.harness/backups/配下にバックアップファイルが作成される')
      it('バックアップファイルの内容がマイグレーション前のv1設定と一致する')
      it('バックアップファイル名にタイムスタンプが含まれる')
    })

    context('バリデーション', () => {
      it('マイグレーション後の設定がv2スキーマに適合する')
      it('マイグレーション後の設定をloadConfigで正常に読み込める')
    })

    context('既にv2形式の設定ファイルの場合', () => {
      it('マイグレーション成功として扱われる')
      it('警告メッセージが含まれる')
      it('設定ファイルの内容は変更されない')
      it('バックアップは作成されない')
    })

    context('v1設定にスキーマ未定義のフィールドが含まれる場合', () => {
      it('マイグレーション後のバリデーションで未定義フィールドが拒否される')
    })

    context('マイグレーション後のバリデーションが失敗する場合', () => {
      it('マイグレーション失敗として扱われる')
      it('元のv1設定ファイルは変更されない')
      it('バックアップは作成済みだが元ファイルは維持される')
    })

    context('.harness/backups/ディレクトリが存在しない場合', () => {
      it('ディレクトリが自動作成されてマイグレーションが成功する')
    })
  })
})
```

### 4.2 代表的AAAパターン例

```typescript
it('v1設定ファイルがv2形式に変換されて上書き保存される', async () => {
  // Arrange
  const configPath = writeConfigFile(tmpDir, V1_CONFIG_FIXTURE);
  const repository = new FileSystemConfigRepository();
  const schemaValidator = new JsonSchemaValidator();
  const backupCreator = new FileSystemBackupCreator(tmpDir);
  const migrationService = new ConfigMigrationService(repository, backupCreator, schemaValidator);
  const schema = loadV2Schema();
  const filePath = FilePath.create(configPath);

  // Act
  const actual = await migrationService.migrate(filePath, schema);

  // Assert
  expect(actual.success).toBe(true);
  const savedConfig = readConfigFile(configPath);
  expect(savedConfig).toHaveProperty('version', 2);
  expect(savedConfig).toHaveProperty('orchestration');
  expect(savedConfig).toHaveProperty('session');
  expect(savedConfig).toHaveProperty('quick_mode');
});

it('v1既存フィールドが全て変更されずに保持される', async () => {
  // Arrange
  const configPath = writeConfigFile(tmpDir, V1_CONFIG_FIXTURE);
  const repository = new FileSystemConfigRepository();
  const schemaValidator = new JsonSchemaValidator();
  const backupCreator = new FileSystemBackupCreator(tmpDir);
  const migrationService = new ConfigMigrationService(repository, backupCreator, schemaValidator);
  const schema = loadV2Schema();
  const filePath = FilePath.create(configPath);

  // Act
  await migrationService.migrate(filePath, schema);

  // Assert
  const savedConfig = readConfigFile(configPath);
  expect(savedConfig.project).toEqual(V1_CONFIG_FIXTURE.project);
  expect(savedConfig.layers).toEqual(V1_CONFIG_FIXTURE.layers);
  expect(savedConfig.harnesses).toEqual(V1_CONFIG_FIXTURE.harnesses);
  expect(savedConfig.paths).toEqual(V1_CONFIG_FIXTURE.paths);
  expect(savedConfig.reporting).toEqual(V1_CONFIG_FIXTURE.reporting);
});

it('.harness/backups/配下にバックアップファイルが作成される', async () => {
  // Arrange
  const configPath = writeConfigFile(tmpDir, V1_CONFIG_FIXTURE);
  const repository = new FileSystemConfigRepository();
  const schemaValidator = new JsonSchemaValidator();
  const backupCreator = new FileSystemBackupCreator(tmpDir);
  const migrationService = new ConfigMigrationService(repository, backupCreator, schemaValidator);
  const schema = loadV2Schema();
  const filePath = FilePath.create(configPath);

  // Act
  const actual = await migrationService.migrate(filePath, schema);

  // Assert
  const backupFilePath = actual.backupPath.toString();
  expect(fs.existsSync(backupFilePath)).toBe(true);
  const backupContent = JSON.parse(fs.readFileSync(backupFilePath, 'utf-8'));
  expect(backupContent).toEqual(V1_CONFIG_FIXTURE);
});

it('マイグレーション後の設定をloadConfigで正常に読み込める', async () => {
  // Arrange
  const configPath = writeConfigFile(tmpDir, V1_CONFIG_FIXTURE);
  const repository = new FileSystemConfigRepository();
  const schemaValidator = new JsonSchemaValidator();
  const backupCreator = new FileSystemBackupCreator(tmpDir);
  const migrationService = new ConfigMigrationService(repository, backupCreator, schemaValidator);
  const schema = loadV2Schema();
  const filePath = FilePath.create(configPath);
  await migrationService.migrate(filePath, schema);

  // Act
  const actual = await loadConfig(configPath);

  // Assert
  expect(actual.version).toBe(2);
  expect(actual.project.name).toBe('test-project');
  expect(actual.orchestration.enabled).toBe(false);
});

it('設定ファイルの内容は変更されない', async () => {
  // Arrange
  const configPath = writeConfigFile(tmpDir, V2_CONFIG_FIXTURE);
  const originalContent = fs.readFileSync(configPath, 'utf-8');
  const repository = new FileSystemConfigRepository();
  const schemaValidator = new JsonSchemaValidator();
  const backupCreator = new FileSystemBackupCreator(tmpDir);
  const migrationService = new ConfigMigrationService(repository, backupCreator, schemaValidator);
  const schema = loadV2Schema();
  const filePath = FilePath.create(configPath);

  // Act
  await migrationService.migrate(filePath, schema);

  // Assert
  const currentContent = fs.readFileSync(configPath, 'utf-8');
  expect(currentContent).toBe(originalContent);
});
```

---

## 5. 既存CLI互換性テスト

**テストファイル**: `scripts/harness/__tests__/config-foundation/integration/cli-compatibility.test.ts`

> **注記**: CLI互換性テストはCLIハンドラ（EnableFeatureHandler / DisableFeatureHandler）を経由して実行する。ハンドラはargv入力を受け取り、UseCase・Infrastructureを実体で使用し、stdout/stderr/exit codeを検証する。論理設計§5.1のCLI判定順序（v2機能名 → v1レイヤー/ハーネス名）に準拠する。

### 5.1 テストケースツリー

```
target('harness:enable / harness:disable CLIハンドラ', () => {
  describe('CLIハンドラがv1/v2の名前を判定順序に従って処理する', () => {
    it('v2機能名を指定した場合、v2パスで機能が有効化されstdoutに成功メッセージが出力される')
    it('v2機能名を指定した場合、v2パスで機能が無効化されstdoutに成功メッセージが出力される')
    it('v1レイヤー名を指定した場合、v1ロジックにフォールバックして処理される')
    it('v1ハーネス名を指定した場合、v1ロジックにフォールバックして処理される')

    context('v2機能の有効化後にファイル内容を確認', () => {
      it('orchestrationセクションのenabledがtrueに更新される')
      it('v1設定の内容は変更されない')
      it('ファイルがインデント2で整形されている')
    })

    context('v2機能の無効化後にファイル内容を確認', () => {
      it('orchestrationセクションのenabledがfalseに更新される')
      it('v1設定の内容は変更されない')
    })

    context('--listフラグが指定された場合', () => {
      it('v2機能とv1レイヤー/ハーネスの統合一覧がstdoutに出力される')
      it('各機能のenabled/disabled状態が正しく表示される')
    })

    context('サブレベル機能のトグル', () => {
      it('orchestration.parallelizationをドット記法で有効化できる')
      it('親機能と子機能を独立してトグルできる')
    })

    context('v2にもv1にも存在しない名前を指定した場合', () => {
      it('stderrにv2・v1両方の候補を含むエラーメッセージが出力されexit code 1で終了する')
    })

    context('v2マイグレーション前のv1設定でenableを実行した場合', () => {
      it('v1のレイヤー/ハーネストグルは従来通り動作する')
    })
  })
})
```

### 5.2 代表的AAAパターン例

```typescript
it('v2機能名を指定した場合、v2パスで機能が有効化されstdoutに成功メッセージが出力される', async () => {
  // Arrange
  const configPath = writeConfigFile(tmpDir, V2_CONFIG_FIXTURE);
  const handler = createEnableFeatureHandler({ configDir: tmpDir });
  const argv = ['node', 'enable', 'orchestration'];

  // Act
  const actual = await handler.run(argv);

  // Assert
  expect(actual.exitCode).toBe(0);
  expect(actual.stdout).toContain('Enabled feature: orchestration');
  const savedConfig = readConfigFile(configPath);
  expect(savedConfig.orchestration.enabled).toBe(true);
});

it('v1レイヤー名を指定した場合、v1ロジックにフォールバックして処理される', async () => {
  // Arrange
  const configPath = writeConfigFile(tmpDir, V2_CONFIG_FIXTURE);
  const handler = createEnableFeatureHandler({ configDir: tmpDir });
  const argv = ['node', 'enable', 'domain'];

  // Act
  const actual = await handler.run(argv);

  // Assert
  expect(actual.exitCode).toBe(0);
  const savedConfig = readConfigFile(configPath);
  expect(savedConfig.layers.domain.enabled).toBe(true);
});

it('v1ハーネス名を指定した場合、v1ロジックにフォールバックして処理される', async () => {
  // Arrange
  const configPath = writeConfigFile(tmpDir, V2_CONFIG_FIXTURE);
  const handler = createEnableFeatureHandler({ configDir: tmpDir });
  const argv = ['node', 'enable', 'lint'];

  // Act
  const actual = await handler.run(argv);

  // Assert
  expect(actual.exitCode).toBe(0);
  const savedConfig = readConfigFile(configPath);
  expect(savedConfig.harnesses.lint.enabled).toBe(true);
});

it('stderrにv2・v1両方の候補を含むエラーメッセージが出力されexit code 1で終了する', async () => {
  // Arrange
  const configPath = writeConfigFile(tmpDir, V2_CONFIG_FIXTURE);
  const handler = createEnableFeatureHandler({ configDir: tmpDir });
  const argv = ['node', 'enable', 'nonexistent'];

  // Act
  const actual = await handler.run(argv);

  // Assert
  expect(actual.exitCode).toBe(1);
  expect(actual.stderr).toContain('orchestration');  // v2候補が含まれる
  expect(actual.stderr).toContain('domain');          // v1候補が含まれる
});

it('v2機能とv1レイヤー/ハーネスの統合一覧がstdoutに出力される', async () => {
  // Arrange
  const configPath = writeConfigFile(tmpDir, V2_CONFIG_FIXTURE);
  const handler = createEnableFeatureHandler({ configDir: tmpDir });
  const argv = ['node', 'enable', '--list'];

  // Act
  const actual = await handler.run(argv);

  // Assert
  expect(actual.exitCode).toBe(0);
  expect(actual.stdout).toContain('orchestration');
  expect(actual.stdout).toContain('session');
  expect(actual.stdout).toContain('quick_mode');
  // v1のレイヤー/ハーネスも一覧に含まれる
  expect(actual.stdout).toContain('domain');
  expect(actual.stdout).toContain('lint');
});

it('orchestration.parallelizationをドット記法で有効化できる', async () => {
  // Arrange
  const configPath = writeConfigFile(tmpDir, V2_CONFIG_FIXTURE);
  const handler = createEnableFeatureHandler({ configDir: tmpDir });
  const argv = ['node', 'enable', 'orchestration.parallelization'];

  // Act
  const actual = await handler.run(argv);

  // Assert
  expect(actual.exitCode).toBe(0);
  const savedConfig = readConfigFile(configPath);
  expect(savedConfig.orchestration.parallelization.enabled).toBe(true);
  expect(savedConfig.orchestration.enabled).toBe(false); // 親は変更されない
});
```

---

## 6. テストファイル一覧

| # | テストファイルパス | テスト対象 | テスト数（概算） |
|---|----------------|----------|:----------:|
| 1 | `scripts/harness/__tests__/config-foundation/integration/load-config.test.ts` | loadConfigファサード全フロー | 26 |
| 2 | `scripts/harness/__tests__/config-foundation/integration/migration-flow.test.ts` | v1→v2マイグレーション全フロー | 21 |
| 3 | `scripts/harness/__tests__/config-foundation/integration/cli-compatibility.test.ts` | 既存CLI互換性 | 15 |

**合計**: 3ファイル、約62テストケース

---

## 7. 一時ディレクトリ管理ガイドライン

### 7.1 ディレクトリ構造

各テストで作成される一時ディレクトリの構造例:

```
/tmp/config-it-XXXXXX/               # fs.mkdtempSync で生成
├── phasegate.config.json               # テスト用設定ファイル
└── .harness/
    └── backups/
        └── harness.config.1234567890.json  # マイグレーションバックアップ
```

### 7.2 注意事項

- 各テストケースは独立した一時ディレクトリを使用すること（テスト間の干渉防止）
- `afterEach` でのクリーンアップは必須（`fs.rmSync(tmpDir, { recursive: true })`）
- 環境変数を変更するテストでは、テスト前の値を保存し `afterEach` で確実に復元すること
- `loadConfig` のキャッシュ機能をテストする場合、テスト前に `clearConfigCache()` を呼び出すこと

---

## 8. ユニットテストとの責務分担

| 検証観点 | ユニットテスト | インテグレーションテスト |
|---------|:----------:|:------------:|
| 値オブジェクトの生成・バリデーション | ○ | — |
| 集約の不変条件検証 | ○ | — |
| ドメインサービスのロジック | ○ | — |
| UseCaseの処理フロー | ○ | — |
| CLIハンドラの入出力 | ○ | — |
| ファイルI/Oの正確性 | ○（Infrastructure単体） | ○（全体フロー） |
| 層間の結合・DI | — | ○ |
| 環境変数→設定値の反映 | — | ○ |
| マイグレーション前後のファイル整合性 | — | ○ |
| v1/v2 CLI共存 | — | ○ |
| キャッシュ動作 | — | ○ |
