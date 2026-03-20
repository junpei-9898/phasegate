# 統合テスト設計: biome-toolchain

> **Unit**: biome-toolchain
> **作成日**: 2026-03-11
> **対応ストーリー**: US-036, US-037, US-038, US-039
> **テストフレームワーク**: Vitest 3.0.0
> **テストサイズ**: Medium

---

## 1. テスト対象 x テストレイヤー対応表

| # | テスト対象 | 実装ポート | テストファイル | 外部依存 |
|---|-----------|----------|--------------|---------|
| IT-01 | BiomeCLIExecutor | BiomeExecutor | `tests/infrastructure/biome-cli-executor.test.ts` | Biome CLIプロセス（実プロセス起動） |
| IT-02 | FileSystemReader | FileReader | `tests/infrastructure/file-system-reader.test.ts` | ファイルシステム（実ファイルI/O） |
| IT-03 | JsonBiomeConfigLoader | BiomeConfigLoader | `tests/infrastructure/json-biome-config-loader.test.ts` | ファイルシステム（実biome.json読み込み） |
| IT-04 | パリティ検証 | --- | `tests/parity/parity.test.ts` | Biome CLIプロセス + テストフィクスチャ |

> **注記: unit_test_designからの受け入れ（U-18/U-19）**
> unit_test_design上のU-18（GritQLルール）およびU-19（Rust Plugin）は、Biome CLIプロセス起動やcargo testなど外部プロセス依存を伴うため、テストサイズとしてはMedium（統合テスト）に該当する。これらのテストはunit_test_designに定義を残しつつ、実行時はIT-01（BiomeCLIExecutor）およびIT-04（パリティ検証）のテストスイート内で統合的に検証される。本ITテスト設計では、U-18/U-19のフィクスチャ検証観点をIT-01およびIT-04のテストケースに包含している。

---

## 2. テスト環境方針

### 2.1 一時ディレクトリ戦略

全統合テストで一時ディレクトリを使用し、テスト終了後にクリーンアップする。

```typescript
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// beforeEach: 一時ディレクトリ作成
let tempDir: string;
beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'biome-toolchain-test-'));
});

// afterEach: クリーンアップ
afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});
```

### 2.2 フィクスチャ配置構成

```
packages/biome-toolchain/tests/
├── fixtures/
│   ├── gritql/                           # GritQLルール検証用
│   │   ├── valid/
│   │   │   ├── with-unit-comment.ts      # @unitコメントあり
│   │   │   ├── with-layer-comment.ts     # @layerコメントあり
│   │   │   └── with-both-comments.ts     # 両方あり
│   │   └── invalid/
│   │       ├── no-unit-comment.ts        # @unitコメントなし
│   │       ├── no-layer-comment.ts       # @layerコメントなし
│   │       ├── invalid-layer-name.ts     # 不正なレイヤー名
│   │       └── empty-unit-name.ts        # @unit後に名前なし
│   ├── rust-plugin/                      # Rust Plugin検証用
│   │   ├── valid/
│   │   │   ├── domain/
│   │   │   │   └── model/
│   │   │   │       └── valid-domain.ts   # domain層の正しいファイル
│   │   │   ├── usecase/
│   │   │   │   └── valid-usecase.ts      # usecaseからdomainへのimport
│   │   │   └── infrastructure/
│   │   │       └── valid-infra.ts        # infraからportへのimport
│   │   └── invalid/
│   │       ├── domain/
│   │       │   └── model/
│   │       │       └── violating-domain.ts  # domainからusecaseへのimport
│   │       ├── usecase/
│   │       │   └── bad-filename.ts       # 命名規則違反
│   │       └── infrastructure/
│   │           └── violating-infra.ts    # infraからcontrollerへのimport
│   ├── biome-config/                     # biome.json設定検証用
│   │   ├── valid-biome.json              # 正常な設定
│   │   ├── minimal-biome.json            # 最小構成
│   │   ├── all-rules-disabled.json       # 全ルール無効
│   │   ├── with-anti-patterns.json       # アンチパターン設定あり
│   │   └── invalid-biome.json            # 不正な形式
│   └── parity/                           # パリティ検証用
│       ├── require-unit-comment/
│       │   ├── valid/
│       │   │   └── compliant.ts
│       │   └── invalid/
│       │       ├── non-compliant.ts
│       │       └── expected.json         # v0 ESLint期待結果
│       ├── require-layer-comment/
│       │   ├── valid/
│       │   │   └── compliant.ts
│       │   └── invalid/
│       │       ├── non-compliant.ts
│       │       └── expected.json
│       ├── no-layer-violation/
│       │   ├── valid/
│       │   │   └── compliant.ts
│       │   └── invalid/
│       │       ├── non-compliant.ts
│       │       └── expected.json
│       └── enforce-folder-structure/
│           ├── valid/
│           │   └── compliant.ts
│           └── invalid/
│               ├── non-compliant.ts
│               └── expected.json
```

