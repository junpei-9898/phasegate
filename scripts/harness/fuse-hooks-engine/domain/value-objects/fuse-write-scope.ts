/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

export type FusePhaseGateLevel = 1 | 2 | 3;

export interface FuseWriteScopeProps {
  readonly level: FusePhaseGateLevel;
  readonly unitId?: string;
  readonly storyId?: string;
}

export interface FuseWriteScopePathConfig {
  readonly source: readonly string[];
  readonly construction: string;
  readonly inception: string;
}

const WORK_ITEM_ID_PATTERN = /^[A-Z][\w]+-\d+$/;

/**
 * FUSE PreWrite で使用するスコープ検出 VO。
 * agent-integration の WriteTargetScope と同等のパス解析を fuse-hooks-engine 内で行う。
 */
export class FuseWriteScope {
  readonly level: FusePhaseGateLevel;
  readonly unitId: string | undefined;
  readonly storyId: string | undefined;

  private constructor(props: FuseWriteScopeProps) {
    this.level = props.level;
    this.unitId = props.unitId;
    this.storyId = props.storyId;
  }

  static fromPath(
    filePath: string,
    paths: FuseWriteScopePathConfig,
  ): FuseWriteScope | null {
    const normalized = normalize(filePath);

    if (normalized === '') return null;

    if (normalized.includes('/__tests__/') || normalized.startsWith('__tests__/')) {
      return null;
    }

    for (const sourcePath of paths.source) {
      const segments = matchPrefix(normalized, normalize(sourcePath));
      if (segments !== null) {
        const [unitId] = segments;
        if (unitId !== undefined) {
          return new FuseWriteScope({ level: 3, unitId });
        }
      }
    }

    const inceptionNorm = normalize(paths.inception);

    const sharedSegments = matchPrefix(normalized, `${inceptionNorm}/_shared`);
    if (sharedSegments !== null || normalized === `${inceptionNorm}/_shared`) {
      return new FuseWriteScope({ level: 1 });
    }

    const inceptionSegments = matchPrefix(normalized, inceptionNorm);
    if (inceptionSegments !== null) {
      const [unitId, secondSegment, thirdSegment] = inceptionSegments;

      if (unitId === 'issues') {
        return new FuseWriteScope({ level: 1 });
      }

      if (
        unitId !== undefined
        && secondSegment === 'issues'
        && thirdSegment !== undefined
        && WORK_ITEM_ID_PATTERN.test(thirdSegment)
      ) {
        return new FuseWriteScope({ level: 3, unitId, storyId: thirdSegment });
      }

      if (
        unitId !== undefined
        && secondSegment !== undefined
        && WORK_ITEM_ID_PATTERN.test(secondSegment)
      ) {
        return new FuseWriteScope({ level: 3, unitId, storyId: secondSegment });
      }
    }

    const constructionNorm = normalize(paths.construction);
    const constructionSegments = matchPrefix(normalized, constructionNorm);
    if (constructionSegments !== null) {
      const [unitId] = constructionSegments;
      if (unitId !== undefined) {
        return new FuseWriteScope({ level: 2, unitId });
      }
    }

    if (inceptionSegments !== null) {
      const [unitId] = inceptionSegments;
      if (unitId !== undefined) {
        return new FuseWriteScope({ level: 2, unitId });
      }
    }

    return null;
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
