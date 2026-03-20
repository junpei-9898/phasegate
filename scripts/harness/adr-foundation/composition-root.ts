/**
 * @layer composition
 * @unit adr-foundation
 *
 * adr-foundation ユニットの Composition Root。
 * 全コンポーネントを生成・配線し、外部に公開するハンドラー群を返す。
 */
import { RegexAdrFrontmatterParser } from './infrastructure/parsers/regex-adr-frontmatter-parser.js';
import { AdrMarkdownDocumentParser } from './infrastructure/parsers/adr-markdown-document-parser.js';
import { FileSystemAdrRepository } from './infrastructure/repositories/file-system-adr-repository.js';
import { ListAdrsUseCase } from './application/usecases/list-adrs-use-case.js';
import { ValidateAllAdrsUseCase } from './application/usecases/validate-all-adrs-use-case.js';
import { ValidateAdrFrontmatterUseCase } from './application/usecases/validate-adr-frontmatter-use-case.js';
import { ListAdrsCommandHandler } from './presentation/cli/list-adrs-command-handler.js';
import { ValidateAdrCommandHandler } from './presentation/cli/validate-adr-command-handler.js';

export function createAdrFoundationModule(rootDir: string) {
  // Infrastructure — parsers
  const frontmatterParser = new RegexAdrFrontmatterParser();
  const documentParser = new AdrMarkdownDocumentParser(frontmatterParser);

  // Infrastructure — repositories
  const adrRepository = new FileSystemAdrRepository(rootDir, documentParser);

  // Usecases
  const listAdrsUseCase = new ListAdrsUseCase(adrRepository);
  const validateAllAdrsUseCase = new ValidateAllAdrsUseCase(adrRepository);
  const validateAdrFrontmatterUseCase = new ValidateAdrFrontmatterUseCase(
    adrRepository,
  );

  // Presentation handlers
  const listAdrsCommandHandler = new ListAdrsCommandHandler({
    listAdrsUseCase,
  });
  const validateAdrCommandHandler = new ValidateAdrCommandHandler({
    validateAllAdrsUseCase,
    validateAdrFrontmatterUseCase,
  });

  return {
    listAdrsCommandHandler,
    validateAdrCommandHandler,
    // expose repository for cross-unit use
    adrRepository,
  } as const;
}
