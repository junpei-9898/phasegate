// @layer test
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
interface LegacyHarnessError {
  code: string;
  severity: string;
  category: string;
  location: { file: string; line?: number };
  message: { short: string; detailed: string; agentInstruction: string };
  context: { rule: string; expected: string; actual: string };
  resolution: { fixSuggestion: string; docLinks: string[]; relatedFiles: string[] };
  metadata: { timestamp: string; validator: string; layer: string };
}
import { LegacyErrorReporterAdapter } from '../../../harness-error/infrastructure/adapters/legacy-error-reporter-adapter.js';
import { FileSystemAdrExistenceCheckerAdapter } from '../../../harness-error/infrastructure/adapters/file-system-adr-existence-checker-adapter.js';
import { TypeScriptSnippetSyntaxAdapter } from '../../../harness-error/infrastructure/adapters/type-script-snippet-syntax-adapter.js';
import {
  type ValidatorEntrypoint,
  ValidatorExecutionFixExampleValidatorAdapter,
} from '../../../harness-error/infrastructure/adapters/validator-execution-fix-example-validator-adapter.js';
import {
  DEFAULT_VALIDATOR_ENTRYPOINTS,
  ValidatorRegistryBridgeAdapter,
} from '../../../harness-error/infrastructure/adapters/validator-registry-bridge-adapter.js';
import { buildErrorDefinitionRegistry } from '../../../harness-error/infrastructure/registry/build-error-definition-registry.js';
import { L1_ERROR_DEFINITIONS } from '../../../harness-error/infrastructure/registry/l1-error-definitions.js';
import { L2_ERROR_DEFINITIONS } from '../../../harness-error/infrastructure/registry/l2-error-definitions.js';
import { L3_ERROR_DEFINITIONS } from '../../../harness-error/infrastructure/registry/l3-error-definitions.js';
import { L4_ERROR_DEFINITIONS } from '../../../harness-error/infrastructure/registry/l4-error-definitions.js';
import { AdrRef } from '../../../harness-error/domain/value-objects/adr-ref.js';
import { ErrorCode } from '../../../harness-error/domain/value-objects/error-code.js';
import { ErrorDefinition } from '../../../harness-error/domain/value-objects/error-definition.js';
import { FixExample } from '../../../harness-error/domain/value-objects/fix-example.js';
import { Severity } from '../../../harness-error/domain/value-objects/severity.js';

function createTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'harness-error-it-'));
}

