/**
 * @layer domain
 * @unit config-foundation
 */
import { ConfigFoundationDomainError } from './errors/config-foundation-domain-error.js';
import { ConfigValidationError } from './errors/config-validation-error.js';
import { UnsupportedFeatureError } from './errors/unsupported-feature-error.js';
import { LayersConfig } from './value-objects/layers-config.js';
import { PathsConfig } from './value-objects/paths-config.js';
import { PhaseDependenciesConfig } from './value-objects/phase-dependencies-config.js';
import type { PhaseDependenciesPresetId } from './value-objects/phase-dependencies-config.js';
import { PlanningModeConfig } from './value-objects/planning-mode-config.js';
import { ProjectConfig } from './value-objects/project-config.js';
import { QuickModeConfig } from './value-objects/quick-mode-config.js';
import { ReportingConfig } from './value-objects/reporting-config.js';
import { ValidateConfig } from './value-objects/validate-config.js';
import { HarnessesConfig } from './value-objects/harnesses-config.js';
import type { FeatureNameValue } from './value-objects/feature-name.js';
import type { FeatureName } from './value-objects/feature-name.js';
import type { L1Config } from './value-objects/l1-config.js';
import type { L2Config } from './value-objects/l2-config.js';
import type { L3Config } from './value-objects/l3-config.js';
import type { L4Config } from './value-objects/l4-config.js';
import type {
  ArchitectureConfigDocument,
  ArchitectureConfigSource,
} from './value-objects/architecture-config.js';

export type LayerId = 'L1' | 'L2' | 'L3' | 'L4';
export type PresetId = 'minimal' | 'standard' | 'strict';
export type PlanningModeValue = 'interactive' | 'embedded-qa';
export type { PhaseDependenciesPresetId };
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer TItem>
    ? Array<DeepPartial<TItem>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export interface HarnessConfigSourceDocument {
  project: {
    name: string;
    preset: PresetId;
  };
  layers: DeepPartial<HarnessConfigResolvedDocument['layers']>;
  quickMode: Partial<HarnessConfigResolvedDocument['quickMode']>;
  phaseDependencies: HarnessConfigResolvedDocument['phaseDependencies'];
  planningMode: HarnessConfigResolvedDocument['planningMode'];
  harnesses: Partial<HarnessConfigResolvedDocument['harnesses']>;
  paths: HarnessConfigResolvedDocument['paths'];
  reporting: HarnessConfigResolvedDocument['reporting'];
  ci?: HarnessConfigResolvedDocument['ci'];
  validate?: HarnessConfigResolvedDocument['validate'];
  preCommit?: Partial<HarnessConfigResolvedDocument['preCommit']>;
  architecture?: ArchitectureConfigSource;
}

export interface HarnessConfigResolvedDocument {
  project: {
    name: string;
    preset: PresetId;
  };
  layers: {
    L1: {
      enabled: boolean;
      rules: Record<string, string>;
    };
    L2: {
      enabled: boolean;
      validators: string[];
    };
    L3: {
      enabled: boolean;
      validators: string[];
      coverageThreshold: number;
    };
    L4: {
      enabled: boolean;
      validators: string[];
      schedule: string;
    };
  };
  quickMode: {
    allowedCategories: string[];
    maintainedLayers: string[];
    relaxedGates: string[];
  };
  phaseDependencies: {
    preset: PhaseDependenciesPresetId;
    override: boolean;
    customRules: Array<{
      phase: string;
      requires: string[];
    }>;
  };
  planningMode: {
    default: PlanningModeValue;
    perPhase: Record<string, PlanningModeValue>;
  };
  harnesses: {
    agentLessonCollection: boolean;
    cascadeUpdate: boolean;
    bundleSizeLimit: number;
    deadCodeGC: boolean;
  };
  paths: {
    designDocs: string;
    inceptionDocs: string;
  };
  reporting: {
    format: string;
    outputDir: string;
  };
  ci?: {
    enabled: boolean;
  };
  validate: {
    failOnWarning: boolean;
  };
  preCommit?: {
    implementationExtensions: string[];
  };
  architecture?: ArchitectureConfigDocument;
}

