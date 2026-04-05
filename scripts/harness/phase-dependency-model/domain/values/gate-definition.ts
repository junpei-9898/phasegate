/**
 * @layer domain
 * @unit phase-dependency-model
 */

import { GateName } from './gate-name.js';
import { GateStoryAnnotation } from './gate-story-annotation.js';
import { PhaseLevel } from './phase-level.js';

export interface GateRequirement {
  readonly path: string;
  readonly required: boolean;
}

export interface GateDefinitionCreateArgs {
  readonly name: GateName;
  readonly level: PhaseLevel;
  readonly requires: readonly GateRequirement[];
  readonly blocks: readonly string[];
  readonly dependsOn: readonly GateName[];
  readonly storyAnnotation?: GateStoryAnnotation;
}

export class InvalidGateDefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidGateDefinitionError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseRequirement = (raw: unknown): GateRequirement => {
  if (!isRecord(raw) || typeof raw.path !== 'string' || typeof raw.required !== 'boolean') {
    throw new InvalidGateDefinitionError('requires の形式が不正です');
  }

  const path = raw.path.trim();
  if (path.length === 0) {
    throw new InvalidGateDefinitionError('requires.path は必須です');
  }

  return Object.freeze({
    path,
    required: raw.required,
  });
};

const parseStringArray = (raw: unknown, fieldName: string): readonly string[] => {
  if (!Array.isArray(raw) || raw.some((entry) => typeof entry !== 'string')) {
    throw new InvalidGateDefinitionError(`${fieldName} の形式が不正です`);
  }

  return Object.freeze(raw.map((entry) => entry.trim()));
};

export class GateDefinition {
  readonly name: GateName;
  readonly level: PhaseLevel;
  readonly requires: readonly GateRequirement[];
  readonly blocks: readonly string[];
  readonly dependsOn: readonly GateName[];
  readonly storyAnnotation?: GateStoryAnnotation;

  private constructor(args: GateDefinitionCreateArgs) {
    this.name = args.name;
    this.level = args.level;
    this.requires = Object.freeze([...args.requires]);
    this.blocks = Object.freeze([...args.blocks]);
    this.dependsOn = Object.freeze([...args.dependsOn]);
    this.storyAnnotation = args.storyAnnotation;
    Object.freeze(this);
  }

  static create(args: GateDefinitionCreateArgs): GateDefinition {
    if (args.storyAnnotation && args.level.value !== 3) {
      throw new InvalidGateDefinitionError('storyAnnotation は Level 3 のゲートにのみ指定できます');
    }

    return new GateDefinition(args);
  }

  static fromRaw(raw: unknown): GateDefinition {
    if (!isRecord(raw)) {
      throw new InvalidGateDefinitionError('GateDefinition の形式が不正です');
    }

    const name = GateName.create(String(raw.name ?? ''));
    const level = PhaseLevel.create(Number(raw.level));
    const requires = Array.isArray(raw.requires)
      ? Object.freeze(raw.requires.map((requirement) => parseRequirement(requirement)))
      : (() => {
          throw new InvalidGateDefinitionError('requires の形式が不正です');
        })();
    const blocks = parseStringArray(raw.blocks ?? [], 'blocks');
    const dependsOn = parseStringArray(raw.dependsOn ?? [], 'dependsOn').map((value) =>
      GateName.create(value),
    );
    const storyAnnotation =
      raw.storyAnnotation === undefined
        ? undefined
        : (() => {
            if (
              !isRecord(raw.storyAnnotation) ||
              typeof raw.storyAnnotation.required !== 'boolean' ||
              typeof raw.storyAnnotation.tag !== 'string'
            ) {
              throw new InvalidGateDefinitionError('storyAnnotation の形式が不正です');
            }

            return GateStoryAnnotation.create({
              required: raw.storyAnnotation.required,
              tag: raw.storyAnnotation.tag,
            });
          })();

    return GateDefinition.create({
      name,
      level,
      requires,
      blocks,
      dependsOn: Object.freeze(dependsOn),
      storyAnnotation,
    });
  }
}