async function withTmpDir<T>(run: (tmpDir: string) => Promise<T> | T): Promise<T> {
  const tmpDir = createTmpDir();

  try {
    return await run(tmpDir);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function writeFile(rootDir: string, relativePath: string, content: string): string {
  const filePath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function createTmpAdrFixture(
  fixtures: ReadonlyArray<{ fileName: string; adrId: string }>
): string {
  const tmpDir = createTmpDir();
  const adrDir = path.join(tmpDir, 'docs', 'ADR');
  fs.mkdirSync(adrDir, { recursive: true });

  for (const fixture of fixtures) {
    const content = `---\nadr_id: "${fixture.adrId}"\ntitle: "fixture"\nstatus: Accepted\ndate: "2026-03-14"\n---\n`;
    writeFile(tmpDir, path.join('docs', 'ADR', fixture.fileName), content);
  }

  return tmpDir;
}

function createSnippetFixture(fileName: string, content: string): string {
  const tmpDir = createTmpDir();
  writeFile(tmpDir, fileName, content);
  return tmpDir;
}

function loadSnippetFixture(rootDir: string, fileName: string): string {
  return fs.readFileSync(path.join(rootDir, fileName), 'utf8');
}

function createLegacyHarnessError(
  overrides: Partial<LegacyHarnessError> = {}
): LegacyHarnessError {
  return {
    code: overrides.code ?? 'L2-001',
    severity: overrides.severity ?? 'error',
    category: overrides.category ?? 'phase_gate',
    location: overrides.location ?? { file: 'scripts/harness/sample.ts', line: 1 },
    message: overrides.message ?? {
      short: '旧形式の短いメッセージ',
      detailed: '旧形式の詳細メッセージ',
      agentInstruction: '旧形式のエージェント指示',
    },
    context: overrides.context ?? {
      rule: 'phase-gate',
      expected: '設計書があること',
      actual: '設計書がない',
    },
    resolution: overrides.resolution ?? {
      fixSuggestion: '設計書を追加する',
      docLinks: ['https://example.com/docs'],
      relatedFiles: ['docs/product/construction/harness-error/logical_design.md'],
    },
    metadata: overrides.metadata ?? {
      timestamp: '2026-03-14T00:00:00.000Z',
      validator: 'phase-gate',
      layer: 'L2',
    },
  };
}

function createErrorDefinition(params: {
  code: string;
  title?: string;
  category?: 'phase_gate' | 'architecture' | 'dependency' | 'quality' | 'security' | 'performance' | 'consistency' | 'metadata';
  severity?: 'error' | 'warning';
  adrRefRequired?: boolean;
  defaultAdrRef?: string | null;
  fixExampleRequired?: boolean;
  defaultFixExample?: string | null;
  ownerValidatorId?: string;
}): ErrorDefinition {
  return ErrorDefinition.create({
    code: ErrorCode.create(params.code),
    title: params.title ?? `${params.code} title`,
    category: params.category ?? 'architecture',
    defaultSeverity: Severity.create(params.severity ?? 'error'),
    adrRefRequired: params.adrRefRequired ?? true,
    defaultAdrRef:
      params.defaultAdrRef === null
        ? null
        : AdrRef.create(params.defaultAdrRef ?? 'ADR-001'),
    fixExampleRequired: params.fixExampleRequired ?? true,
    defaultFixExample:
      params.defaultFixExample === null
        ? null
        : FixExample.create(params.defaultFixExample ?? 'const fixed = true;'),
    ownerValidatorId: params.ownerValidatorId ?? 'architecture',
  });
}

function createAllLayerDefinitions(): readonly (readonly ErrorDefinition[])[] {
  return [
    L1_ERROR_DEFINITIONS,
    L2_ERROR_DEFINITIONS,
    L3_ERROR_DEFINITIONS,
    L4_ERROR_DEFINITIONS,
  ] as const;
}

function createTransitionValidator(params: {
  before: readonly string[];
  after: readonly string[];
}): ValidatorEntrypoint {
  return {
    async validateFixExample(input) {
      return Object.freeze({
        beforeIssues: Object.freeze(
          params.before.map((code) =>
            Object.freeze({
              code,
              message: `${code} before`,
            })
          )
        ),
        afterIssues: Object.freeze(
          params.after.map((code) =>
            Object.freeze({
              code,
              message: `${code} after`,
            })
          )
        ),
      });
    },
  };
}

function createFailingValidator(messages: readonly string[]): ValidatorEntrypoint {
  return {
    async validateFixExample() {
      return Object.freeze({
        beforeIssues: Object.freeze([
          Object.freeze({
            code: 'L1-001',
            message: 'before',
          }),
        ]),
        afterIssues: Object.freeze(
          messages.map((message) =>
            Object.freeze({
              code: 'L1-001',
              message,
            })
          )
        ),
      });
    },
  };
}

function createAdditionalWarningValidator(codes: readonly string[]): ValidatorEntrypoint {
  return {
    async validateFixExample() {
      return Object.freeze({
        beforeIssues: Object.freeze([
          Object.freeze({
            code: 'L1-001',
            message: 'before',
          }),
        ]),
        afterIssues: Object.freeze(
          codes.map((code) =>
            Object.freeze({
              code,
              message: `${code} warning`,
            })
          )
        ),
      });
    },
  };
}

target('FileSystemAdrExistenceCheckerAdapter.exists', () => {
  describe('docs/ADR配下のADR存在有無を判定する', () => {
    context('ファイル名とfrontmatterが一致するADRが存在する場合', () => {
      // IT-HE-051
      it('docs/ADR/配下にファイル名一致するADRが存在する場合にtrueを返す', async () => {
        const tmpDir = createTmpAdrFixture([{ fileName: 'ADR-001.md', adrId: '001' }]);

        try {
          // Arrange
          const sut = new FileSystemAdrExistenceCheckerAdapter({ rootDir: tmpDir });

          // Act
          const actual = await sut.exists(AdrRef.create('ADR-001'));

          // Assert
          expect(actual).toBe(true);
        } finally {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      });

      // IT-HE-052
      it('ファイル名一致かつfrontmatterのadr_idが一致する場合にtrueを返す', async () => {
        const tmpDir = createTmpAdrFixture([{ fileName: 'ADR-001.md', adrId: '001' }]);

        try {
          // Arrange
          const sut = new FileSystemAdrExistenceCheckerAdapter({ rootDir: tmpDir });

          // Act
          const actual = await sut.exists(AdrRef.create('ADR-001'));

          // Assert
          expect(actual).toBe(true);
        } finally {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      });
    });

    context('ファイル名は一致するがfrontmatterが一致しない場合', () => {
      // IT-HE-053
      it('ファイル名一致だがfrontmatterのadr_idが不一致の場合にfalseを返す', async () => {
        const tmpDir = createTmpAdrFixture([{ fileName: 'ADR-001.md', adrId: '999' }]);

        try {
          // Arrange
          const sut = new FileSystemAdrExistenceCheckerAdapter({ rootDir: tmpDir });

          // Act
          const actual = await sut.exists(AdrRef.create('ADR-001'));

          // Assert
          expect(actual).toBe(false);
        } finally {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      });
    });

    context('対象ADRファイルが存在しない場合', () => {
      // IT-HE-054
      it('対象ADRファイルが存在しない場合にfalseを返す', async () => {
        const tmpDir = createTmpAdrFixture([]);

        try {
          // Arrange
          const sut = new FileSystemAdrExistenceCheckerAdapter({ rootDir: tmpDir });

          // Act
          const actual = await sut.exists(AdrRef.create('ADR-001'));

          // Assert
          expect(actual).toBe(false);
        } finally {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      });
    });

    context('docs/ADRディレクトリ自体が存在しない場合', () => {
      // IT-HE-055
      it('docs/ADR/ディレクトリ自体が存在しない場合にfalseを返す', async () => {
        await withTmpDir(async (tmpDir) => {
          // Arrange
          const sut = new FileSystemAdrExistenceCheckerAdapter({ rootDir: tmpDir });

          // Act
          const actual = await sut.exists(AdrRef.create('ADR-001'));

          // Assert
          expect(actual).toBe(false);
        });
      });
    });

    context('I/O例外が発生する場合', () => {
      // IT-HE-056
      it('I/Oエラー発生時にadapter例外を返す', async () => {
        await withTmpDir(async (tmpDir) => {
          // Arrange
          fs.mkdirSync(path.join(tmpDir, 'docs', 'ADR', 'ADR-001.md'), { recursive: true });
          const sut = new FileSystemAdrExistenceCheckerAdapter({ rootDir: tmpDir });

          // Act
          const actual = sut.exists(AdrRef.create('ADR-001'));

          // Assert
          await expect(actual).rejects.toThrow();
        });
      });
    });
  });
});

target('TypeScriptSnippetSyntaxAdapter.validate', () => {
  describe('TypeScriptコード片の構文妥当性を判定する', () => {
    context('構文的に正しいコード片の場合', () => {
      // IT-HE-057
      it('有効な単一文のTypeScriptコード片で構文正常と判定される', async () => {
        await withTmpDir(async (tmpDir) => {
          // Arrange
          writeFile(tmpDir, 'valid-single-statement.ts', 'const fixed = true;');
          const sut = new TypeScriptSnippetSyntaxAdapter();
          const snippet = loadSnippetFixture(tmpDir, 'valid-single-statement.ts');

          // Act
          const actual = sut.validate(snippet);

          // Assert
          expect(actual.valid).toBe(true);
        });
      });

      // IT-HE-058
      it('有効な複数文のTypeScriptコード片で構文正常と判定される', async () => {
        await withTmpDir(async (tmpDir) => {
          // Arrange
          writeFile(tmpDir, 'valid-multi-statement.ts', 'const first = 1;\nconst second = first + 1;');
          const sut = new TypeScriptSnippetSyntaxAdapter();
          const snippet = loadSnippetFixture(tmpDir, 'valid-multi-statement.ts');

          // Act
          const actual = sut.validate(snippet);

          // Assert
          expect(actual.valid).toBe(true);
        });
      });

      // IT-HE-059
      it('関数定義を含むコード片で構文正常と判定される', async () => {
        await withTmpDir(async (tmpDir) => {
          // Arrange
          writeFile(tmpDir, 'valid-function-definition.ts', 'function fix(value: number): number { return value + 1; }');
          const sut = new TypeScriptSnippetSyntaxAdapter();
          const snippet = loadSnippetFixture(tmpDir, 'valid-function-definition.ts');

          // Act
          const actual = sut.validate(snippet);

          // Assert
          expect(actual.valid).toBe(true);
        });
      });

      // IT-HE-062
      it('空文字列が渡された場合に正常扱いで返される', () => {
        // Arrange
        const sut = new TypeScriptSnippetSyntaxAdapter();

        // Act
        const actual = sut.validate('');

        // Assert
        expect(actual).toEqual({
          valid: true,
          diagnostics: [],
        });
      });
    });

    context('構文的に誤ったコード片の場合', () => {
      // IT-HE-060
      it('構文エラーを含むコード片で構文失敗と判定される', async () => {
        await withTmpDir(async (tmpDir) => {
          // Arrange
          writeFile(tmpDir, 'invalid-syntax-error.ts', 'const broken = ;');
          const sut = new TypeScriptSnippetSyntaxAdapter();
          const snippet = loadSnippetFixture(tmpDir, 'invalid-syntax-error.ts');

          // Act
          const actual = sut.validate(snippet);

          // Assert
          expect(actual.valid).toBe(false);
          expect(actual.diagnostics.length).toBeGreaterThanOrEqual(1);
        });
      });

      // IT-HE-061
      it('閉じ括弧不足のコード片で構文失敗と判定される', async () => {
        await withTmpDir(async (tmpDir) => {
          // Arrange
          writeFile(tmpDir, 'invalid-unclosed-bracket.ts', 'if (true) {');
          const sut = new TypeScriptSnippetSyntaxAdapter();
          const snippet = loadSnippetFixture(tmpDir, 'invalid-unclosed-bracket.ts');

          // Act
          const actual = sut.validate(snippet);

          // Assert
          expect(actual.valid).toBe(false);
        });
      });
    });
  });
});

target('ValidatorExecutionFixExampleValidatorAdapter.validate', () => {
  describe('fix_example適用後のvalidator再実行を検証する', () => {
    context('構文もvalidator再実行も成功する場合', () => {
      // IT-HE-063
      it('構文妥当かつvalidator通過で成功結果が返される', async () => {
        // Arrange
        const syntaxAdapter = new TypeScriptSnippetSyntaxAdapter();
        const validatorRegistryBridge = new ValidatorRegistryBridgeAdapter({
          entrypoints: new Map([
            ['phase-gate', createTransitionValidator({ before: ['L1-001'], after: [] })],
          ]),
        });
        const sut = new ValidatorExecutionFixExampleValidatorAdapter({
          syntaxAdapter,
          validatorRegistryBridge,
        });

        // Act
        const actual = await sut.validate({
          validatorId: 'phase-gate',
          errorCode: ErrorCode.create('L1-001'),
          fixExample: FixExample.create('const fixed = true;'),
        });

        // Assert
        expect(actual).toMatchObject({ passed: true, reason: null });
      });

      // IT-HE-066
      it('fix_example適用後に対象コードの違反が消失していることが検証される', async () => {
        // Arrange
        const syntaxAdapter = new TypeScriptSnippetSyntaxAdapter();
        const validatorRegistryBridge = new ValidatorRegistryBridgeAdapter({
          entrypoints: new Map([
            ['phase-gate', createTransitionValidator({ before: ['L1-001'], after: [] })],
          ]),
        });
        const sut = new ValidatorExecutionFixExampleValidatorAdapter({
          syntaxAdapter,
          validatorRegistryBridge,
        });

        // Act
        const actual = await sut.validate({
          validatorId: 'phase-gate',
          errorCode: ErrorCode.create('L1-001'),
          fixExample: FixExample.create('const fixed = true;'),
        });

        // Assert
        expect(actual.passed).toBe(true);
      });

      // IT-HE-070
      it('deterministicなfixtureに対して結果が再現可能である', async () => {
        // Arrange
        const syntaxAdapter = new TypeScriptSnippetSyntaxAdapter();
        const validatorRegistryBridge = new ValidatorRegistryBridgeAdapter({
          entrypoints: new Map([
            ['phase-gate', createTransitionValidator({ before: ['L1-001'], after: [] })],
          ]),
        });
        const sut = new ValidatorExecutionFixExampleValidatorAdapter({
          syntaxAdapter,
          validatorRegistryBridge,
        });
        const input = {
          validatorId: 'phase-gate',
          errorCode: ErrorCode.create('L1-001'),
          fixExample: FixExample.create('const fixed = true;'),
        };

        // Act
        const actual = await sut.validate(input);
        const actualAgain = await sut.validate(input);

        // Assert
        expect(actualAgain).toEqual(actual);
      });
    });

    context('構文が不正な場合', () => {
      // IT-HE-064
      it('構文不正の場合にfailure結果が返される', async () => {
        // Arrange
        const syntaxAdapter = new TypeScriptSnippetSyntaxAdapter();
        const validatorRegistryBridge = new ValidatorRegistryBridgeAdapter({
          entrypoints: new Map([
            ['phase-gate', createTransitionValidator({ before: ['L1-001'], after: [] })],
          ]),
        });
        const sut = new ValidatorExecutionFixExampleValidatorAdapter({
          syntaxAdapter,
          validatorRegistryBridge,
        });

        // Act
        const actual = await sut.validate({
          validatorId: 'phase-gate',
          errorCode: ErrorCode.create('L1-001'),
          fixExample: FixExample.create('const broken = ;'),
        });

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.diagnostics.some((diagnostic) => diagnostic.includes('構文'))).toBe(true);
      });
    });

    context('validator再実行で違反が残る場合', () => {
      // IT-HE-065
      it('構文正常だがvalidator再実行で違反が残る場合にfailure結果が返される', async () => {
        // Arrange
        const syntaxAdapter = new TypeScriptSnippetSyntaxAdapter();
        const validatorRegistryBridge = new ValidatorRegistryBridgeAdapter({
          entrypoints: new Map([['phase-gate', createFailingValidator(['still failing'])]]),
        });
        const sut = new ValidatorExecutionFixExampleValidatorAdapter({
          syntaxAdapter,
          validatorRegistryBridge,
        });

        // Act
        const actual = await sut.validate({
          validatorId: 'phase-gate',
          errorCode: ErrorCode.create('L1-001'),
          fixExample: FixExample.create('const fixed = true;'),
        });

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.reason).not.toBeNull();
      });

      // IT-HE-067
      it('diagnosticsに構文エラーとvalidator失敗の両方が記録される', async () => {
        // Arrange
        const syntaxAdapter = new TypeScriptSnippetSyntaxAdapter();
        const validatorRegistryBridge = new ValidatorRegistryBridgeAdapter({
          entrypoints: new Map([['phase-gate', createFailingValidator(['validator failed'])]]),
        });
        const sut = new ValidatorExecutionFixExampleValidatorAdapter({
          syntaxAdapter,
          validatorRegistryBridge,
        });

        // Act
        const actual = await sut.validate({
          validatorId: 'phase-gate',
          errorCode: ErrorCode.create('L1-001'),
          fixExample: FixExample.create('const broken = ;'),
        });

        // Assert
        expect(actual.passed).toBe(false);
        expect(actual.diagnostics.length).toBeGreaterThanOrEqual(2);
      });

      // IT-HE-069
      it('validator再実行で他コードの警告が追加された場合にfailure結果が返される', async () => {
        // Arrange
        const syntaxAdapter = new TypeScriptSnippetSyntaxAdapter();
        const validatorRegistryBridge = new ValidatorRegistryBridgeAdapter({
          entrypoints: new Map([
            ['phase-gate', createAdditionalWarningValidator(['L1-099'])],
          ]),
        });
        const sut = new ValidatorExecutionFixExampleValidatorAdapter({
          syntaxAdapter,
          validatorRegistryBridge,
        });

        // Act
        const actual = await sut.validate({
          validatorId: 'phase-gate',
          errorCode: ErrorCode.create('L1-001'),
          fixExample: FixExample.create('const fixed = true;'),
        });

        // Assert
        expect(actual.passed).toBe(false);
      });
    });

    context('validatorIdを解決できない場合', () => {
      // IT-HE-068
      it('未知のvalidatorIdが指定された場合にエラーを返す', async () => {
        // Arrange
        const syntaxAdapter = new TypeScriptSnippetSyntaxAdapter();
        const validatorRegistryBridge = new ValidatorRegistryBridgeAdapter({
          entrypoints: new Map(),
        });
        const sut = new ValidatorExecutionFixExampleValidatorAdapter({
          syntaxAdapter,
          validatorRegistryBridge,
        });

        // Act
        const actual = sut.validate({
          validatorId: 'unknown-validator',
          errorCode: ErrorCode.create('L1-001'),
          fixExample: FixExample.create('const fixed = true;'),
        });

        // Assert
        await expect(actual).rejects.toThrow();
      });
    });
  });
});

target('ValidatorRegistryBridgeAdapter.resolve', () => {
  describe('validatorIdから既存validatorエントリポイントを解決する', () => {
    context('登録済みvalidatorIdを指定する場合', () => {
      // IT-HE-071
      it('harness-error Unit所有のエラー定義が参照するvalidatorIdからエントリポイントが解決される', () => {
        // Arrange
        const sut = new ValidatorRegistryBridgeAdapter();

        // Act
        const actual = sut.resolve('phase-gate');

        // Assert
        expect(actual).toBeDefined();
      });

      // IT-HE-072
      it('harness-error Unit所有の全ownerValidatorIdが登録済みである', () => {
        // Arrange
        const registry = buildErrorDefinitionRegistry(createAllLayerDefinitions());
        const sut = new ValidatorRegistryBridgeAdapter();
        const validatorIds = [...new Set(registry.getAllDefinitions().map((definition) => definition.ownerValidatorId))];

        // Act
        const actual = validatorIds.map((validatorId) => sut.resolve(validatorId));

        // Assert
        expect(actual.every(Boolean)).toBe(true);
      });

      // IT-HE-074
      it('静的マップの内容が公開登録一覧と一致する', () => {
        // Arrange
        const sut = new ValidatorRegistryBridgeAdapter();

        // Act
        const actual = sut.getRegisteredValidatorIds();

        // Assert
        expect(actual).toEqual([...DEFAULT_VALIDATOR_ENTRYPOINTS.keys()]);
      });
    });

    context('未登録validatorIdを指定する場合', () => {
      // IT-HE-073
      it('未知のvalidatorIdに対してエラーが返される', () => {
        // Arrange
        const sut = new ValidatorRegistryBridgeAdapter();

        // Act
        const actual = () => sut.resolve('unknown-validator');

        // Assert
        expect(actual).toThrow();
      });
    });
  });
});

target('LegacyErrorReporterAdapter.toDraft', () => {
  describe('旧形式HarnessErrorをValidatorIssueDraftへ写像する', () => {
    context('旧形式サンプルを正規draftへ変換する場合', () => {
      // IT-HE-075
      it('旧形式のエラーオブジェクトがValidatorIssueDraftに変換される', () => {
        // Arrange
        const sut = new LegacyErrorReporterAdapter();
        const legacyError = createLegacyHarnessError();

        // Act
        const actual = sut.toDraft(legacyError);

        // Assert
        expect(actual).toMatchObject({
          code: legacyError.code,
          message: legacyError.message.short,
          suggestion: expect.any(String),
          validatorId: legacyError.metadata.validator,
        });
      });

      // IT-HE-076
      it('旧severity infoがwarningにマップされる', () => {
        // Arrange
        const sut = new LegacyErrorReporterAdapter();
        const legacyError = createLegacyHarnessError({ severity: 'info' });

        // Act
        const actual = sut.toDraft(legacyError);

        // Assert
        expect(actual.severity).toBe('warning');
      });

      // IT-HE-077
      it('旧severity errorがそのままerrorにマップされる', () => {
        // Arrange
        const sut = new LegacyErrorReporterAdapter();
        const legacyError = createLegacyHarnessError({ severity: 'error' });

        // Act
        const actual = sut.toDraft(legacyError);

        // Assert
        expect(actual.severity).toBe('error');
      });

      // IT-HE-078
      it('旧severity warningがそのままwarningにマップされる', () => {
        // Arrange
        const sut = new LegacyErrorReporterAdapter();
        const legacyError = createLegacyHarnessError({ severity: 'warning' });

        // Act
        const actual = sut.toDraft(legacyError);

        // Assert
        expect(actual.severity).toBe('warning');
      });

      // IT-HE-079
      it('旧message.shortがdraftのmessageにマップされる', () => {
        // Arrange
        const sut = new LegacyErrorReporterAdapter();
        const legacyError = createLegacyHarnessError({
          message: {
            short: 'short message',
            detailed: 'detail',
            agentInstruction: 'instruction',
          },
        });

        // Act
        const actual = sut.toDraft(legacyError);

        // Assert
        expect(actual.message).toBe('short message');
      });

      // IT-HE-080
      it('旧resolution.fixSuggestionがdraftのsuggestionにマップされる', () => {
        // Arrange
        const sut = new LegacyErrorReporterAdapter();
        const legacyError = createLegacyHarnessError({
          resolution: {
            fixSuggestion: 'do this',
            docLinks: [],
            relatedFiles: [],
          },
        });

        // Act
        const actual = sut.toDraft(legacyError);

        // Assert
        expect(actual.suggestion).toContain('do this');
      });

      // IT-HE-081
      it('旧resolution.docLinksがsuggestionに圧縮される', () => {
        // Arrange
        const sut = new LegacyErrorReporterAdapter();
        const legacyError = createLegacyHarnessError({
          resolution: {
            fixSuggestion: 'do this',
            docLinks: ['https://example.com/adr'],
            relatedFiles: [],
          },
        });

        // Act
        const actual = sut.toDraft(legacyError);

        // Assert
        expect(actual.suggestion).toContain('https://example.com/adr');
      });

      // IT-HE-082
      it('旧metadata.validatorがdraftのvalidatorIdにマップされる', () => {
        // Arrange
        const sut = new LegacyErrorReporterAdapter();
        const legacyError = createLegacyHarnessError({
          metadata: {
            timestamp: '2026-03-14T00:00:00.000Z',
            validator: 'phase-gate',
            layer: 'L2',
          },
        });

        // Act
        const actual = sut.toDraft(legacyError);

        // Assert
        expect(actual.validatorId).toBe('phase-gate');
      });
    });
  });
});

target('buildErrorDefinitionRegistry', () => {
  describe('静的定義群からErrorDefinitionRegistryを構築する', () => {
    context('起動時検証に失敗する場合', () => {
      // IT-HE-084
      it('重複codeが検出された場合に起動時エラーをthrowする', () => {
        // Arrange
        const definitions = [
          [createErrorDefinition({ code: 'L1-001' }), createErrorDefinition({ code: 'L1-001' })],
        ];

        // Act
        const actual = () => buildErrorDefinitionRegistry(definitions);

        // Assert
        expect(actual).toThrow();
      });

      // IT-HE-085
      it('欠落ADRが検出された場合にエラーをthrowする', () => {
        // Arrange
        const definitions = [[
          createErrorDefinition({
            code: 'L1-009',
            adrRefRequired: true,
            defaultAdrRef: null,
          }),
        ]];

        // Act
        const actual = () => buildErrorDefinitionRegistry(definitions);

        // Assert
        expect(actual).toThrow();
      });

      // IT-HE-086
      it('欠落defaultFixExampleが検出された場合にエラーをthrowする', () => {
        // Arrange
        const definitions = [[
          createErrorDefinition({
            code: 'L1-010',
            fixExampleRequired: true,
            defaultFixExample: null,
          }),
        ]];

        // Act
        const actual = () => buildErrorDefinitionRegistry(definitions);

        // Assert
        expect(actual).toThrow();
      });
    });
  });
});
