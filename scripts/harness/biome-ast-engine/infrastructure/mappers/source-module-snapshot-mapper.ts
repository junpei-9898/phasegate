/**
 * @layer infrastructure
 * @unit biome-ast-engine
 */

import type { ArchitectureSpec } from '../../domain/value-objects/architecture-spec.js';
import { FilePath } from '../../domain/value-objects/file-path.js';
import { ImportEdge } from '../../domain/value-objects/import-edge.js';
import { SourceModuleSnapshot } from '../../domain/value-objects/source-module-snapshot.js';

export type RawImportData = {
  readonly from: string;
  readonly to: string;
  readonly importKind: 'value' | 'type' | 'dynamic';
};

export type RawModuleData = {
  readonly filePath: string;
  readonly declaredUnit: string | null;
  readonly declaredLayer: string | null;
  readonly imports: readonly RawImportData[];
  readonly anyTypeCount: number;
  readonly typedNodeCount: number;
  readonly commentLineCount: number;
  readonly logicalLineCount: number;
  readonly repeatedCommentBlocks: number;
  readonly duplicationFingerprints: readonly string[];
  readonly exportedSymbols: readonly string[];
  readonly isEntrypointCandidate: boolean;
};

/**
 * AST解析結果の生データを SourceModuleSnapshot 値オブジェクトへ変換する。
 */
export const toSourceModuleSnapshot = (
  raw: RawModuleData,
  architecture?: ArchitectureSpec
): SourceModuleSnapshot => {
  const filePath = FilePath.fromWorkspaceRelative(raw.filePath);

  const imports = raw.imports.map((edge) =>
    ImportEdge.create({
      from: FilePath.fromWorkspaceRelative(edge.from),
      to: FilePath.fromWorkspaceRelative(edge.to),
      importKind: edge.importKind,
    })
  );

  return SourceModuleSnapshot.create(
    {
      filePath,
      declaredUnit: raw.declaredUnit,
      declaredLayer: raw.declaredLayer,
      imports,
      anyTypeCount: raw.anyTypeCount,
      typedNodeCount: raw.typedNodeCount,
      commentLineCount: raw.commentLineCount,
      logicalLineCount: raw.logicalLineCount,
      repeatedCommentBlocks: raw.repeatedCommentBlocks,
      duplicationFingerprints: raw.duplicationFingerprints,
      exportedSymbols: raw.exportedSymbols,
      isEntrypointCandidate: raw.isEntrypointCandidate,
    },
    architecture
  );
};

/**
 * 複数の生データを一括変換する。
 */
export const toSourceModuleSnapshots = (
  rawList: readonly RawModuleData[],
  architecture?: ArchitectureSpec
): readonly SourceModuleSnapshot[] =>
  rawList.map((raw) => toSourceModuleSnapshot(raw, architecture));
