# ユニットテストロジック設計: phase2-extensions

> **Unit ID**: phase2-extensions
> **作成日**: 2026-03-20
> **参照**: unit_test_design.md, domain_model.md

---

## 1. テストファイル構成

| ファイルパス | 対象 | ケース数 |
|-------------|------|---------|
| `scripts/harness/__tests__/unit/phase2-extensions/value-objects/freshness-threshold.test.ts` | FreshnessThreshold VO | 9 |
| `scripts/harness/__tests__/unit/phase2-extensions/value-objects/document-age.test.ts` | DocumentAge VO | 9 |
| `scripts/harness/__tests__/unit/phase2-extensions/value-objects/pointer.test.ts` | Pointer VO | 7 |
| `scripts/harness/__tests__/unit/phase2-extensions/value-objects/pointer-validation-result.test.ts` | PointerValidationResult VO | 5 |
| `scripts/harness/__tests__/unit/phase2-extensions/value-objects/e2e-strategy-template.test.ts` | E2EStrategyTemplate VO | 6 |
| `scripts/harness/__tests__/unit/phase2-extensions/aggregates/doc-freshness-rule.test.ts` | DocFreshnessRule集約ルート | 9 |
| `scripts/harness/__tests__/unit/phase2-extensions/aggregates/pointer-rule.test.ts` | PointerRule集約ルート | 5 |
| `scripts/harness/__tests__/unit/phase2-extensions/services/freshness-check-service.test.ts` | FreshnessCheckServiceドメインサービス | 9 |
| `scripts/harness/__tests__/unit/phase2-extensions/services/pointer-resolution-service.test.ts` | PointerResolutionServiceドメインサービス | 6 |
| **合計** | | **65** |

---

## 2. 共通ヘルパー・ファクトリ

```typescript
// インポートパターン（全テストファイル共通）
import { target, context } from '../../../../helpers/test-helpers.js';
import { describe, it, vi, expect, beforeEach } from 'vitest';
```

### 2.1 値オブジェクト用ファクトリ

```typescript
// FreshnessThreshold ファクトリ
export const createFreshnessThreshold = (overrides: Partial<{
  warnThresholdDays: number;
  errorThresholdDays: number;
}> = {}): FreshnessThreshold =>
  FreshnessThreshold.create({
    warnThresholdDays: 14,
    errorThresholdDays: 30,
    ...overrides,
  });

// DocumentAge ファクトリ
export const createDocumentAge = (overrides: Partial<{
  ageInDays: number;
  source: 'git-log' | 'file-mtime';
}> = {}): DocumentAge =>
  DocumentAge.create({
    ageInDays: 5,
    source: 'git-log',
    ...overrides,
  });

// Pointer ファクトリ（file-path）
export const createFilePathPointer = (overrides: Partial<{
  rawText: string;
  target: string;
}> = {}): Pointer =>
  Pointer.create({
    type: 'file-path',
    rawText: '[設計書](docs/design.md)',
    target: 'docs/design.md',
    ...overrides,
  });

// Pointer ファクトリ（url）
export const createUrlPointer = (overrides: Partial<{
  rawText: string;
  target: string;
}> = {}): Pointer =>
  Pointer.create({
    type: 'url',
    rawText: '[GitHub](https://github.com/)',
    target: 'https://github.com/',
    ...overrides,
  });

// DocFreshnessRule ファクトリ
export const createDocFreshnessRule = (overrides: Partial<{
  ruleId: string;
  documentPattern: string;
  warnThresholdDays: number;
  errorThresholdDays: number;
  enabled: boolean;
}> = {}): DocFreshnessRule =>
  DocFreshnessRule.create({
    ruleId: 'adr-docs',
    documentPattern: 'docs/adr/**/*.md',
    threshold: createFreshnessThreshold({
      warnThresholdDays: overrides.warnThresholdDays ?? 14,
      errorThresholdDays: overrides.errorThresholdDays ?? 30,
    }),
    enabled: overrides.enabled ?? true,
    ...overrides,
  });
```

---

## 3. FreshnessThreshold テスト疑似コード