export type HarnessConfigV2 = HarnessConfigResolvedDocument;
export type HarnessConfigV2Props = HarnessConfigResolvedDocument;

export interface HarnessConfigReconstitutionProps {
  sourceDocument: HarnessConfigSourceDocument;
  resolvedDocument: HarnessConfigResolvedDocument;
  pendingEvents?: readonly DomainEvent[];
}

export interface FeatureToggled {
  type: 'FeatureToggled';
  occurredAt: Date;
  projectName: string;
  featureName: FeatureNameValue | string;
  previousState: boolean;
  currentState: boolean;
}

export interface PresetApplied {
  type: 'PresetApplied';
  occurredAt: Date;
  projectName: string;
  preset: PresetId;
  changedSections: readonly string[];
}

export type DomainEvent = FeatureToggled | PresetApplied;

const SUPPORTED_FEATURE_NAMES = [
  'agentLessonCollection',
  'cascadeUpdate',
  'bundleSizeLimit',
  'deadCodeGC',
] as const satisfies readonly FeatureNameValue[];

export class UnknownLayerError extends ConfigFoundationDomainError {
  constructor(layerId: string) {
    super(`未知のレイヤーです: ${layerId} [L1-006]`, 'L1-006');
    this.name = 'UnknownLayerError';
  }
}

export class FeatureActivationRuleError extends ConfigFoundationDomainError {
  constructor(message: string) {
    super(`${message} [L1-005]`, 'L1-005');
    this.name = 'FeatureActivationRuleError';
  }
}

function deepClone<T>(value: T): T {
  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as T;
  }

  if (value !== null && typeof value === 'object') {
    const clonedEntries = Object.entries(value).map(([key, entryValue]) => [
      key,
      deepClone(entryValue),
    ]);

    return Object.fromEntries(clonedEntries) as T;
  }

  return value;
}

function createFeatureToggledEvent(
  projectName: string,
  featureName: string,
  previousState: boolean,
  currentState: boolean,
): FeatureToggled {
  return Object.freeze({
    type: 'FeatureToggled',
    occurredAt: new Date(),
    projectName,
    featureName,
    previousState,
    currentState,
  });
}

function assertSupportedFeature(name: FeatureName): FeatureNameValue {
  const raw = name.toString();

  if (!SUPPORTED_FEATURE_NAMES.includes(raw as FeatureNameValue)) {
    throw new UnsupportedFeatureError(
      `機能名 "${raw}" は利用できません。利用可能: ${SUPPORTED_FEATURE_NAMES.join(', ')}`,
    );
  }

  return raw as FeatureNameValue;
}

function toHarnessesDocument(harnesses: HarnessesConfig): HarnessConfigResolvedDocument['harnesses'] {
  return {
    agentLessonCollection: harnesses.agentLessonCollection,
    cascadeUpdate: harnesses.cascadeUpdate,
    bundleSizeLimit: harnesses.bundleSizeLimit,
    deadCodeGC: harnesses.deadCodeGC,
  };
}

export class HarnessConfig {
  readonly project: ProjectConfig;
  readonly layers: LayersConfig;
  readonly quickMode: QuickModeConfig;
  readonly phaseDependencies: PhaseDependenciesConfig;
  readonly planningMode: PlanningModeConfig;
  readonly paths: PathsConfig;
  readonly reporting: ReportingConfig;
  readonly validate: ValidateConfig;
  harnesses: HarnessesConfig;

  private sourceDocument: HarnessConfigSourceDocument;
  private resolvedDocument: HarnessConfigResolvedDocument;
  private pendingEvents: DomainEvent[];

  private constructor(props: {
    project: ProjectConfig;
    layers: LayersConfig;
    quickMode: QuickModeConfig;
    phaseDependencies: PhaseDependenciesConfig;
    planningMode: PlanningModeConfig;
    harnesses: HarnessesConfig;
    paths: PathsConfig;
    reporting: ReportingConfig;
    validate: ValidateConfig;
    sourceDocument: HarnessConfigSourceDocument;
    resolvedDocument: HarnessConfigResolvedDocument;
    pendingEvents: readonly DomainEvent[];
  }) {
    this.project = props.project;
    this.layers = props.layers;
    this.quickMode = props.quickMode;
    this.phaseDependencies = props.phaseDependencies;
    this.planningMode = props.planningMode;
    this.harnesses = props.harnesses;
    this.paths = props.paths;
    this.reporting = props.reporting;
    this.validate = props.validate;
    this.sourceDocument = deepClone(props.sourceDocument);
    this.resolvedDocument = deepClone(props.resolvedDocument);
    this.pendingEvents = [...props.pendingEvents];
  }

