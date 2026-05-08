# ITテストロジック設計: phase2-extensions

@story-id HF2-01
@story-id HF2-02
@story-id HF2-03
> **Unit ID**: phase2-extensions
> **作成日**: 2026-03-20
> **参照**: it_test_design.md, logical_design.md

---

## 1. テストファイル構成

| ファイルパス | 対象 | ケース数 |
|-------------|------|---------|
| `scripts/harness/__tests__/integration/phase2-extensions/check-doc-freshness-usecase.test.ts` | CheckDocFreshnessUseCase | 9 |
| `scripts/harness/__tests__/integration/phase2-extensions/validate-doc-pointers-usecase.test.ts` | ValidateDocPointersUseCase | 6 |
| `scripts/harness/__tests__/integration/phase2-extensions/generate-e2e-template-usecase.test.ts` | GenerateE2ETemplateUseCase | 3 |
| `scripts/harness/__tests__/integration/phase2-extensions/git-log-document-age-adapter.test.ts` | GitLogDocumentAgeAdapter | 3 |
| `scripts/harness/__tests__/integration/phase2-extensions/file-system-document-scanner-adapter.test.ts` | FileSystemDocumentScannerAdapter | 3 |
| `scripts/harness/__tests__/integration/phase2-extensions/regex-pointer-extractor-adapter.test.ts` | RegexPointerExtractorAdapter | 4 |
| `scripts/harness/__tests__/integration/phase2-extensions/file-system-pointer-resolver-adapter.test.ts` | FileSystemPointerResolverAdapter | 3 |
| `scripts/harness/__tests__/integration/phase2-extensions/check-freshness-handler.test.ts` | CheckFreshnessHandler | 4 |
| `scripts/harness/__tests__/integration/phase2-extensions/validate-pointers-handler.test.ts` | ValidatePointersHandler | 3 |
| `scripts/harness/__tests__/integration/phase2-extensions/generate-e2e-template-handler.test.ts` | GenerateE2ETemplateHandler | 3 |
| **合計** | | **41** |

---

## 2. モック戦略

### 2.1 外部ポート（vi.fn()でスタブ化）

| ポート | モック方針 |
|--------|-----------|
| FreshnessConfigPort | `loadRules: vi.fn().mockResolvedValue([...])` / `loadPointerRules: vi.fn().mockResolvedValue([...])` |
| DocumentAgePort | `getAge: vi.fn().mockResolvedValue(DocumentAge.create(...))` |
| DocumentScannerPort | `scan: vi.fn().mockResolvedValue([...])` |
| PointerExtractorPort | `extract: vi.fn().mockResolvedValue([...])` |
| PointerResolverPort | `resolve: vi.fn().mockResolvedValue(true/false)` |

### 2.2 ファイルI/O（実ファイルシステム）

`GitLogDocumentAgeAdapter`, `FileSystemDocumentScannerAdapter`, `RegexPointerExtractorAdapter`, `FileSystemPointerResolverAdapter` は実際のファイルI/Oを伴うため、`os.tmpdir()` 配下の一時ディレクトリを使用する。

```typescript
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

// 各テストファイルの共通セットアップ
const tmpDir = path.join(os.tmpdir(), `phase2-ext-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);

beforeEach(async () => {
  await fs.mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});
```

### 2.3 child_process.execSync のモック（Git log）

```typescript
import * as childProcess from 'child_process';
import { vi } from 'vitest';

vi.spyOn(childProcess, 'execSync').mockReturnValue('2026-03-10 12:00:00 +0900\n');
```

### 2.4 依存注入パターン

```typescript
// UseCase テストの依存注入パターン例
const freshnessConfigPort = {
  loadRules: vi.fn().mockResolvedValue([createDocFreshnessRule()]),
  loadPointerRules: vi.fn().mockResolvedValue([]),
};
const documentScannerPort = { scan: vi.fn().mockResolvedValue(['docs/product/construction/phase2-extensions/logical_design.md']) };
const documentAgePort = { getAge: vi.fn().mockResolvedValue(DocumentAge.create({ ageInDays: 5, source: 'git-log' })) };

