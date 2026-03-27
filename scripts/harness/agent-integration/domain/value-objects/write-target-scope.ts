// @unit agent-integration
// @layer domain

import { posix as path } from 'node:path';
import { WriteTargetScopeInvariantError } from '../errors/write-target-scope-invariant-error.js';
import { type PhaseGateLevel } from '../types/phase-gate-level.js';
import { ProjectPaths } from './project-paths.js';

type WriteTargetScopeProps = {
  level: PhaseGateLevel;
  unitId?: string;
  storyId?: string;
};

const STORY_ID_PATTERN = /^[A-Z]+\d+-\d+$/;

export class WriteTargetScope {
  readonly level: PhaseGateLevel;
  readonly unitId: string | undefined;
  readonly storyId: string | undefined;

  private constructor(props: WriteTargetScopeProps) {
    this.level = props.level;
    this.unitId = props.unitId;
    this.storyId = props.storyId;
  }

  static create(props: WriteTargetScopeProps): WriteTargetScope {
    if (props.level !== 1 && props.level !== 2 && props.level !== 3) {
      throw new WriteTargetScopeInvariantError('level は 1, 2, 3 のいずれかである必要があります（INV-6違反）');
    }

    if (props.level === 1 && (props.unitId !== undefined || props.storyId !== undefined)) {
      throw new WriteTargetScopeInvariantError('level=1 の場合、unitId と storyId は指定できません（INV-7違反）');
    }

    if (props.level === 2 && (props.unitId === undefined || props.storyId !== undefined)) {
      throw new WriteTargetScopeInvariantError('level=2 の場合、unitId は必須で storyId は指定できません（INV-8違反）');
    }

    if (props.level === 3 && props.unitId === undefined) {
      throw new WriteTargetScopeInvariantError('level=3 の場合、unitId は必須です（INV-9違反）');
    }

    return new WriteTargetScope(props);
  }

  static fromPath(filePath: string, projectPaths: ProjectPaths): WriteTargetScope | null {
    const normalizedPath = normalize(filePath);

    if (normalizedPath === '') {
      return null;
    }

    if (normalizedPath.includes('/__tests__/') || normalizedPath.startsWith('__tests__/')) {
      return null;
    }

    for (const sourcePath of projectPaths.getSource()) {
      const sourceMatch = matchPrefix(normalizedPath, sourcePath);
      if (sourceMatch !== null) {
        const [unitId] = sourceMatch;
        if (unitId !== undefined) {
          return WriteTargetScope.create({ level: 3, unitId });
        }
      }
    }

    const inceptionPath = projectPaths.getDocsInception();
    const inceptionMatch = matchPrefix(normalizedPath, inceptionPath);
    if (inceptionMatch !== null) {
      const [unitId, storyId] = inceptionMatch;
      if (unitId !== undefined && storyId !== undefined && STORY_ID_PATTERN.test(storyId)) {
        return WriteTargetScope.create({ level: 3, unitId, storyId });
      }
    }

    const sharedMatch = matchPrefix(normalizedPath, `${inceptionPath}/_shared`);
    if (sharedMatch !== null || normalizedPath === normalize(`${inceptionPath}/_shared`)) {
      return WriteTargetScope.create({ level: 1 });
    }

    const constructionMatch = matchPrefix(normalizedPath, projectPaths.getDocsConstruction());
    if (constructionMatch !== null) {
      const [unitId] = constructionMatch;
      if (unitId !== undefined) {
        return WriteTargetScope.create({ level: 2, unitId });
      }
    }

    if (inceptionMatch !== null) {
      const [unitId] = inceptionMatch;
      if (unitId !== undefined) {
        return WriteTargetScope.create({ level: 2, unitId });
      }
    }

    const productRoot = normalize(path.dirname(normalize(projectPaths.getDocsConstruction())));
    const productMatch = matchPrefix(normalizedPath, productRoot);
    if (
      productMatch !== null
      && productMatch.length === 1
      && productMatch[0] !== undefined
      && productMatch[0].includes('.')
    ) {
      return WriteTargetScope.create({ level: 1 });
    }

    return null;
  }

  equals(other: WriteTargetScope): boolean {
    return this.level === other.level
      && this.unitId === other.unitId
      && this.storyId === other.storyId;
  }
}

const normalize = (value: string): string =>
  value.replaceAll('\\', '/').replace(/^\.\/+/, '').replace(/\/+/g, '/').replace(/\/$/, '');

const matchPrefix = (targetPath: string, basePath: string): string[] | null => {
  const normalizedBase = normalize(basePath);

  if (targetPath === normalizedBase) {
    return [];
  }

  if (!targetPath.startsWith(`${normalizedBase}/`)) {
    return null;
  }

  const remainder = targetPath.slice(normalizedBase.length + 1);
  return remainder === '' ? [] : remainder.split('/');
};