### 2.3 フィクスチャデータ設計

#### GritQL フィクスチャ

**valid/with-both-comments.ts**:
```typescript
// @unit biome-toolchain
// @layer domain
export class ExampleModel {
  // ...
}
```

**invalid/no-unit-comment.ts**:
```typescript
// @layer domain
export class ExampleModel {
  // ...
}
```

**invalid/invalid-layer-name.ts**:
```typescript
// @unit biome-toolchain
// @layer service
export class ExampleService {
  // ...
}
```

#### Rust Plugin フィクスチャ

**valid/usecase/valid-usecase.ts**:
```typescript
// @unit biome-toolchain
// @layer usecase
import { ExampleModel } from '../domain/model/valid-domain';
export class ExampleUseCase {
  // ...
}
```

**invalid/domain/model/violating-domain.ts**:
```typescript
// @unit biome-toolchain
// @layer domain
import { ExampleUseCase } from '../../usecase/valid-usecase'; // レイヤー違反
export class ViolatingDomain {
  // ...
}
```

#### パリティ検証 期待結果JSON

**parity/require-unit-comment/invalid/expected.json**:
```json
{
  "rule": "require-unit-comment",
  "violations": [
    {
      "file": "non-compliant.ts",
      "line": 1,
      "column": 1,
      "severity": "error",
      "messageContains": "@unit"
    }
  ]
}
```

---

## 3. IT-01: BiomeCLIExecutor

**テストファイル**: `packages/biome-toolchain/tests/infrastructure/biome-cli-executor.test.ts`

**テスト方式**: 実際のBiome CLIプロセスを起動して検証する。テストフィクスチャファイルを一時ディレクトリに配置し、Biome CLIを実行してJSON出力をパースする。

**前提条件**: `@biomejs/biome` がdevDependenciesにインストール済み。`npx biome` が実行可能であること。

### テストケースツリー

