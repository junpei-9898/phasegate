// @unit world-model
// @layer composition
// @work-item-id WI-291
// @work-item-id WI-292
// @work-item-id WI-295
// @work-item-id WI-296, WI-297
// @work-item-id WI-300
// @work-item-id WI-305

import { createAttestationModule, createSha256Capability } from "../attestation/index.js";
import { createTraceabilityModelModule } from "../traceability-model/index.js";
import {
  resolveWorldCorpusConfig,
  type WorldResolvedConfigInput,
} from "./application/dto/world-resolved-config-input.js";
import { PinnedDesignEndpointFacade } from "./application/facades/pinned-design-endpoint-facade.js";
import { BuildSnapshotUseCase } from "./application/usecases/build-snapshot-use-case.js";
import { DeriveObligationsUseCase } from "./application/usecases/derive-obligations-use-case.js";
import {
  DeriveWorldObligationsUseCase,
  type PolicyDatePort,
} from "./application/usecases/derive-world-obligations-use-case.js";
import { InspectWorldUseCase } from "./application/usecases/inspect-world-use-case.js";
import { PinConstraintEndpointUseCase } from "./application/usecases/pin-constraint-endpoint-use-case.js";
import { CanonicalJsonSerializer } from "./domain/services/canonical-json-serializer.js";
import { ObligationDerivationService } from "./domain/services/obligation-derivation-service.js";
import { PolicyInputsDigestDeriver } from "./domain/services/policy-inputs-digest-deriver.js";
import { SnapshotRootDeriver } from "./domain/services/snapshot-root-deriver.js";
import { ViolationFingerprintDeriver } from "./domain/services/violation-fingerprint-deriver.js";
import { AdrFactExtractor } from "./infrastructure/adapters/adr-fact-extractor.js";
import { AssembledWorldFactSource } from "./infrastructure/adapters/assembled-world-fact-source.js";
import {
  AttestationFactExtractor,
  AttestationVerificationHandlerAdapter,
} from "./infrastructure/adapters/attestation-fact-extractor.js";
import { AttestationSha256WorldHashingAdapter } from "./infrastructure/adapters/attestation-sha256-world-hashing-adapter.js";
import { CompositeDesignFactSource } from "./infrastructure/adapters/composite-design-fact-source.js";
import { DesignCorpusFactExtractor } from "./infrastructure/adapters/design-corpus-fact-extractor.js";
import { FileSystemObligationReportWriterAdapter } from "./infrastructure/adapters/file-system-obligation-report-writer-adapter.js";
import {
  FileSystemAdoptionBaselineRepositoryAdapter,
  FileSystemConstraintDeclarationRepositoryAdapter,
  FileSystemSemanticDebtRepositoryAdapter,
  FileSystemWaiverDeclarationRepositoryAdapter,
} from "./infrastructure/adapters/file-system-world-control-repository-adapters.js";
import { IntegrityManifestFactExtractor } from "./infrastructure/adapters/integrity-manifest-fact-extractor.js";
import { MarkdownDesignFactExtractor } from "./infrastructure/adapters/markdown-design-fact-extractor.js";
import { MatrixFactExtractor } from "./infrastructure/adapters/matrix-fact-extractor.js";
import { ProductFactExtractor } from "./infrastructure/adapters/product-fact-extractor.js";
import { ProposalFactExtractor } from "./infrastructure/adapters/proposal-fact-extractor.js";
import { SourceMetadataFactExtractor } from "./infrastructure/adapters/source-metadata-fact-extractor.js";
import { TestReferenceSourceFactExtractor } from "./infrastructure/adapters/test-reference-source-fact-extractor.js";
import { TraceabilityDesignFactAdapter } from "./infrastructure/adapters/traceability-design-fact-adapter.js";
import { TraceabilityWorldReadFacadeMerger } from "./infrastructure/adapters/traceability-world-read-facade-merger.js";
import { UnitFactExtractor } from "./infrastructure/adapters/unit-fact-extractor.js";
import { WorldDeriveCommandHandler } from "./presentation/cli/world-derive-command-handler.js";
import { WorldInspectCommandHandler } from "./presentation/cli/world-inspect-command-handler.js";
import { WorldPinCommandHandler } from "./presentation/cli/world-pin-command-handler.js";