const freshnessCheckService = new FreshnessCheckService();
const useCase = new CheckDocFreshnessUseCase(
  freshnessConfigPort,
  documentScannerPort,
  documentAgePort,
  freshnessCheckService,
);
```

---

## 3. CheckDocFreshnessUseCase テスト疑似コード

```typescript
// check-doc-freshness-usecase.test.ts

describe(target(CheckDocFreshnessUseCase), () => {
  let freshnessConfigPort: { loadRules: ReturnType<typeof vi.fn>; loadPointerRules: ReturnType<typeof vi.fn> };
  let documentScannerPort: { scan: ReturnType<typeof vi.fn> };
  let documentAgePort: { getAge: ReturnType<typeof vi.fn> };
  let useCase: CheckDocFreshnessUseCase;

  beforeEach(() => {
    freshnessConfigPort = {
      loadRules: vi.fn().mockResolvedValue([createDocFreshnessRule()]),
      loadPointerRules: vi.fn().mockResolvedValue([]),
    };
    documentScannerPort = { scan: vi.fn().mockResolvedValue(['docs/product/construction/phase2-extensions/logical_design.md']) };
    documentAgePort = { getAge: vi.fn().mockResolvedValue(DocumentAge.create({ ageInDays: 5, source: 'git-log' })) };
    useCase = new CheckDocFreshnessUseCase(freshnessConfigPort, documentScannerPort, documentAgePort, new FreshnessCheckService());
  });

  context('正常系', () => {
    it('ドキュメントが鮮度OK（ageInDays=5, warnThreshold=14）のとき level="ok" が含まれる結果が返る', async () => {
      // Arrange（デフォルトモックはageInDays=5）
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.results).toHaveLength(1);
      expect(actual.results[0].level).toBe('ok');
      expect(actual.summary.ok).toBe(1);
      expect(actual.errors).toHaveLength(0);
    });

    it('ageInDays=20（warnThreshold=14超）のとき level="warn" が返る', async () => {
      // Arrange
      documentAgePort.getAge.mockResolvedValue(DocumentAge.create({ ageInDays: 20, source: 'git-log' }));
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.results[0].level).toBe('warn');
      expect(actual.summary.warn).toBe(1);
    });

    it('ageInDays=60（errorThreshold=30超）のとき level="error" が返る', async () => {
      // Arrange
      documentAgePort.getAge.mockResolvedValue(DocumentAge.create({ ageInDays: 60, source: 'file-mtime' }));
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.results[0].level).toBe('error');
      expect(actual.summary.error).toBe(1);
    });

    it('複数ルール・複数ドキュメントで summary が正確に集計される', async () => {
      // Arrange
      const rule2 = createDocFreshnessRule({ ruleId: 'design-docs', documentPattern: 'docs/design/**/*.md', warnThresholdDays: 30, errorThresholdDays: 90 });
      freshnessConfigPort.loadRules.mockResolvedValue([createDocFreshnessRule(), rule2]);
      documentScannerPort.scan
        .mockResolvedValueOnce(['docs/adr/001.md', 'docs/adr/002.md']) // ルール1
        .mockResolvedValueOnce(['docs/design/arch.md']);               // ルール2
      documentAgePort.getAge
        .mockResolvedValueOnce(DocumentAge.create({ ageInDays: 5, source: 'git-log' }))   // 001.md: ok
        .mockResolvedValueOnce(DocumentAge.create({ ageInDays: 20, source: 'git-log' }))  // 002.md: warn
        .mockResolvedValueOnce(DocumentAge.create({ ageInDays: 60, source: 'git-log' })); // arch.md: warn（warnThreshold=30超）
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.results).toHaveLength(3);
      expect(actual.summary.total).toBe(3);
      expect(actual.summary.ok).toBe(1);
      expect(actual.summary.warn).toBe(2);
    });

    it('source="git-log" のとき result.ageSource="git-log" が含まれる', async () => {
      documentAgePort.getAge.mockResolvedValue(DocumentAge.create({ ageInDays: 5, source: 'git-log' }));
      const actual = await useCase.execute({});
      expect(actual.results[0].ageSource).toBe('git-log');
    });

    it('source="file-mtime" のとき result.ageSource="file-mtime" が含まれる', async () => {
      documentAgePort.getAge.mockResolvedValue(DocumentAge.create({ ageInDays: 5, source: 'file-mtime' }));
      const actual = await useCase.execute({});
      expect(actual.results[0].ageSource).toBe('file-mtime');
    });
  });

  context('異常系', () => {
    it('FreshnessConfigPort が失敗した場合に errors に HarnessError が含まれる', async () => {
      // Arrange
      freshnessConfigPort.loadRules.mockRejectedValue(new Error('config load failed'));
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.errors.length).toBeGreaterThanOrEqual(1);
      expect(actual.results).toHaveLength(0);
    });

    it('DocumentScannerPort が空配列を返す場合に空の results が返る', async () => {
      // Arrange
      documentScannerPort.scan.mockResolvedValue([]);
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.results).toHaveLength(0);
      expect(actual.summary.total).toBe(0);
      expect(actual.errors).toHaveLength(0);
    });
  });

  context('enabled=false ルールのスキップ', () => {
    it('enabled=false のルールに対して DocumentScannerPort が呼び出されない', async () => {
      // Arrange
      freshnessConfigPort.loadRules.mockResolvedValue([createDocFreshnessRule({ enabled: false })]);
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(documentScannerPort.scan).not.toHaveBeenCalled();
      expect(actual.results).toHaveLength(0);
    });
  });
});
```

---

## 4. ValidateDocPointersUseCase テスト疑似コード

```typescript
// validate-doc-pointers-usecase.test.ts

