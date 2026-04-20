// @layer test
// @unit phase2-extensions
// @story HF2-04
import { beforeEach, expect, it, vi } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { CheckInitialCreationExpirationUseCase } from '../../../phase2-extensions/application/usecases/check-initial-creation-expiration-usecase.js';
import { InitialCreationExpirationCheckService } from '../../../phase2-extensions/domain/services/initial-creation-expiration-check-service.js';
import { InitialCreationExpirationRule } from '../../../phase2-extensions/domain/aggregates/initial-creation-expiration-rule.js';
import { InitialCreationAge } from '../../../phase2-extensions/domain/value-objects/initial-creation-age.js';

const defaultRule = () =>
  InitialCreationExpirationRule.create({
    ruleId: 'r1',
    documentPattern: 'docs/**/*.md',
    daysThreshold: 90,
    commitCountThreshold: 5,
    evaluationMode: 'or',
    enabled: true,
  });

const makeAge = (ageInDays: number, commitCount: number) =>
  InitialCreationAge.create({ ageInDays, commitCount, source: 'git-log' });

target('IT-P2-042〜048 CheckInitialCreationExpirationUseCase', () => {
  let configPort: { loadRules: ReturnType<typeof vi.fn> };
  let scannerPort: { scan: ReturnType<typeof vi.fn> };
  let frontmatterReaderPort: { read: ReturnType<typeof vi.fn> };
  let agePort: { getAge: ReturnType<typeof vi.fn> };
  let useCase: CheckInitialCreationExpirationUseCase;

  beforeEach(() => {
    configPort = { loadRules: vi.fn().mockResolvedValue([defaultRule()]) };
    scannerPort = { scan: vi.fn().mockResolvedValue(['docs/a.md', 'docs/b.md']) };
    frontmatterReaderPort = {
      read: vi
        .fn()
        .mockResolvedValue({ filePath: '', flags: { initialCreation: true }, parseError: null }),
    };
    agePort = { getAge: vi.fn().mockResolvedValue(makeAge(30, 2)) };
    useCase = new CheckInitialCreationExpirationUseCase(
      configPort,
      scannerPort,
      frontmatterReaderPort,
      agePort,
      new InitialCreationExpirationCheckService(),
    );
  });

  context('execute()', () => {
    it('全文書が閾値未満のとき warn なし', async () => {
      // Arrange (beforeEach で構築済み)
      // Act
      const actual = await useCase.execute({});

      // Assert
      expect(actual.results).toHaveLength(2);
      expect(actual.summary.warn).toBe(0);
      expect(actual.warnings).toHaveLength(0);
    });

    it('1 文書が日数閾値超過のとき warn=1', async () => {
      // Arrange
      agePort.getAge.mockImplementation((path: string) =>
        Promise.resolve(path.includes('a.md') ? makeAge(100, 2) : makeAge(30, 2)),
      );

      // Act
      const actual = await useCase.execute({});

      // Assert
      expect(actual.summary.warn).toBe(1);
      expect(actual.warnings).toHaveLength(1);
      expect(actual.warnings[0].code).toBe('L4-231');
    });

    it('initial_creation: false の文書は対象外', async () => {
      // Arrange
      frontmatterReaderPort.read.mockImplementation((path: string) =>
        Promise.resolve(
          path.includes('a.md')
            ? { filePath: path, flags: { initialCreation: true }, parseError: null }
            : { filePath: path, flags: { initialCreation: false }, parseError: null },
        ),
      );
      agePort.getAge.mockResolvedValue(makeAge(100, 10));

      // Act
      const actual = await useCase.execute({});

      // Assert
      expect(actual.results).toHaveLength(1);
    });

    it('frontmatter 無し文書はスキップ', async () => {
      // Arrange
      scannerPort.scan.mockResolvedValue(['docs/a.md']);
      frontmatterReaderPort.read.mockResolvedValue({
        filePath: 'docs/a.md',
        flags: null,
        parseError: null,
      });

      // Act
      const actual = await useCase.execute({});

      // Assert
      expect(actual.results).toHaveLength(0);
    });

    it('frontmatter parse エラー時は L4-232 warn を個別追加し他は継続', async () => {
      // Arrange
      frontmatterReaderPort.read.mockImplementation((path: string) =>
        Promise.resolve(
          path.includes('a.md')
            ? { filePath: path, flags: null, parseError: 'yaml broken' }
            : { filePath: path, flags: { initialCreation: true }, parseError: null },
        ),
      );
      agePort.getAge.mockResolvedValue(makeAge(100, 10));

      // Act
      const actual = await useCase.execute({});

      // Assert
      expect(actual.warnings).toHaveLength(2);
      expect(actual.warnings.some((warning) => warning.code === 'L4-232')).toBe(true);
      expect(actual.warnings.some((warning) => warning.code === 'L4-231')).toBe(true);
    });

    it('configPort.loadRules が空配列を返したとき results.length===0', async () => {
      // Arrange
      // config のデフォルト補完は adapter 側の責務なので、UseCase では空配列をそのまま扱う
      configPort.loadRules.mockResolvedValue([]);

      // Act
      const actual = await useCase.execute({});

      // Assert
      expect(actual.results).toHaveLength(0);
    });

    it('rule.enabled=false ならスキップ', async () => {
      // Arrange
      configPort.loadRules.mockResolvedValue([
        InitialCreationExpirationRule.create({
          ruleId: 'r-disabled',
          documentPattern: 'docs/**/*.md',
          daysThreshold: 90,
          commitCountThreshold: 5,
          evaluationMode: 'or',
          enabled: false,
        }),
      ]);

      // Act
      const actual = await useCase.execute({});

      // Assert
      expect(scannerPort.scan).not.toHaveBeenCalled();
      expect(actual.results).toHaveLength(0);
    });
  });
});
