// @unit agent-integration
// @layer infrastructure

import * as path from 'node:path';
import * as fs from 'node:fs/promises';

import type { PhaseGateQueryPort } from '../../domain/ports/phase-gate-query-port.js';
import type { WriteTargetScope } from '../../domain/value-objects/write-target-scope.js';
import { PhaseGateQueryResult } from '../../domain/value-objects/phase-gate-query-result.js';
import { toPhaseConfigSection } from '../../../config-foundation/application/mappers/phase-config-section-mapper.js';
import { createConfigFoundationModule } from '../../../config-foundation/composition-root.js';
import { ConfigValidationError } from '../../../config-foundation/domain/errors/config-validation-error.js';

const REQUIRED_DESIGN_DOCS: readonly string[] = Object.freeze(['logical_design.md', 'domain_model.md']);

export class PhaseGateQueryAdapter implements PhaseGateQueryPort {
  async checkGate(scope: WriteTargetScope, targetFilePath?: string): Promise<PhaseGateQueryResult> {
    try {
      const configModule = createConfigFoundationModule();
      const resolvedConfig = await configModule.usecases.loadResolvedConfigUseCase.execute();
      const { createPhaseDependencyModelModule } = await import('../../../phase-dependency-model/composition-root.js');
      const mod = createPhaseDependencyModelModule({
        rootDir: process.cwd(),
        phaseConfig: toPhaseConfigSection(resolvedConfig.config),
        reportOutputDir: resolvedConfig.config.reporting.outputDir,
      });
      const result = await mod.checkPhaseGateCommandHandler.execute({
        targetLevel: scope.level,
        unitId: scope.unitId,
        storyId: scope.storyId,
        targetFilePath,
      });

      if (result.exitCode === 0) {
        return PhaseGateQueryResult.create(true, [], []);
      }

      if (result.exitCode === 1) {
        return PhaseGateQueryResult.create(false, [result.text], []);
      }

      return PhaseGateQueryResult.create(true, [], ['phase gate check returned error']);
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        return PhaseGateQueryResult.create(false, [error.message], []);
      }

      return PhaseGateQueryResult.create(true, [], ['phase-dependency-model not available']);
    }
  }

  async checkDesignDocsExist(unitId: string): Promise<boolean> {
    if (unitId === '') {
      return false;
    }

    try {
      const configModule = createConfigFoundationModule();
      const resolvedConfig = await configModule.usecases.loadResolvedConfigUseCase.execute();
      const designDocsRoot = resolvedConfig.config.paths.designDocs;
      const unitDir = path.resolve(process.cwd(), designDocsRoot, unitId);

      for (const docName of REQUIRED_DESIGN_DOCS) {
        try {
          await fs.access(path.join(unitDir, docName));
        } catch {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }
}