describe(target(ValidateDocPointersUseCase), () => {
  let freshnessConfigPort: { loadRules: ReturnType<typeof vi.fn>; loadPointerRules: ReturnType<typeof vi.fn> };
  let documentScannerPort: { scan: ReturnType<typeof vi.fn> };
  let pointerExtractorPort: { extract: ReturnType<typeof vi.fn> };
  let pointerResolverPort: { resolve: ReturnType<typeof vi.fn> };
  let useCase: ValidateDocPointersUseCase;

  beforeEach(() => {
    freshnessConfigPort = {
      loadRules: vi.fn(),
      loadPointerRules: vi.fn().mockResolvedValue([
        PointerRule.create({ ruleId: 'docs-pointers', documentPattern: 'docs/**/*.md', failOnBroken: true }),
      ]),
    };
    documentScannerPort = { scan: vi.fn().mockResolvedValue(['docs/product/construction/phase2-extensions/logical_design.md']) };
    pointerExtractorPort = { extract: vi.fn().mockResolvedValue([createFilePathPointer()]) };
    pointerResolverPort = { resolve: vi.fn().mockResolvedValue(true) };
    useCase = new ValidateDocPointersUseCase(
      freshnessConfigPort,
      documentScannerPort,
      pointerExtractorPort,
      new PointerResolutionService(pointerResolverPort),
    );
  });

  context('正常系', () => {
    it('全ポインタが実在する場合に passed=true が返る', async () => {
      // Arrange（デフォルトモックは全true）
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.summary.brokenPointers).toBe(0);
      expect(actual.errors).toHaveLength(0);
    });

    it('broken Pointer が1件ある場合に passed=false が返る', async () => {
      // Arrange
      pointerResolverPort.resolve.mockResolvedValue(false);
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.passed).toBe(false);
      expect(actual.summary.brokenPointers).toBe(1);
    });

    it('URL ポインタはスキップされ summary.skippedUrlPointers にカウントされる', async () => {
      // Arrange
      pointerExtractorPort.extract.mockResolvedValue([createUrlPointer()]);
      // Act
      const actual = await useCase.execute({ includeUrlPointers: true });
      // Assert
      expect(actual.summary.skippedUrlPointers).toBe(1);
      expect(actual.passed).toBe(true);
      expect(pointerResolverPort.resolve).not.toHaveBeenCalled();
    });

    it('対象ドキュメントが0件の場合に passed=true・空の results が返る', async () => {
      // Arrange
      documentScannerPort.scan.mockResolvedValue([]);
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.results).toHaveLength(0);
      expect(actual.summary.totalDocuments).toBe(0);
    });
  });

  context('failOnBroken ルールのテスト', () => {
    it('failOnBroken=true のルールで broken Pointer 検出時に passed=false になる', async () => {
      // Arrange（デフォルトルールは failOnBroken=true）
      pointerResolverPort.resolve.mockResolvedValue(false);
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.passed).toBe(false);
    });

    it('failOnBroken=false のルールでは broken Pointer 検出時も passed=true になる', async () => {
      // Arrange
      freshnessConfigPort.loadPointerRules.mockResolvedValue([
        PointerRule.create({ ruleId: 'warn-only', documentPattern: 'docs/**/*.md', failOnBroken: false }),
      ]);
      pointerResolverPort.resolve.mockResolvedValue(false);
      // Act
      const actual = await useCase.execute({});
      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.summary.brokenPointers).toBe(1); // 警告扱い
    });
  });
});
```

---

## 5. GenerateE2ETemplateUseCase テスト疑似コード

```typescript
// generate-e2e-template-usecase.test.ts

