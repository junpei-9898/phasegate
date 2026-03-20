/**
 * @layer application
 * @unit biome-ast-engine
 */

import type { SourceModuleAnalyzerPort } from '../../domain/ports/source-module-analyzer-port.js';
import type { WorkspaceFilePort } from '../../domain/ports/workspace-file-port.js';
import type { ImportGraphBuilder } from '../../domain/services/import-graph-builder.js';
import type { AnalyzeImportGraphInput } from '../dto/analyze-import-graph-input.js';
import type { AnalyzeImportGraphOutput } from '../dto/analyze-import-graph-output.js';
import { toAnalyzeImportGraphOutput } from '../mappers/analyze-import-graph-output-mapper.js';

type ImportGraphBuilderRunner = Pick<ImportGraphBuilder, 'build'>;

export interface AnalyzeImportGraphUseCaseDeps {
  readonly workspaceFilePort: WorkspaceFilePort;
  readonly sourceModuleAnalyzerPort: SourceModuleAnalyzerPort;
  readonly importGraphBuilder: ImportGraphBuilderRunner;
}

export class AnalyzeImportGraphUseCase {
  private readonly workspaceFilePort: WorkspaceFilePort;
  private readonly sourceModuleAnalyzerPort: SourceModuleAnalyzerPort;
  private readonly importGraphBuilder: ImportGraphBuilderRunner;

  constructor(deps: AnalyzeImportGraphUseCaseDeps) {
    this.workspaceFilePort = deps.workspaceFilePort;
    this.sourceModuleAnalyzerPort = deps.sourceModuleAnalyzerPort;
    this.importGraphBuilder = deps.importGraphBuilder;
  }

  async execute(
    input: AnalyzeImportGraphInput = {}
  ): Promise<Readonly<AnalyzeImportGraphOutput>> {
    const files = await this.workspaceFilePort.listSourceFiles(input.targets);
    const snapshots = await this.sourceModuleAnalyzerPort.analyzeMany(files);
    const importGraph = this.importGraphBuilder.build(snapshots);

    return toAnalyzeImportGraphOutput(files, snapshots, importGraph);
  }
}