```typescript
target('check', () => {
  describe('対象ファイル群に対してBiome checkを実行する', () => {
    context('違反のないファイルに対して実行した場合', () => {
      it('空のviolationsリストを返すこと', () => {});
      it('checkedFilesに対象ファイルが含まれること', () => {});
    });

    context('Biome標準ルール違反があるファイルに対して実行した場合', () => {
      it('違反リストにルール違反が含まれること', () => {});
      it('違反のfilePath, line, columnが正しいこと', () => {});
      it('違反のseverityが正しいこと', () => {});
    });

    context('カスタムルール（GritQL）違反があるファイルに対して実行した場合', () => {
      it('カスタムルール名の違反が返されること', () => {});
    });

    context('複数ファイルに対して実行した場合', () => {
      it('全ファイルの違反が統合されて返されること', () => {});
    });

    context('存在しないファイルパスを指定した場合', () => {
      it('実行エラーが送出されること', () => {});
    });
  });
});

target('checkChanged', () => {
  describe('変更ファイルに対してBiome checkを実行する', () => {
    context('変更ファイルに違反がない場合', () => {
      it('空のviolationsリストを返すこと', () => {});
    });

    context('変更ファイルに違反がある場合', () => {
      it('違反リストにルール違反が含まれること', () => {});
    });
  });
});

target('format', () => {
  describe('フォーマットチェックを実行する', () => {
    context('正しくフォーマットされたファイルの場合', () => {
      it('空のissuesリストを返すこと', () => {});
    });

    context('フォーマット不備のあるファイルの場合', () => {
      it('issuesにフォーマット違反が含まれること', () => {});
    });
  });
});

target('checkAndApply', () => {
  describe('check + formatの統合実行（Hook用）を行う', () => {
    context('違反のないファイルの場合', () => {
      it('空のviolationsリストを返すこと', () => {});
    });

    context('自動修正可能な違反がある場合', () => {
      it('修正後のファイルが書き出されること', () => {});
    });
  });
});

describe('JSON出力パース', () => {
  it('診断結果のファイルパスが値オブジェクトに変換されること', () => {});
  it('診断結果の開始行が行番号に変換されること', () => {});
  it('診断結果のカテゴリがルール名に変換されること', () => {});
  it('診断結果の重要度が違反重要度に変換されること', () => {});
});

describe('エラーハンドリング', () => {
  context('Biome CLIが終了コード2以上で終了した場合', () => {
    it('実行エラーが送出されること', () => {});
  });

  context('Biome CLIのプロセスがタイムアウトした場合', () => {
    it('タイムアウトエラーが送出されること', () => {});
  });

  context('Biome CLIが未インストールの環境の場合', () => {
    it('実行エラーが送出されること', () => {});
  });
});
```

### 代表的AAAパターン（checkメソッド - 違反検出）

```typescript
it('違反リストにルール違反が含まれること', async () => {
  // Arrange
  const executor = new BiomeCLIExecutor();
  const violatingFile = join(tempDir, 'no-unit-comment.ts');
  writeFileSync(violatingFile, '// @layer domain\nexport const x = 1;');
  // テスト用biome.jsonを一時ディレクトリに配置（GritQLルール有効化）
  const biomeConfig = {
    linter: {
      rules: {
        custom: {
          requireUnitComment: {
            level: 'error',
            source: '/* GritQLパターン */',
          },
        },
      },
    },
  };
  writeFileSync(join(tempDir, 'biome.json'), JSON.stringify(biomeConfig, null, 2));

  // Act
  const actual = await executor.check(
    [FilePath.of(violatingFile)],
    [RuleName.of('require-unit-comment')]
  );

  // Assert
  expect(actual.violations).toHaveLength(1);
  expect(actual.violations[0].ruleName.value).toBe('require-unit-comment');
  expect(actual.violations[0].line).toBe(1);
});
```

### 代表的AAAパターン（エラーハンドリング - タイムアウト）

```typescript
it('タイムアウトエラーが送出されること', async () => {
  // Arrange
  const executor = new BiomeCLIExecutor({ timeoutMs: 1 }); // 極小タイムアウト
  const file = join(tempDir, 'large-file.ts');
  // 大きなファイルを生成してタイムアウトを誘発
  writeFileSync(file, 'export const x = 1;\n'.repeat(100000));
  writeFileSync(join(tempDir, 'biome.json'), '{}');

  // Act & Assert
  await expect(
    executor.check([FilePath.of(file)], [RuleName.of('require-unit-comment')])
  ).rejects.toThrow(/タイムアウト|timeout/i);
});
```

---

## 4. IT-02: FileSystemReader

**テストファイル**: `packages/biome-toolchain/tests/infrastructure/file-system-reader.test.ts`

**テスト方式**: `fs.mkdtempSync()` で一時ディレクトリを作成し、テスト用ファイルを配置して実ファイルシステム操作を検証する。

### テストケースツリー