  static reconstitute(props: HarnessConfigReconstitutionProps): HarnessConfig {
    const project = ProjectConfig.create(props.resolvedDocument.project);
    const layers = LayersConfig.create(props.resolvedDocument.layers);
    const quickMode = QuickModeConfig.create(props.resolvedDocument.quickMode);
    const phaseDependencies = PhaseDependenciesConfig.create(
      props.resolvedDocument.phaseDependencies,
    );
    const planningMode = PlanningModeConfig.create(
      props.resolvedDocument.planningMode,
    );
    const harnesses = HarnessesConfig.create(props.resolvedDocument.harnesses);
    const paths = PathsConfig.create(props.resolvedDocument.paths);
    const reporting = ReportingConfig.create(props.resolvedDocument.reporting);
    const validate = ValidateConfig.create(props.resolvedDocument.validate);

    if (
      props.sourceDocument.project.preset !== props.resolvedDocument.project.preset
    ) {
      throw new ConfigValidationError(
        'sourceDocument.project.preset と resolvedDocument.project.preset は一致しなければなりません',
      );
    }

    return new HarnessConfig({
      project,
      layers,
      quickMode,
      phaseDependencies,
      planningMode,
      harnesses,
      paths,
      reporting,
      validate,
      sourceDocument: props.sourceDocument,
      resolvedDocument: props.resolvedDocument,
      pendingEvents: props.pendingEvents ?? [],
    });
  }

  enableFeature(name: FeatureName): void {
    const featureName = assertSupportedFeature(name);
    const previousState = this.harnesses.isEnabled(name);
    const nextHarnesses = this.harnesses.enable(name);

    this.harnesses = nextHarnesses;
    this.sourceDocument = {
      ...this.sourceDocument,
      harnesses: {
        ...this.sourceDocument.harnesses,
        [featureName]: toHarnessesDocument(nextHarnesses)[featureName],
      },
    };
    this.resolvedDocument = {
      ...this.resolvedDocument,
      harnesses: toHarnessesDocument(nextHarnesses),
    };
    this.pendingEvents.push(
      createFeatureToggledEvent(
        this.project.name,
        featureName,
        previousState,
        true,
      ),
    );
  }

  disableFeature(name: FeatureName): void {
    const featureName = assertSupportedFeature(name);
    const previousState = this.harnesses.isEnabled(name);
    const nextHarnesses = this.harnesses.disable(name);

    this.harnesses = nextHarnesses;
    this.sourceDocument = {
      ...this.sourceDocument,
      harnesses: {
        ...this.sourceDocument.harnesses,
        [featureName]: toHarnessesDocument(nextHarnesses)[featureName],
      },
    };
    this.resolvedDocument = {
      ...this.resolvedDocument,
      harnesses: toHarnessesDocument(nextHarnesses),
    };
    this.pendingEvents.push(
      createFeatureToggledEvent(
        this.project.name,
        featureName,
        previousState,
        false,
      ),
    );
  }

  getLayerConfig(layerId: LayerId): L1Config | L2Config | L3Config | L4Config {
    if (!['L1', 'L2', 'L3', 'L4'].includes(layerId)) {
      throw new UnknownLayerError(layerId);
    }

    return this.layers.get(layerId);
  }

  isFeatureEnabled(name: FeatureName): boolean {
    assertSupportedFeature(name);

    return this.harnesses.isEnabled(name);
  }

  toResolvedConfig(): HarnessConfigV2 {
    return deepClone(this.resolvedDocument);
  }

  toSourceDocument(): HarnessConfigSourceDocument {
    return deepClone(this.sourceDocument);
  }

  pullDomainEvents(): readonly DomainEvent[] {
    const events = [...this.pendingEvents];

    this.pendingEvents = [];

    return events;
  }
}