describe(target(GenerateE2ETemplateUseCase), () => {
  let useCase: GenerateE2ETemplateUseCase;

  beforeEach(() => {
    useCase = new GenerateE2ETemplateUseCase();
  });

  context('execute()', () => {
    it('targetPhase="wave1" でテンプレートが生成される', async () => {
      // Arrange
      const input: GenerateE2ETemplateInput = { targetPhase: 'wave1' };
      // Act
      const actual = await useCase.execute(input);
      // Assert
      expect(actual.templateContent).toContain('wave1');
      expect(actual.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(actual.errors).toHaveLength(0);
    });

    it('outputPath 指定時に outputPath が OutputDTO に含まれる', async () => {
      // Arrange
      const input: GenerateE2ETemplateInput = { targetPhase: 'phase2', outputPath: 'docs/e2e-strategy.md' };
      // Act
      const actual = await useCase.execute(input);
      // Assert
      expect(actual.outputPath).toBe('docs/e2e-strategy.md');
    });

    it('targetPhase が空文字のとき errors に HarnessError が含まれる', async () => {
      // Arrange
      const input: GenerateE2ETemplateInput = { targetPhase: '' };
      // Act
      const actual = await useCase.execute(input);
      // Assert
      expect(actual.errors.length).toBeGreaterThanOrEqual(1);
    });
  });
});
```

---

## 6. GitLogDocumentAgeAdapter テスト疑似コード

```typescript
// git-log-document-age-adapter.test.ts

describe(target(GitLogDocumentAgeAdapter), () => {
  let adapter: GitLogDocumentAgeAdapter;
  let execSyncSpy: ReturnType<typeof vi.spyOn>;
  let testFilePath: string;

  beforeEach(async () => {
    await fs.mkdir(tmpDir, { recursive: true });
    testFilePath = path.join(tmpDir, 'docs/product/construction/phase2-extensions/logical_design.md');
    await fs.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.writeFile(testFilePath, '# Design');
    execSyncSpy = vi.spyOn(childProcess, 'execSync');
    adapter = new GitLogDocumentAgeAdapter(tmpDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  context('getAge(documentPath)', () => {
    it('git log が有効な日時を返すとき source="git-log" の DocumentAge が返る', async () => {
      // Arrange
      execSyncSpy.mockReturnValue('2026-03-10 12:00:00 +0900\n');
      // Act
      const actual = await adapter.getAge('docs/product/construction/phase2-extensions/logical_design.md');
      // Assert
      expect(actual.source).toBe('git-log');
      expect(actual.ageInDays).toBeGreaterThanOrEqual(9); // 2026-03-20 基準
    });

    it('git log が空文字を返すとき（未コミット）source="file-mtime" にフォールバックする', async () => {
      // Arrange
      execSyncSpy.mockReturnValue('');
      // Act
      const actual = await adapter.getAge('docs/product/construction/phase2-extensions/logical_design.md');
      // Assert
      expect(actual.source).toBe('file-mtime');
    });

    it('execSync がエラーをスローするとき（Git外環境）source="file-mtime" にフォールバックする', async () => {
      // Arrange
      execSyncSpy.mockImplementation(() => { throw new Error('not a git repository'); });
      // Act
      const actual = await adapter.getAge('docs/product/construction/phase2-extensions/logical_design.md');
      // Assert
      expect(actual.source).toBe('file-mtime');
      expect(actual.ageInDays).toBeGreaterThanOrEqual(0);
    });
  });
});
```

---

## 7. FileSystemDocumentScannerAdapter テスト疑似コード

```typescript
// file-system-document-scanner-adapter.test.ts

describe(target(FileSystemDocumentScannerAdapter), () => {
  let adapter: FileSystemDocumentScannerAdapter;

  beforeEach(async () => {
    await fs.mkdir(path.join(tmpDir, 'docs/adr'), { recursive: true });
    adapter = new FileSystemDocumentScannerAdapter(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  context('scan(pattern)', () => {
    it('Glob パターンに一致する 2 件のファイルが返る', async () => {
      // Arrange
      await fs.writeFile(path.join(tmpDir, 'docs/adr/0001.md'), '');
      await fs.writeFile(path.join(tmpDir, 'docs/adr/0002.md'), '');
      // Act
      const actual = await adapter.scan('docs/adr/**/*.md');
      // Assert
      expect(actual).toHaveLength(2);
    });

    it('一致するファイルが 0 件のとき空配列が返る', async () => {
      // Arrange（ファイルなし）
      // Act
      const actual = await adapter.scan('docs/nonexistent/**/*.md');
      // Assert
      expect(actual).toHaveLength(0);
    });

    it('node_modules 内のファイルは結果に含まれない', async () => {
      // Arrange
      await fs.mkdir(path.join(tmpDir, 'node_modules'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'node_modules/readme.md'), '');
      await fs.writeFile(path.join(tmpDir, 'docs/adr/0001.md'), '');
      // Act
      const actual = await adapter.scan('**/*.md');
      // Assert
      expect(actual.every((p) => !p.includes('node_modules'))).toBe(true);
    });
  });
});
```

---

## 8. RegexPointerExtractorAdapter テスト疑似コード

```typescript
// regex-pointer-extractor-adapter.test.ts

describe(target(RegexPointerExtractorAdapter), () => {
  let adapter: RegexPointerExtractorAdapter;
  let testFilePath: string;

  beforeEach(async () => {
    await fs.mkdir(tmpDir, { recursive: true });
    adapter = new RegexPointerExtractorAdapter(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  context('extract(documentPath)', () => {
    it('Markdown リンク [text](path) が file-path ポインタとして抽出される', async () => {
      // Arrange
      testFilePath = path.join(tmpDir, 'test.md');
      await fs.writeFile(testFilePath, '# Title\n\n[設計書](docs/product/construction/phase2-extensions/logical_design.md)\n');
      // Act
      const actual = await adapter.extract('test.md');
      // Assert
      expect(actual.some((p) => p.type === 'file-path' && p.target === 'docs/product/construction/phase2-extensions/logical_design.md')).toBe(true);
    });

    it('URL リンク [text](https://...) が url ポインタとして抽出される', async () => {
      // Arrange
      testFilePath = path.join(tmpDir, 'test.md');
      await fs.writeFile(testFilePath, '[GitHub](https://github.com/)\n');
      // Act
      const actual = await adapter.extract('test.md');
      // Assert
      expect(actual.some((p) => p.type === 'url' && p.target === 'https://github.com/')).toBe(true);
    });

    it('docs/ で始まる相対パス参照が file-path ポインタとして抽出される', async () => {
      // Arrange
      testFilePath = path.join(tmpDir, 'test.md');
      await fs.writeFile(testFilePath, 'docs/product/construction/phase2-extensions/logical_design.md を参照してください\n');
      // Act
      const actual = await adapter.extract('test.md');
      // Assert
      expect(actual.some((p) => p.type === 'file-path' && p.target.includes('docs/product/construction/phase2-extensions/logical_design.md'))).toBe(true);
    });

    it('ポインタ記述のないファイルに対して空配列が返る', async () => {
      // Arrange
      testFilePath = path.join(tmpDir, 'test.md');
      await fs.writeFile(testFilePath, '# Title\n\nNo pointers here.\n');
      // Act
      const actual = await adapter.extract('test.md');
      // Assert
      expect(actual).toHaveLength(0);
    });
  });
});
```

---

## 9. FileSystemPointerResolverAdapter テスト疑似コード

```typescript
// file-system-pointer-resolver-adapter.test.ts

describe(target(FileSystemPointerResolverAdapter), () => {
  let adapter: FileSystemPointerResolverAdapter;

  beforeEach(async () => {
    await fs.mkdir(path.join(tmpDir, 'docs'), { recursive: true });
    adapter = new FileSystemPointerResolverAdapter(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  context('resolve(pointer)', () => {
    it('実在するファイルパスの Pointer に対して true が返る', async () => {
      // Arrange
      await fs.writeFile(path.join(tmpDir, 'docs/product/construction/phase2-extensions/logical_design.md'), '');
      const pointer = createFilePathPointer({ target: 'docs/product/construction/phase2-extensions/logical_design.md' });
      // Act
      const actual = await adapter.resolve(pointer);
      // Assert
      expect(actual).toBe(true);
    });

    it('存在しないファイルパスの Pointer に対して false が返る', async () => {
      // Arrange
      const pointer = createFilePathPointer({ target: 'docs/nonexistent.md' });
      // Act
      const actual = await adapter.resolve(pointer);
      // Assert
      expect(actual).toBe(false);
    });

    it('URL タイプの Pointer に対して常に true が返る（ネットワークアクセスなし）', async () => {
      // Arrange
      const pointer = createUrlPointer({ target: 'https://example.com/nonexistent' });
      // Act
      const actual = await adapter.resolve(pointer);
      // Assert
      expect(actual).toBe(true);
    });
  });
});
```

---

## 10. CheckFreshnessHandler テスト疑似コード

```typescript
// check-freshness-handler.test.ts

describe(target(CheckFreshnessHandler), () => {
  let useCaseMock: { execute: ReturnType<typeof vi.fn> };
  let handler: CheckFreshnessHandler;

  beforeEach(() => {
    useCaseMock = { execute: vi.fn() };
    handler = new CheckFreshnessHandler(useCaseMock as any);
  });

  context('handle(args)', () => {
    it('summary.error=0 のとき exitCode=0 が返る', async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [], summary: { total: 1, ok: 1, warn: 0, error: 0 }, errors: [],
      });
      // Act
      const actual = await handler.handle([]);
      // Assert
      expect(actual.exitCode).toBe(0);
    });

    it('--format=json で stdout 出力が JSON パース可能', async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [{ ruleId: 'adr', documentPath: 'docs/0001.md', ageInDays: 5, ageSource: 'git-log', level: 'ok', message: '' }],
        summary: { total: 1, ok: 1, warn: 0, error: 0 },
        errors: [],
      });
      // Act
      const actual = await handler.handle(['--format', 'json']);
      // Assert
      expect(() => JSON.parse(actual.stdout)).not.toThrow();
    });

    it('--pattern 引数が UseCase の targetPattern に渡される', async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({ results: [], summary: { total: 0, ok: 0, warn: 0, error: 0 }, errors: [] });
      // Act
      await handler.handle(['--pattern', 'docs/adr/**/*.md']);
      // Assert
      expect(useCaseMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({ targetPattern: 'docs/adr/**/*.md' })
      );
    });

    it('summary.error=1 のとき exitCode=1 が返る', async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [{ level: 'error' }],
        summary: { total: 1, ok: 0, warn: 0, error: 1 },
        errors: [],
      });
      // Act
      const actual = await handler.handle([]);
      // Assert
      expect(actual.exitCode).toBe(1);
    });
  });
});
```

---

## 11. ValidatePointersHandler テスト疑似コード

```typescript
// validate-pointers-handler.test.ts

describe(target(ValidatePointersHandler), () => {
  let useCaseMock: { execute: ReturnType<typeof vi.fn> };
  let handler: ValidatePointersHandler;

  beforeEach(() => {
    useCaseMock = { execute: vi.fn() };
    handler = new ValidatePointersHandler(useCaseMock as any);
  });

  context('handle(args)', () => {
    it('passed=true のとき exitCode=0 が返る', async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [], summary: { totalDocuments: 0, totalPointers: 0, brokenPointers: 0, skippedUrlPointers: 0 },
        passed: true, errors: [],
      });
      // Act
      const actual = await handler.handle([]);
      // Assert
      expect(actual.exitCode).toBe(0);
    });

    it('--include-urls が UseCase の includeUrlPointers=true に渡される', async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({ results: [], summary: { totalDocuments: 0, totalPointers: 0, brokenPointers: 0, skippedUrlPointers: 0 }, passed: true, errors: [] });
      // Act
      await handler.handle(['--include-urls']);
      // Assert
      expect(useCaseMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({ includeUrlPointers: true })
      );
    });

    it('passed=false のとき exitCode=1 が返る', async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        results: [{ isResolvable: false }],
        summary: { totalDocuments: 1, totalPointers: 1, brokenPointers: 1, skippedUrlPointers: 0 },
        passed: false, errors: [],
      });
      // Act
      const actual = await handler.handle([]);
      // Assert
      expect(actual.exitCode).toBe(1);
    });
  });
});
```

---

## 12. GenerateE2ETemplateHandler テスト疑似コード

```typescript
// generate-e2e-template-handler.test.ts