```typescript
target('read', () => {
  describe('ファイル内容を文字列として読み込む', () => {
    context('存在するファイルの場合', () => {
      it('ファイル内容が文字列として返されること', () => {});
    });

    context('UTF-8エンコーディングのファイルの場合', () => {
      it('日本語コメントが正しく読み込まれること', () => {});
    });

    context('存在しないファイルの場合', () => {
      it('ファイル未検出エラーが送出されること', () => {});
    });

    context('空ファイルの場合', () => {
      it('空文字列が返されること', () => {});
    });
  });
});

target('exists', () => {
  describe('ファイルの存在を確認する', () => {
    context('存在するファイルの場合', () => {
      it('trueを返すこと', () => {});
    });

    context('存在しないファイルの場合', () => {
      it('falseを返すこと', () => {});
    });

    context('ディレクトリパスの場合', () => {
      it('falseを返すこと', () => {});
    });
  });
});

target('glob', () => {
  describe('グロブパターンにマッチするファイル一覧を返す', () => {
    context('*.tsパターンの場合', () => {
      it('.tsファイルのみが返されること', () => {});
    });

    context('**/*.tsパターンの場合', () => {
      it('サブディレクトリ含む全.tsファイルが返されること', () => {});
    });

    context('マッチするファイルがない場合', () => {
      it('空の配列が返されること', () => {});
    });

    context('除外パターンを指定した場合', () => {
      it('除外対象が結果に含まれないこと', () => {});
    });
  });
});

target('readPackageJson', () => {
  describe('package.jsonの内容を読み込む', () => {
    context('有効なpackage.jsonが存在する場合', () => {
      it('パースされたオブジェクトが返されること', () => {});
      it('dependenciesが正しく取得できること', () => {});
    });

    context('package.jsonが存在しない場合', () => {
      it('ファイル未検出エラーが送出されること', () => {});
    });

    context('不正なJSONの場合', () => {
      it('パースエラーが送出されること', () => {});
    });
  });
});
```

### 代表的AAAパターン（readメソッド）

```typescript
it('ファイル内容が文字列として返されること', async () => {
  // Arrange
  const reader = new FileSystemReader();
  const filePath = join(tempDir, 'example.ts');
  writeFileSync(filePath, '// @unit biome-toolchain\nexport const x = 1;');

  // Act
  const actual = await reader.read(FilePath.of(filePath));

  // Assert
  expect(actual).toBe('// @unit biome-toolchain\nexport const x = 1;');
});
```

### 代表的AAAパターン（globメソッド）

```typescript
it('サブディレクトリ含む全.tsファイルが返されること', async () => {
  // Arrange
  const reader = new FileSystemReader();
  mkdirSync(join(tempDir, 'src', 'domain'), { recursive: true });
  mkdirSync(join(tempDir, 'src', 'usecase'), { recursive: true });
  writeFileSync(join(tempDir, 'src', 'domain', 'model.ts'), 'export const x = 1;');
  writeFileSync(join(tempDir, 'src', 'usecase', 'example.ts'), 'export const y = 2;');
  writeFileSync(join(tempDir, 'src', 'README.md'), '# README');

  // Act
  const actual = await reader.glob(join(tempDir, '**/*.ts'));

  // Assert
  expect(actual).toHaveLength(2);
  expect(actual.map((f) => f.value)).toContain(join(tempDir, 'src', 'domain', 'model.ts'));
  expect(actual.map((f) => f.value)).toContain(join(tempDir, 'src', 'usecase', 'example.ts'));
});
```

### 代表的AAAパターン（日本語コメント読み込み）

```typescript
it('日本語コメントが正しく読み込まれること', async () => {
  // Arrange
  const reader = new FileSystemReader();
  const filePath = join(tempDir, 'japanese.ts');
  const content = '// @unit biome-toolchain\n// ドメインモデルの定義\nexport class Model {}';
  writeFileSync(filePath, content, 'utf-8');

  // Act
  const actual = await reader.read(FilePath.of(filePath));

  // Assert
  expect(actual).toContain('ドメインモデルの定義');
});
```

---

## 5. IT-03: JsonBiomeConfigLoader