```typescript
// freshness-threshold.test.ts

describe(target(FreshnessThreshold), () => {
  context('create()', () => {
    it('warnThresholdDays=14, errorThresholdDays=30 で正常に生成される', () => {
      // Arrange
      const input = { warnThresholdDays: 14, errorThresholdDays: 30 };
      // Act
      const actual = FreshnessThreshold.create(input);
      // Assert
      expect(actual.warnThresholdDays).toBe(14);
      expect(actual.errorThresholdDays).toBe(30);
    });

    it('warnThresholdDays=0 のとき Phase2ExtensionsDomainError をスロー（INV-3）', () => {
      // Arrange / Act / Assert
      expect(() => FreshnessThreshold.create({ warnThresholdDays: 0, errorThresholdDays: 30 }))
        .toThrow(Phase2ExtensionsDomainError);
    });

    it('warnThresholdDays=-1 の負値は Phase2ExtensionsDomainError をスロー（INV-3）', () => {
      expect(() => FreshnessThreshold.create({ warnThresholdDays: -1, errorThresholdDays: 30 }))
        .toThrow(Phase2ExtensionsDomainError);
    });

    it('errorThresholdDays=warnThresholdDays（同値）は Phase2ExtensionsDomainError をスロー（INV-4）', () => {
      expect(() => FreshnessThreshold.create({ warnThresholdDays: 30, errorThresholdDays: 30 }))
        .toThrow(Phase2ExtensionsDomainError);
    });

    it('errorThresholdDays < warnThresholdDays は Phase2ExtensionsDomainError をスロー（INV-4）', () => {
      expect(() => FreshnessThreshold.create({ warnThresholdDays: 30, errorThresholdDays: 29 }))
        .toThrow(Phase2ExtensionsDomainError);
    });
  });

  context('equals()', () => {
    it('同一フィールドを持つ2つのインスタンスは等値である', () => {
      // Arrange
      const a = createFreshnessThreshold();
      const b = createFreshnessThreshold();
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(true);
    });

    it('errorThresholdDays が異なる場合は非等値である', () => {
      // Arrange
      const a = createFreshnessThreshold({ errorThresholdDays: 30 });
      const b = createFreshnessThreshold({ errorThresholdDays: 60 });
      // Act
      const actual = a.equals(b);
      // Assert
      expect(actual).toBe(false);
    });
  });
});
```

---

## 4. DocumentAge テスト疑似コード

```typescript
// document-age.test.ts

describe(target(DocumentAge), () => {
  context('create()', () => {
    it('ageInDays=0, source="git-log" で正常に生成される', () => {
      // Arrange
      const input = { ageInDays: 0, source: 'git-log' as const };
      // Act
      const actual = DocumentAge.create(input);
      // Assert
      expect(actual.ageInDays).toBe(0);
      expect(actual.source).toBe('git-log');
    });

    it('ageInDays=-1 は Phase2ExtensionsDomainError をスロー（INV-5）', () => {
      expect(() => DocumentAge.create({ ageInDays: -1, source: 'git-log' }))
        .toThrow(Phase2ExtensionsDomainError);
    });

    it('source="unknown" の不正値は Phase2ExtensionsDomainError をスロー', () => {
      expect(() => DocumentAge.create({ ageInDays: 5, source: 'unknown' as any }))
        .toThrow(Phase2ExtensionsDomainError);
    });
  });

  context('isOlderThan(days)', () => {
    it('ageInDays=20, threshold=14 のとき true を返す', () => {
      // Arrange
      const actual_vo = createDocumentAge({ ageInDays: 20 });
      // Act
      const actual = actual_vo.isOlderThan(14);
      // Assert
      expect(actual).toBe(true);
    });

    it('ageInDays=10, threshold=14 のとき false を返す', () => {
      const actual_vo = createDocumentAge({ ageInDays: 10 });
      expect(actual_vo.isOlderThan(14)).toBe(false);
    });

    it('ageInDays=14, threshold=14 のとき true を返す（境界値: >=threshold）', () => {
      const actual_vo = createDocumentAge({ ageInDays: 14 });
      expect(actual_vo.isOlderThan(14)).toBe(true);
    });
  });

  context('equals()', () => {
    it('同一フィールドを持つ2つのインスタンスは等値である', () => {
      const a = createDocumentAge();
      const b = createDocumentAge();
      expect(a.equals(b)).toBe(true);
    });

    it('source のみ異なる場合は非等値である', () => {
      const a = createDocumentAge({ source: 'git-log' });
      const b = createDocumentAge({ source: 'file-mtime' });
      expect(a.equals(b)).toBe(false);
    });
  });
});
```