describe(target(GenerateE2ETemplateHandler), () => {
  let useCaseMock: { execute: ReturnType<typeof vi.fn> };
  let handler: GenerateE2ETemplateHandler;

  beforeEach(async () => {
    await fs.mkdir(tmpDir, { recursive: true });
    useCaseMock = { execute: vi.fn() };
    handler = new GenerateE2ETemplateHandler(useCaseMock as any);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  context('handle(args)', () => {
    it('--phase=wave1 で正常生成し exitCode=0 が返る', async () => {
      // Arrange
      useCaseMock.execute.mockResolvedValue({
        templateContent: '# E2Eテスト戦略: wave1\n',
        targetPhase: 'wave1',
        generatedAt: '2026-03-20T00:00:00.000Z',
        outputPath: null,
        errors: [],
      });
      // Act
      const actual = await handler.handle(['--phase', 'wave1']);
      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.stdout).toContain('wave1');
    });

    it('--output 指定時にファイルが書き出される', async () => {
      // Arrange
      const outputPath = path.join(tmpDir, 'e2e.md');
      useCaseMock.execute.mockResolvedValue({
        templateContent: '# E2Eテスト戦略: phase2\n',
        targetPhase: 'phase2',
        generatedAt: '2026-03-20T00:00:00.000Z',
        outputPath,
        errors: [],
      });
      // Act
      const actual = await handler.handle(['--phase', 'phase2', '--output', outputPath]);
      // Assert
      expect(actual.exitCode).toBe(0);
      const written = await fs.readFile(outputPath, 'utf8');
      expect(written).toContain('phase2');
    });

    it('--phase を省略すると exitCode=2 が返る', async () => {
      // Arrange / Act
      const actual = await handler.handle([]);
      // Assert
      expect(actual.exitCode).toBe(2);
      expect(useCaseMock.execute).not.toHaveBeenCalled();
    });
  });
});
```