**テストファイル**: `packages/biome-toolchain/tests/infrastructure/json-biome-config-loader.test.ts`

**テスト方式**: 一時ディレクトリにテスト用biome.jsonを作成し、実際のファイル読み込み・パースを検証する。

### テストケースツリー

```typescript
target('load', () => {
  describe('biome.jsonを読み込みパースする', () => {
    context('有効なbiome.jsonの場合', () => {
      it('設定構造が返されること', () => {});
      it('linter設定が含まれること', () => {});
      it('formatter設定が含まれること', () => {});
    });

    context('biome.jsonが存在しない場合', () => {
      it('設定読み込みエラーが送出されること', () => {});
    });

    context('不正なJSON形式の場合', () => {
      it('設定読み込みエラーが送出されること', () => {});
    });

    context('必須フィールドが欠落した場合', () => {
      it('設定読み込みエラーが送出されること', () => {});
    });
  });
});

target('getEnabledRules', () => {
  describe('有効なルール群をBiomeRule集約として返す', () => {
    context('4ルール全て有効な設定の場合', () => {
      it('4つのルールが返されること', () => {});
      it('各ルールの名前が正しいこと', () => {});
      it('各ルールの種別が正しく設定されること', () => {});
    });

    context('一部ルールがlevel: "off"の場合', () => {
      it('有効なルールのみが返されること', () => {});
    });

    context('全ルールが無効の場合', () => {
      it('空の配列が返されること', () => {});
    });

    context('GritQLルールのみ有効の場合', () => {
      it('GritQL系の2ルールが返されること', () => {});
    });

    context('Rust Pluginルールのみ有効の場合', () => {
      it('RustPlugin系の2ルールが返されること', () => {});
    });

    context('カスタムルールセクションが存在しない場合', () => {
      it('空の配列が返されること', () => {});
    });
  });
});

target('getAntiPatternConfig', () => {
  describe('アンチパターン検出設定を返す', () => {
    context('harness.antiPatternsセクションが存在する場合', () => {
      it('4種の検出器設定が含まれること', () => {});
      it('各検出器の閾値が正しく読み込まれること', () => {});
    });

    context('harness.antiPatternsセクションが存在しない場合', () => {
      it('デフォルト設定が返されること', () => {});
    });

    context('一部の検出器が無効の場合', () => {
      it('有効な検出器のみが含まれること', () => {});
    });
  });
});
```

### 代表的AAAパターン（getEnabledRules - 全ルール有効）

```typescript
it('4つのルールが返されること', async () => {
  // Arrange
  const biomeJson = {
    linter: {
      rules: {
        custom: {
          requireUnitComment: {
            level: 'error',
            source: 'gritql pattern',
          },
          requireLayerComment: {
            level: 'error',
            source: 'gritql pattern',
          },
        },
        plugin: {
          noLayerViolation: {
            level: 'error',
            options: {},
          },
          enforceFolderStructure: {
            level: 'error',
            options: {},
          },
        },
      },
    },
    plugins: [
      './biome-plugins/dist/no-layer-violation.wasm',
      './biome-plugins/dist/enforce-folder-structure.wasm',
    ],
  };
  writeFileSync(join(tempDir, 'biome.json'), JSON.stringify(biomeJson, null, 2));
  const loader = new JsonBiomeConfigLoader(tempDir);

  // Act
  const actual = await loader.getEnabledRules();

  // Assert
  expect(actual).toHaveLength(4);
  const ruleNames = actual.map((r) => r.ruleName.value).sort();
  expect(ruleNames).toEqual([
    'enforce-folder-structure',
    'no-layer-violation',
    'require-layer-comment',
    'require-unit-comment',
  ]);
});
```

### 代表的AAAパターン（load - biome.json不存在）

```typescript
it('設定読み込みエラーが送出されること', async () => {
  // Arrange
  const loader = new JsonBiomeConfigLoader(join(tempDir, 'nonexistent'));

  // Act & Assert
  await expect(loader.load()).rejects.toThrow(/設定.*読み込み|config.*load/i);
});
```