---

## 5. Pointer テスト疑似コード

```typescript
// pointer.test.ts

describe(target(Pointer), () => {
  context('create() [file-path]', () => {
    it('type="file-path" で正常に生成される', () => {
      // Arrange
      const input = { type: 'file-path' as const, rawText: '[設計](docs/design.md)', target: 'docs/design.md' };
      // Act
      const actual = Pointer.create(input);
      // Assert
      expect(actual.type).toBe('file-path');
      expect(actual.target).toBe('docs/design.md');
    });

    it('rawText が空文字のとき Phase2ExtensionsDomainError をスロー（INV-8）', () => {
      expect(() => Pointer.create({ type: 'file-path', rawText: '', target: 'docs/design.md' }))
        .toThrow(Phase2ExtensionsDomainError);
    });

    it('target が空文字のとき Phase2ExtensionsDomainError をスロー（INV-9）', () => {
      expect(() => Pointer.create({ type: 'file-path', rawText: '[設計]()', target: '' }))
        .toThrow(Phase2ExtensionsDomainError);
    });
  });

  context('isFilePath() / isUrl()', () => {
    it('file-path ポインタに対して isFilePath() は true を返す', () => {
      const actual = createFilePathPointer().isFilePath();
      expect(actual).toBe(true);
    });

    it('file-path ポインタに対して isUrl() は false を返す', () => {
      const actual = createFilePathPointer().isUrl();
      expect(actual).toBe(false);
    });

    it('url ポインタに対して isUrl() は true を返す', () => {
      const actual = createUrlPointer().isUrl();
      expect(actual).toBe(true);
    });
  });
});
```

---

## 6. PointerValidationResult テスト疑似コード

```typescript
// pointer-validation-result.test.ts

describe(target(PointerValidationResult), () => {
  context('resolved() ファクトリメソッド', () => {
    it('isResolvable=true, errorMessage=null のインスタンスが生成される', () => {
      // Arrange
      const pointer = createFilePathPointer();
      // Act
      const actual = PointerValidationResult.resolved(pointer, 'docs/design.md');
      // Assert
      expect(actual.isResolvable).toBe(true);
      expect(actual.errorMessage).toBeNull();
      expect(actual.resolvedPath).toBe('docs/design.md');
    });
  });

  context('broken() ファクトリメソッド', () => {
    it('isResolvable=false, resolvedPath=null のインスタンスが生成される', () => {
      // Arrange
      const pointer = createFilePathPointer();
      // Act
      const actual = PointerValidationResult.broken(pointer, 'File not found: docs/missing.md');
      // Assert
      expect(actual.isResolvable).toBe(false);
      expect(actual.resolvedPath).toBeNull();
      expect(actual.errorMessage).toContain('docs/missing.md');
    });
  });

  context('skipped() ファクトリメソッド', () => {
    it('URLスキップ時に isResolvable=true のインスタンスが生成される', () => {
      // Arrange
      const pointer = createUrlPointer();
      // Act
      const actual = PointerValidationResult.skipped(pointer);
      // Assert
      expect(actual.isResolvable).toBe(true);
      expect(actual.errorMessage).toBeNull();
    });
  });
});
```

---

## 7. E2EStrategyTemplate テスト疑似コード

