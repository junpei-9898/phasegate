/**
 * @layer composition-root
 * @unit harness-error
 *
 * harness-error ユニットの Composition Root
 * 全コンポーネントの生成・配線を行い、外部公開インターフェースを返す
 */

// --- Infrastructure: Registry ---
import { buildErrorDefinitionRegistry } from './infrastructure/registry/build-error-definition-registry.js';
import { L1_ERROR_DEFINITIONS } from './infrastructure/registry/l1-error-definitions.js';
import { L2_ERROR_DEFINITIONS } from './infrastructure/registry/l2-error-definitions.js';
import { L3_ERROR_DEFINITIONS } from './infrastructure/registry/l3-error-definitions.js';
import { L4_ERROR_DEFINITIONS } from './infrastructure/registry/l4-error-definitions.js';

// --- Domain Services ---
import { SeverityContractEnforcer } from './domain/services/severity-contract-enforcer.js';
import { HarnessErrorFactory } from './domain/services/harness-error-factory.js';

// --- Infrastructure: Adapters ---
import { FileSystemAdrExistenceCheckerAdapter } from './infrastructure/adapters/file-system-adr-existence-checker-adapter.js';
import { TypeScriptSnippetSyntaxAdapter } from './infrastructure/adapters/type-script-snippet-syntax-adapter.js';
import { ValidatorRegistryBridgeAdapter } from './infrastructure/adapters/validator-registry-bridge-adapter.js';
import { ValidatorExecutionFixExampleValidatorAdapter } from './infrastructure/adapters/validator-execution-fix-example-validator-adapter.js';

// --- Application: Mappers ---
import { HarnessErrorContractMapper } from './application/mappers/harness-error-contract-mapper.js';

// --- Application: UseCases ---
import { CreateHarnessErrorUseCase } from './application/usecases/create-harness-error-use-case.js';
import { ListErrorDefinitionsUseCase } from './application/usecases/list-error-definitions-use-case.js';
import { ValidateFixExampleUseCase } from './application/usecases/validate-fix-example-use-case.js';
import { ValidateAllFixExamplesUseCase } from './application/usecases/validate-all-fix-examples-use-case.js';
import { NormalizeValidatorErrorsUseCase } from './application/usecases/normalize-validator-errors-use-case.js';
import { AssertSeverityContractUseCase } from './application/usecases/assert-severity-contract-use-case.js';

// --- Presentation: Formatters ---
import { HumanErrorFormatter } from './presentation/formatters/human-error-formatter.js';
import { AgentErrorFormatter } from './presentation/formatters/agent-error-formatter.js';
import { CiErrorFormatter } from './presentation/formatters/ci-error-formatter.js';

// --- Presentation: Handlers ---
import { RenderHarnessErrorsHandler } from './presentation/handlers/render-harness-errors-handler.js';
import { ListErrorDefinitionsHandler } from './presentation/handlers/list-error-definitions-handler.js';
import { ValidateFixExampleHandler } from './presentation/handlers/validate-fix-example-handler.js';

export function createHarnessErrorModule(rootDir: string) {
  // ── Registry ──
  const errorDefinitionRegistry = buildErrorDefinitionRegistry([
    L1_ERROR_DEFINITIONS,
    L2_ERROR_DEFINITIONS,
    L3_ERROR_DEFINITIONS,
    L4_ERROR_DEFINITIONS,
  ]);

  // ── Domain Services ──
  const severityContractEnforcer = new SeverityContractEnforcer();

  // ── Infrastructure Adapters ──
  const adrExistenceCheckerAdapter = new FileSystemAdrExistenceCheckerAdapter({
    rootDir,
  });
  const typeScriptSnippetSyntaxAdapter = new TypeScriptSnippetSyntaxAdapter();
  const validatorRegistryBridge = new ValidatorRegistryBridgeAdapter();
  const fixExampleValidatorAdapter =
    new ValidatorExecutionFixExampleValidatorAdapter({
      syntaxAdapter: typeScriptSnippetSyntaxAdapter,
      validatorRegistryBridge,
    });

  // ── Domain Factory ──
  const harnessErrorFactory = new HarnessErrorFactory({
    registry: errorDefinitionRegistry,
    severityContractEnforcer,
    adrExistenceCheckerPort: adrExistenceCheckerAdapter,
    fixExampleValidatorPort: fixExampleValidatorAdapter,
  });

  // ── Application: Mapper ──
  const contractMapper = new HarnessErrorContractMapper();

  // ── Application: UseCases ──
  const createHarnessErrorUseCase = new CreateHarnessErrorUseCase({
    harnessErrorFactory,
    contractMapper,
  });

  const listErrorDefinitionsUseCase = new ListErrorDefinitionsUseCase({
    errorDefinitionRegistry,
  });

  const validateFixExampleUseCase = new ValidateFixExampleUseCase({
    errorDefinitionRegistry,
    fixExampleValidator: fixExampleValidatorAdapter,
  });

  const validateAllFixExamplesUseCase = new ValidateAllFixExamplesUseCase({
    errorDefinitionRegistry,
    validateFixExampleUseCase,
  });

  const normalizeValidatorErrorsUseCase = new NormalizeValidatorErrorsUseCase({
    createHarnessErrorUseCase,
  });

  const assertSeverityContractUseCase = new AssertSeverityContractUseCase({
    errorDefinitionRegistry,
    severityContractEnforcer,
  });

  // ── Presentation: Formatters ──
  const humanFormatter = new HumanErrorFormatter();
  const agentFormatter = new AgentErrorFormatter();
  const ciFormatter = new CiErrorFormatter();

  // ── Presentation: Handlers ──
  const renderHarnessErrorsHandler = new RenderHarnessErrorsHandler({
    humanFormatter,
    agentFormatter,
    ciFormatter,
  });

  const listErrorDefinitionsHandler = new ListErrorDefinitionsHandler({
    listErrorDefinitionsUseCase,
  });

  const validateFixExampleHandler = new ValidateFixExampleHandler({
    validateFixExampleUseCase,
    validateAllFixExamplesUseCase,
  });

  return {
    renderHarnessErrorsHandler,
    listErrorDefinitionsHandler,
    validateFixExampleHandler,
    errorDefinitionRegistry,
    createHarnessErrorUseCase,
    normalizeValidatorErrorsUseCase,
  };
}