### 代表的AAAパターン（getAntiPatternConfig）

```typescript
it('各検出器の閾値が正しく読み込まれること', async () => {
  // Arrange
  const biomeJson = {
    linter: { rules: {} },
    harness: {
      antiPatterns: {
        anyTypeAbuse: { enabled: true, threshold: 3 },
        commentFlood: { enabled: true, threshold: 0.5 },
        codeDuplication: { enabled: true, threshold: 0.9 },
        ghostFile: { enabled: true, threshold: 1 },
      },
    },
  };
  writeFileSync(join(tempDir, 'biome.json'), JSON.stringify(biomeJson, null, 2));
  const loader = new JsonBiomeConfigLoader(tempDir);

  // Act
  const actual = await loader.getAntiPatternConfig();

  // Assert
  expect(actual.detectors).toHaveLength(4);
  const anyTypeAbuse = actual.detectors.find(
    (d) => d.detectorType === AntiPatternType.AnyTypeAbuse
  );
  expect(anyTypeAbuse?.threshold).toBe(3);
});
```

---

## 6. IT-04: パリティ検証

**テストファイル**: `packages/biome-toolchain/tests/parity/parity.test.ts`

**テスト方式**: テストフィクスチャ（v0 ESLint期待結果付きソースファイル）に対してBiome CLIを実行し、v0期待結果とBiome結果を突き合わせて機能的等価性を検証する。

**前提条件**:
- `@biomejs/biome` がインストール済み
- Biomeプラグイン（GritQL + WASM）がビルド済み
- テストフィクスチャが `tests/fixtures/parity/` に配置済み

### パリティ検証方針

| 検証項目 | 判定基準 |
|---------|---------|
| 違反検出有無 | v0で違反ありの場合、Biomeでも違反が検出されること |
| 違反検出位置（行番号） | 同一行で検出されること（列番号は許容差あり） |
| 違反のseverity | 同一であること |
| 違反メッセージ | 主要部分が含まれること（完全一致は不要） |
| 正常ケースの偽陽性 | v0で違反なしの場合、Biomeでも違反なしであること |

### テストケースツリー

```typescript
describe('require-unit-comment パリティ検証', () => {
  target('require-unit-comment', () => {
    describe('v0 ESLintルールとBiomeルールで等価な結果を返す', () => {
      context('@unitコメントがあるファイルの場合', () => {
        it('v0と同様に違反が検出されないこと', () => {});
      });

      context('@unitコメントがないファイルの場合', () => {
        it('v0と同様に違反が検出されること', () => {});
        it('v0と同一の行番号で違反が報告されること', () => {});
        it('v0と同一のseverityであること', () => {});
      });
    });
  });
});

describe('require-layer-comment パリティ検証', () => {
  target('require-layer-comment', () => {
    describe('v0 ESLintルールとBiomeルールで等価な結果を返す', () => {
      context('@layerコメントがあるファイルの場合', () => {
        it('v0と同様に違反が検出されないこと', () => {});
      });

      context('@layerコメントがないファイルの場合', () => {
        it('v0と同様に違反が検出されること', () => {});
        it('v0と同一の行番号で違反が報告されること', () => {});
      });

      context('不正なレイヤー名の場合', () => {
        it('v0と同様に違反が検出されること', () => {});
      });
    });
  });
});

describe('no-layer-violation パリティ検証', () => {
  target('no-layer-violation', () => {
    describe('v0 ESLintルールとBiomeルールで等価な結果を返す', () => {
      context('レイヤー違反がないファイルの場合', () => {
        it('v0と同様に違反が検出されないこと', () => {});
      });

      context('domainからusecaseへのimportがある場合', () => {
        it('v0と同様にレイヤー違反が検出されること', () => {});
        it('v0と同一の行番号で違反が報告されること', () => {});
      });

      context('infrastructureからcontrollerへのimportがある場合', () => {
        it('v0と同様にレイヤー違反が検出されること', () => {});
      });
    });
  });
});

describe('enforce-folder-structure パリティ検証', () => {
  target('enforce-folder-structure', () => {
    describe('v0 ESLintルールとBiomeルールで等価な結果を返す', () => {
      context('正しいフォルダ構造のファイルの場合', () => {
        it('v0と同様に違反が検出されないこと', () => {});
      });

      context('不正なフォルダ構造のファイルの場合', () => {
        it('v0と同様にフォルダ構造違反が検出されること', () => {});
      });
    });
  });
});
```