const WORLD_SNAPSHOT_SCHEMA_VERSION = "phasegate-world-snapshot/v1";
const WORLD_EXTRACTOR_VERSION = "phasegate-world-extractor/v2";

export interface WorldModelModuleOptions {
  readonly rootDir: string;
  readonly resolvedConfig?: WorldResolvedConfigInput;
  readonly policyDate?: PolicyDatePort;
}

export function createWorldModelModule(options: WorldModelModuleOptions) {
  const config = resolveWorldCorpusConfig(options.resolvedConfig);
  const hashingPort = new AttestationSha256WorldHashingAdapter(createSha256Capability());
  const serializer = new CanonicalJsonSerializer();
  const markdownExtractor = new MarkdownDesignFactExtractor({ hashingPort });
  const traceabilityFacades = config.productScopes.flatMap((scope) =>
    config.inceptionRoots.map(
      (inceptionRoot) =>
        createTraceabilityModelModule(options.rootDir, {
          pathRoots: {
            designDocsRoot: scope.designDocsRoot,
            inceptionRoot,
            testRoots: config.sourceRoots.map((sourceRoot) => `${sourceRoot}/__tests__`),
          },
        }).worldReadFacade,
    ),
  );
  const designCorpus = new DesignCorpusFactExtractor({
    traceabilityAdapter: new TraceabilityDesignFactAdapter({
      facade: new TraceabilityWorldReadFacadeMerger(traceabilityFacades),
      hashingPort,
      serializer,
    }),
    productExtractor: new CompositeDesignFactSource(
      config.productScopes.map(
        (scope) =>
          new ProductFactExtractor({
            rootDir: options.rootDir,
            markdownExtractor,
            productRoot: scope.productRoot,
          }),
      ),
    ),
    proposalExtractor: new CompositeDesignFactSource(
      config.inceptionRoots.map(
        (inceptionRoot) => new ProposalFactExtractor({ rootDir: options.rootDir, markdownExtractor, inceptionRoot }),
      ),
    ),
    adrExtractor: new CompositeDesignFactSource(
      config.adrRoots.map((adrRoot) => new AdrFactExtractor({ rootDir: options.rootDir, markdownExtractor, adrRoot })),
    ),
    unitExtractor: new CompositeDesignFactSource(
      config.productScopes.map(
        (scope) =>
          new UnitFactExtractor({
            rootDir: options.rootDir,
            markdownExtractor,
            unitRoot: scope.unitRoot,
          }),
      ),
    ),
  });
  const attestationModule = createAttestationModule(options.rootDir);
  const factSource = new AssembledWorldFactSource([
    designCorpus,
    ...config.sourceRoots.flatMap((sourceRoot) => [
      new SourceMetadataFactExtractor({ rootDir: options.rootDir, hashingPort, sourceRoot }),
      new TestReferenceSourceFactExtractor({ rootDir: options.rootDir, hashingPort, sourceRoot }),
    ]),
    new MatrixFactExtractor({
      rootDir: options.rootDir,
      hashingPort,
      matrixPath: config.matrixPath,
      serializer,
    }),
    new AttestationFactExtractor({
      rootDir: options.rootDir,
      hashingPort,
      attestationPath: config.attestationPath,
      verificationFacade: new AttestationVerificationHandlerAdapter(attestationModule.verifyAttestationHandler),
      serializer,
    }),
    new IntegrityManifestFactExtractor({
      rootDir: options.rootDir,
      hashingPort,
      manifestPath: config.integrityManifestPath,
      serializer,
    }),
  ]);
  const corpusConfigDigest = hashingPort.sha256(
    serializer.serialize({
      schemaVersion: "phasegate-world-corpus-config/v1",
      productScopes: config.productScopes,
      inceptionRoots: config.inceptionRoots,
      adrRoots: config.adrRoots,
      sourceRoots: config.sourceRoots,
      include: config.include,
      exclude: config.exclude,
      inputs: {
        matrixPath: config.matrixPath,
        attestationPath: config.attestationPath,
        integrityManifestPath: config.integrityManifestPath,
      },
    }),
  );
  const buildSnapshotUseCase = new BuildSnapshotUseCase({
    factSource,
    rootDeriver: new SnapshotRootDeriver(serializer, hashingPort),
    serializer,
    schemaVersion: WORLD_SNAPSHOT_SCHEMA_VERSION,
    extractorVersion: WORLD_EXTRACTOR_VERSION,
    corpusConfigDigest,
  });
  const inspectWorldUseCase = new InspectWorldUseCase({ buildSnapshot: buildSnapshotUseCase });
  const fingerprintDeriver = new ViolationFingerprintDeriver(serializer, hashingPort);
  const constraintRepository = new FileSystemConstraintDeclarationRepositoryAdapter({
    rootDir: options.rootDir,
    fileName: config.constraintsPath,
  });
  const rootDeriver = new SnapshotRootDeriver(serializer, hashingPort);
  const deriveObligationsUseCase = new DeriveObligationsUseCase({
    baselineRepository: new FileSystemAdoptionBaselineRepositoryAdapter({
      rootDir: options.rootDir,
      fileName: config.baselinePath,
    }),
    waiverRepository: new FileSystemWaiverDeclarationRepositoryAdapter({
      rootDir: options.rootDir,
      fileName: config.waiversPath,
    }),
    semanticDebtRepository: new FileSystemSemanticDebtRepositoryAdapter({
      rootDir: options.rootDir,
      fileName: config.debtsPath,
    }),
    policyInputsDigestDeriver: new PolicyInputsDigestDeriver(serializer, hashingPort),
    evaluationIdDeriver: new SnapshotRootDeriver(serializer, hashingPort),
    obligationDerivationService: new ObligationDerivationService(fingerprintDeriver),
    serializer,
    writer: new FileSystemObligationReportWriterAdapter({
      rootDir: options.rootDir,
      reportPath: config.obligationReportPath,
    }),
  });
  const deriveWorldObligationsUseCase = new DeriveWorldObligationsUseCase({
    buildSnapshot: buildSnapshotUseCase,
    constraintRepository,
    rootDeriver,
    deriveObligations: deriveObligationsUseCase,
    policyDate: options.policyDate ?? {
      currentUtcDate: () => new Date().toISOString().slice(0, 10),
    },
    constraintConfigDigest: hashingPort.sha256(
      serializer.serialize({
        schemaVersion: "phasegate-world-constraint-config/v1",
        constraintsPath: config.constraintsPath,
      }),
    ),
    evaluationConfigDigest: hashingPort.sha256(
      serializer.serialize({
        schemaVersion: "phasegate-world-evaluation-config/v1",
        rulesetVersion: "phasegate-world-wcr/v1",
      }),
    ),
    constraintPath: config.constraintsPath,
  });
  const pinConstraintEndpointUseCase = new PinConstraintEndpointUseCase(buildSnapshotUseCase, constraintRepository);
  const pinnedDesignEndpointFacade = new PinnedDesignEndpointFacade(constraintRepository);
  const worldInspectCommandHandler = new WorldInspectCommandHandler({ inspectWorld: inspectWorldUseCase });
  const worldPinCommandHandler = new WorldPinCommandHandler(pinConstraintEndpointUseCase);
  const worldDeriveCommandHandler = new WorldDeriveCommandHandler(
    deriveWorldObligationsUseCase,
    config.obligationReportPath,
  );

  return {
    buildSnapshotUseCase,
    deriveObligationsUseCase,
    deriveWorldObligationsUseCase,
    inspectWorldUseCase,
    pinConstraintEndpointUseCase,
    pinnedDesignEndpointFacade,
    worldDeriveCommandHandler,
    worldInspectCommandHandler,
    worldPinCommandHandler,
  } as const;
}
