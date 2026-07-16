// @unit world-model
// @layer composition
// @work-item-id WI-291
// @work-item-id WI-292
// @work-item-id WI-295

import { createAttestationModule, createSha256Capability } from "../attestation/index.js";
import { createTraceabilityModelModule } from "../traceability-model/index.js";
import {
  resolveWorldCorpusConfig,
  type WorldResolvedConfigInput,
} from "./application/dto/world-resolved-config-input.js";
import { BuildSnapshotUseCase } from "./application/usecases/build-snapshot-use-case.js";
import { DeriveObligationsUseCase } from "./application/usecases/derive-obligations-use-case.js";
import { InspectWorldUseCase } from "./application/usecases/inspect-world-use-case.js";
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
import { WorldInspectCommandHandler } from "./presentation/cli/world-inspect-command-handler.js";

const WORLD_SNAPSHOT_SCHEMA_VERSION = "phasegate-world-snapshot/v1";
const WORLD_EXTRACTOR_VERSION = "phasegate-world-extractor/v2";

export interface WorldModelModuleOptions {
  readonly rootDir: string;
  readonly resolvedConfig?: WorldResolvedConfigInput;
}

export function createWorldModelModule(options: WorldModelModuleOptions) {
  const config = resolveWorldCorpusConfig(options.resolvedConfig);
  const hashingPort = new AttestationSha256WorldHashingAdapter(createSha256Capability());
  const serializer = new CanonicalJsonSerializer();
  const markdownExtractor = new MarkdownDesignFactExtractor({ hashingPort });
  const traceabilityFacades = config.productScopes.map(
    (scope) =>
      createTraceabilityModelModule(options.rootDir, {
        pathRoots: {
          designDocsRoot: scope.designDocsRoot,
          inceptionRoot: config.inceptionRoot,
          testRoots: [`${config.sourceRoot}/__tests__`],
        },
      }).worldReadFacade,
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
    proposalExtractor: new ProposalFactExtractor({
      rootDir: options.rootDir,
      markdownExtractor,
      inceptionRoot: config.inceptionRoot,
    }),
    adrExtractor: new AdrFactExtractor({
      rootDir: options.rootDir,
      markdownExtractor,
      adrRoot: config.adrRoot,
    }),
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
    new SourceMetadataFactExtractor({
      rootDir: options.rootDir,
      hashingPort,
      sourceRoot: config.sourceRoot,
    }),
    new TestReferenceSourceFactExtractor({
      rootDir: options.rootDir,
      hashingPort,
      sourceRoot: config.sourceRoot,
    }),
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
  const corpusConfigDigest = hashingPort.sha256(serializer.serialize(config));
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
  const deriveObligationsUseCase = new DeriveObligationsUseCase({
    baselineRepository: new FileSystemAdoptionBaselineRepositoryAdapter({
      rootDir: options.rootDir,
    }),
    waiverRepository: new FileSystemWaiverDeclarationRepositoryAdapter({
      rootDir: options.rootDir,
    }),
    semanticDebtRepository: new FileSystemSemanticDebtRepositoryAdapter({
      rootDir: options.rootDir,
    }),
    policyInputsDigestDeriver: new PolicyInputsDigestDeriver(serializer, hashingPort),
    evaluationIdDeriver: new SnapshotRootDeriver(serializer, hashingPort),
    obligationDerivationService: new ObligationDerivationService(fingerprintDeriver),
    serializer,
    writer: new FileSystemObligationReportWriterAdapter({ rootDir: options.rootDir }),
  });
  const worldInspectCommandHandler = new WorldInspectCommandHandler({ inspectWorld: inspectWorldUseCase });

  return {
    buildSnapshotUseCase,
    deriveObligationsUseCase,
    inspectWorldUseCase,
    worldInspectCommandHandler,
  } as const;
}