```typescript
// e2e-strategy-template.test.ts

describe(target(E2EStrategyTemplate), () => {
  context('create(targetPhase)', () => {
    it('targetPhase="wave1" で正常に生成される', () => {
      // Arrange / Act
      const actual = E2EStrategyTemplate.create('wave1');
      // Assert
      expect(actual.targetPhase).toBe('wave1');
      expect(actual.templateContent.length).toBeGreaterThan(0);
    });

    it('targetPhase が空文字のとき Phase2ExtensionsDomainError をスロー（INV-11）', () => {
      expect(() => E2EStrategyTemplate.create('')).toThrow(Phase2ExtensionsDomainError);
    });

    it('templateContent に targetPhase の文字列が含まれる', () => {
      // Arrange / Act
      const actual = E2EStrategyTemplate.create('wave1');
      // Assert
      expect(actual.templateContent).toContain('wave1');
    });

    it('templateContent に Markdown 見出しが含まれる', () => {
      const actual = E2EStrategyTemplate.create('wave1');
      expect(actual.templateContent).toMatch(/^#\s/m);
    });

    it('generatedAt が ISO 8601 形式の文字列である', () => {
      const actual = E2EStrategyTemplate.create('wave1');
      expect(() => new Date(actual.generatedAt)).not.toThrow();
      expect(actual.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
```

---

## 8. DocFreshnessRule テスト疑似コード

```typescript
// doc-freshness-rule.test.ts

describe(target(DocFreshnessRule), () => {
  context('create()', () => {
    it('有効な引数で正常に生成される', () => {
      // Arrange
      const input = {
        ruleId: 'adr-docs',
        documentPattern: 'docs/adr/**/*.md',
        threshold: createFreshnessThreshold(),
        enabled: true,
      };
      // Act
      const actual = DocFreshnessRule.create(input);
      // Assert
      expect(actual.ruleId).toBe('adr-docs');
      expect(actual.isEnabled()).toBe(true);
    });

    it('ruleId が空文字のとき Phase2ExtensionsDomainError をスロー（INV-1）', () => {
      expect(() => createDocFreshnessRule({ ruleId: '' })).toThrow(Phase2ExtensionsDomainError);
    });

    it('documentPattern が空文字のとき Phase2ExtensionsDomainError をスロー（INV-2）', () => {
      expect(() => createDocFreshnessRule({ documentPattern: '' })).toThrow(Phase2ExtensionsDomainError);
    });

    it('warn=error の同値閾値は Phase2ExtensionsDomainError をスロー（INV-4）', () => {
      expect(() => createDocFreshnessRule({ warnThresholdDays: 30, errorThresholdDays: 30 }))
        .toThrow(Phase2ExtensionsDomainError);
    });
  });

  context('isEnabled()', () => {
    it('enabled=false で生成した場合は false を返す', () => {
      const actual = createDocFreshnessRule({ enabled: false }).isEnabled();
      expect(actual).toBe(false);
    });

    it('enabled=true で生成した場合は true を返す', () => {
      const actual = createDocFreshnessRule({ enabled: true }).isEnabled();
      expect(actual).toBe(true);
    });
  });

  context('matchesDocument(documentPath)', () => {
    it('documentPattern に一致するパスに対して true を返す', () => {
      // Arrange
      const rule = createDocFreshnessRule({ documentPattern: 'docs/adr/**/*.md' });
      // Act
      const actual = rule.matchesDocument('docs/adr/0001-test.md');
      // Assert
      expect(actual).toBe(true);
    });

    it('documentPattern に一致しないパスに対して false を返す', () => {
      const rule = createDocFreshnessRule({ documentPattern: 'docs/adr/**/*.md' });
      const actual = rule.matchesDocument('docs/product/design.md');
      expect(actual).toBe(false);
    });
  });
});
```

---

## 9. PointerRule テスト疑似コード