### 代表的AAAパターン（パリティ検証 - require-unit-comment）

```typescript
it('v0と同様に違反が検出されること', async () => {
  // Arrange
  const fixtureDir = join(__dirname, '..', 'fixtures', 'parity', 'require-unit-comment', 'invalid');
  const expectedPath = join(fixtureDir, 'expected.json');
  const expected = JSON.parse(readFileSync(expectedPath, 'utf-8'));
  const executor = new BiomeCLIExecutor();

  // Act
  const actual = await executor.check(
    [FilePath.of(join(fixtureDir, 'non-compliant.ts'))],
    [RuleName.of('require-unit-comment')]
  );

  // Assert
  // 違反が検出されること
  expect(actual.violations.length).toBeGreaterThan(0);
  // v0期待結果と同一の行番号
  const v0Violation = expected.violations[0];
  const biomeViolation = actual.violations[0];
  expect(biomeViolation.line).toBe(v0Violation.line);
  // severity一致
  expect(biomeViolation.severity.value).toBe(v0Violation.severity);
  // メッセージの主要部分が含まれること
  expect(biomeViolation.message).toContain(v0Violation.messageContains);
});
```

### 代表的AAAパターン（パリティ検証 - 偽陽性なし）

```typescript
it('v0と同様に違反が検出されないこと', async () => {
  // Arrange
  const fixtureDir = join(__dirname, '..', 'fixtures', 'parity', 'require-unit-comment', 'valid');
  const executor = new BiomeCLIExecutor();

  // Act
  const actual = await executor.check(
    [FilePath.of(join(fixtureDir, 'compliant.ts'))],
    [RuleName.of('require-unit-comment')]
  );

  // Assert
  expect(actual.violations).toHaveLength(0);
});
```

---

## 7. テスト実行環境要件

### 7.1 依存パッケージ

| パッケージ | バージョン | 用途 |
|-----------|---------|------|
| vitest | ^3.0.0 | テストランナー |
| @biomejs/biome | ^1.5.0 | Biome CLI（IT-01, IT-04で使用） |
| fast-glob | ^3.3.0 | FileSystemReaderのglob実装依存 |

### 7.2 システム要件

| 要件 | 用途 |
|------|------|
| Node.js 20+ | テストランナー実行 |
| Rust 1.70.0+ | Rust Pluginテスト（`cargo test`） |
| wasm32-unknown-unknown target | WASMビルド（IT-04のパリティ検証前提） |

### 7.3 テスト実行コマンド

```bash
# 統合テスト全体
npx vitest run tests/infrastructure/ tests/parity/

# 個別実行
npx vitest run tests/infrastructure/biome-cli-executor.test.ts
npx vitest run tests/infrastructure/file-system-reader.test.ts
npx vitest run tests/infrastructure/json-biome-config-loader.test.ts
npx vitest run tests/parity/parity.test.ts

# Rust Pluginネイティブテスト
cd packages/biome-toolchain/biome-plugins/rust && cargo test
```

---

## 8. テスト全体サマリー

| テストID | テスト対象 | 推定テストケース数 | 外部依存 |
|---------|-----------|:---------------:|---------|
| IT-01 | BiomeCLIExecutor | 19 | Biome CLIプロセス |
| IT-02 | FileSystemReader | 15 | ファイルシステム |
| IT-03 | JsonBiomeConfigLoader | 14 | ファイルシステム |
| IT-04 | パリティ検証 | 14 | Biome CLI + フィクスチャ |
| **合計** | | **62** | |
