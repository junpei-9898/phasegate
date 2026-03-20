/**
 * @layer composition
 * @unit phase2-extensions
 */
import type { HarnessConfigV2 } from '../config-foundation/domain/harness-config.js';
import { CheckDocFreshnessUseCase } from './application/usecases/check-doc-freshness-usecase.js';
import { GenerateE2ETemplateUseCase } from './application/usecases/generate-e2e-template-usecase.js';
import { ValidateDocPointersUseCase } from './application/usecases/validate-doc-pointers-usecase.js';
import { FreshnessCheckService } from './domain/services/freshness-check-service.js';
import { PointerResolutionService } from './domain/services/pointer-resolution-service.js';
import { FileSystemDocumentScannerAdapter } from './infrastructure/adapters/file-system-document-scanner-adapter.js';
import { FileSystemPointerResolverAdapter } from './infrastructure/adapters/file-system-pointer-resolver-adapter.js';
import { GitLogDocumentAgeAdapter } from './infrastructure/adapters/git-log-document-age-adapter.js';
import { HarnessConfigFreshnessAdapter } from './infrastructure/adapters/harness-config-freshness-adapter.js';
import { RegexPointerExtractorAdapter } from './infrastructure/adapters/regex-pointer-extractor-adapter.js';
import { CheckFreshnessHandler } from './presentation/handlers/check-freshness-handler.js';
import { GenerateE2ETemplateHandler } from './presentation/handlers/generate-e2e-template-handler.js';
import { ValidatePointersHandler } from './presentation/handlers/validate-pointers-handler.js';

export function buildPhase2Extensions(projectRoot: string, config?: HarnessConfigV2) {
  const configAdapter = new HarnessConfigFreshnessAdapter(config);
  const documentScanner = new FileSystemDocumentScannerAdapter(projectRoot);
  const documentAge = new GitLogDocumentAgeAdapter(projectRoot);
  const pointerExtractor = new RegexPointerExtractorAdapter(projectRoot);
  const pointerResolver = new FileSystemPointerResolverAdapter(projectRoot);

  const freshnessCheckService = new FreshnessCheckService();
  const pointerResolutionService = new PointerResolutionService(pointerResolver);

  const checkDocFreshnessUseCase = new CheckDocFreshnessUseCase(
    configAdapter,
    documentScanner,
    documentAge,
    freshnessCheckService,
  );
  const validateDocPointersUseCase = new ValidateDocPointersUseCase(
    configAdapter,
    documentScanner,
    pointerExtractor,
    pointerResolutionService,
  );
  const generateE2ETemplateUseCase = new GenerateE2ETemplateUseCase();

  return {
    checkDocFreshnessUseCase,
    validateDocPointersUseCase,
    generateE2ETemplateUseCase,
    checkFreshnessHandler: new CheckFreshnessHandler(checkDocFreshnessUseCase),
    validatePointersHandler: new ValidatePointersHandler(validateDocPointersUseCase),
    generateE2ETemplateHandler: new GenerateE2ETemplateHandler(generateE2ETemplateUseCase),
  };
}