```typescript
// pointer-rule.test.ts

describe(target(PointerRule), () => {
  context('create()', () => {
    it('有効な引数で正常に生成される', () => {
      // Arrange / Act
      const actual = PointerRule.create({
        ruleId: 'docs-pointers',
        documentPattern: 'docs/**/*.md',
        failOnBroken: true,
      });
      // Assert
      expect(actual.ruleId).toBe('docs-pointers');
    });

    it('ruleId が空文字のとき Phase2ExtensionsDomainError をスロー（INV-6）', () => {
      expect(() => PointerRule.create({ ruleId: '', documentPattern: 'docs/**/*.md', failOnBroken: true }))
        .toThrow(Phase2ExtensionsDomainError);
    });

    it('documentPattern が空文字のとき Phase2ExtensionsDomainError をスロー（INV-7）', () => {
      expect(() => PointerRule.create({ ruleId: 'docs-pointers', documentPattern: '', failOnBroken: true }))
        .toThrow(Phase2ExtensionsDomainError);
    });
  });

  context('shouldFailOnBroken()', () => {
    it('failOnBroken=true のとき true を返す', () => {
      const actual = PointerRule.create({ ruleId: 'r', documentPattern: 'docs/**/*.md', failOnBroken: true })
        .shouldFailOnBroken();
      expect(actual).toBe(true);
    });

    it('failOnBroken=false のとき false を返す', () => {
      const actual = PointerRule.create({ ruleId: 'r', documentPattern: 'docs/**/*.md', failOnBroken: false })
        .shouldFailOnBroken();
      expect(actual).toBe(false);
    });
  });
});
```

---

## 10. FreshnessCheckService テスト疑似コード

```typescript
// freshness-check-service.test.ts

describe(target(FreshnessCheckService), () => {
  let service: FreshnessCheckService;

  beforeEach(() => {
    service = new FreshnessCheckService();
  });

  context('check(rule, documentAge) - level 判定', () => {
    it('ageInDays=5（warnThreshold=14未満）のとき level="ok" を返す', () => {
      // Arrange
      const rule = createDocFreshnessRule({ warnThresholdDays: 14, errorThresholdDays: 30 });
      const documentAge = createDocumentAge({ ageInDays: 5 });
      // Act
      const actual = service.check(rule, documentAge, 'docs/design.md');
      // Assert
      expect(actual.level).toBe('ok');
    });

    it('ageInDays=14（warnThreshold境界値）のとき level="warn" を返す', () => {
      // Arrange
      const rule = createDocFreshnessRule({ warnThresholdDays: 14, errorThresholdDays: 30 });
      const documentAge = createDocumentAge({ ageInDays: 14 });
      // Act
      const actual = service.check(rule, documentAge, 'docs/design.md');
      // Assert
      expect(actual.level).toBe('warn');
    });

    it('ageInDays=20（warn〜error間）のとき level="warn" を返す', () => {
      const rule = createDocFreshnessRule({ warnThresholdDays: 14, errorThresholdDays: 30 });
      const documentAge = createDocumentAge({ ageInDays: 20 });
      const actual = service.check(rule, documentAge, 'docs/design.md');
      expect(actual.level).toBe('warn');
    });

    it('ageInDays=30（errorThreshold境界値）のとき level="error" を返す', () => {
      const rule = createDocFreshnessRule({ warnThresholdDays: 14, errorThresholdDays: 30 });
      const documentAge = createDocumentAge({ ageInDays: 30 });
      const actual = service.check(rule, documentAge, 'docs/design.md');
      expect(actual.level).toBe('error');
    });

    it('ageInDays=100（errorThreshold超過）のとき level="error" を返す', () => {
      const rule = createDocFreshnessRule({ warnThresholdDays: 14, errorThresholdDays: 30 });
      const documentAge = createDocumentAge({ ageInDays: 100 });
      const actual = service.check(rule, documentAge, 'docs/design.md');
      expect(actual.level).toBe('error');
    });

    it('ageInDays=13（warnThreshold-1: 境界値未満）のとき level="ok" を返す', () => {
      const rule = createDocFreshnessRule({ warnThresholdDays: 14, errorThresholdDays: 30 });
      const documentAge = createDocumentAge({ ageInDays: 13 });
      const actual = service.check(rule, documentAge, 'docs/design.md');
      expect(actual.level).toBe('ok');
    });
  });

  context('check() - メタデータ', () => {
    it('ruleId と ageSource が結果に含まれる（source="git-log"）', () => {
      // Arrange
      const rule = createDocFreshnessRule({ ruleId: 'adr-docs' });
      const documentAge = createDocumentAge({ ageInDays: 5, source: 'git-log' });
      // Act
      const actual = service.check(rule, documentAge, 'docs/adr/0001.md');
      // Assert
      expect(actual.ruleId).toBe('adr-docs');
      expect(actual.ageSource).toBe('git-log');
    });

    it('source="file-mtime" のとき ageSource="file-mtime" が含まれる', () => {
      const rule = createDocFreshnessRule();
      const documentAge = createDocumentAge({ source: 'file-mtime' });
      const actual = service.check(rule, documentAge, 'docs/design.md');
      expect(actual.ageSource).toBe('file-mtime');
    });
  });

  context('enabled=false ルールのスキップ', () => {
    it('enabled=false のルールに対して level="ok" を返す（チェックスキップ）', () => {
      // Arrange
      const rule = createDocFreshnessRule({ enabled: false, errorThresholdDays: 30 });
      const documentAge = createDocumentAge({ ageInDays: 365 }); // 非常に古い
      // Act
      const actual = service.check(rule, documentAge, 'docs/design.md');
      // Assert
      expect(actual.level).toBe('ok');
    });
  });
});
```

---

## 11. PointerResolutionService テスト疑似コード

```typescript
// pointer-resolution-service.test.ts

describe(target(PointerResolutionService), () => {
  let resolverPort: { resolve: ReturnType<typeof vi.fn> };
  let service: PointerResolutionService;

  beforeEach(() => {
    resolverPort = { resolve: vi.fn() };
    service = new PointerResolutionService(resolverPort);
  });

  context('resolve(pointers)', () => {
    it('実在するfile-pathポインタに対して isResolvable=true の結果が返る', async () => {
      // Arrange
      resolverPort.resolve.mockResolvedValue(true);
      const pointers = [createFilePathPointer({ target: 'docs/design.md' })];
      // Act
      const actual = await service.resolve(pointers);
      // Assert
      expect(actual).toHaveLength(1);
      expect(actual[0].isResolvable).toBe(true);
    });

    it('存在しないfile-pathポインタに対して isResolvable=false の結果が返る', async () => {
      // Arrange
      resolverPort.resolve.mockResolvedValue(false);
      const pointers = [createFilePathPointer({ target: 'docs/missing.md' })];
      // Act
      const actual = await service.resolve(pointers);
      // Assert
      expect(actual[0].isResolvable).toBe(false);
      expect(actual[0].errorMessage).not.toBeNull();
    });

    it('URLポインタは PointerResolverPort を呼び出さず isResolvable=true を返す', async () => {
      // Arrange
      const pointers = [createUrlPointer()];
      // Act
      const actual = await service.resolve(pointers);
      // Assert
      expect(actual[0].isResolvable).toBe(true);
      expect(resolverPort.resolve).not.toHaveBeenCalled();
    });

    it('空配列を渡した場合は空の PointerValidationResult[] が返る', async () => {
      // Arrange / Act
      const actual = await service.resolve([]);
      // Assert
      expect(actual).toHaveLength(0);
      expect(resolverPort.resolve).not.toHaveBeenCalled();
    });

    it('file-path1（実在）, file-path2（不在）, url1（スキップ）混在で正しく処理される', async () => {
      // Arrange
      resolverPort.resolve
        .mockResolvedValueOnce(true)   // file-path1
        .mockResolvedValueOnce(false); // file-path2
      const pointers = [
        createFilePathPointer({ target: 'docs/exists.md' }),
        createFilePathPointer({ target: 'docs/missing.md' }),
        createUrlPointer(),
      ];
      // Act
      const actual = await service.resolve(pointers);
      // Assert
      expect(actual).toHaveLength(3);
      expect(actual[0].isResolvable).toBe(true);
      expect(actual[1].isResolvable).toBe(false);
      expect(actual[2].isResolvable).toBe(true); // URLスキップ
    });

    it('PointerResolverPort が I/O エラーをスローした場合にエラーが伝播する', async () => {
      // Arrange
      resolverPort.resolve.mockRejectedValue(new Error('I/O failure'));
      const pointers = [createFilePathPointer()];
      // Act / Assert
      await expect(service.resolve(pointers)).rejects.toThrow();
    });
  });
});
```
