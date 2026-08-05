/**
 * @layer infrastructure
 * @unit validator-system
 *
 * PhaseDependencyPhaseGatePolicyAdapter — PhaseGatePolicyPort実装
 */
import type { PhaseGatePolicyPort } from "../../domain/ports/phase-gate-policy-port.js";
import type { HarnessErrorLike } from "../../domain/value-objects/validation-result.js";

/**
 * WI-357 (issue #29): `validate --layer L2` の失敗出力には従来
 * 'phase gate prerequisites are not met' という事実の再掲しか載らず、
 * 「何を作れば通るのか」がどの経路からも得られなかった。
 * hook の block メッセージ側にしか復旧手順がないため、CLI から検証した
 * エージェントは不足文書を推測で書くしかなくなる。
 *
 * 実行可能な復旧手順（scaffold コマンド）と、文書のセクション構成の在り処
 * （skills/<skill>/SKILL.md、未配置なら `phasegate skills info`）を suggestion に載せる。
 */
export function buildPhaseGateRecoverySuggestion(unitName: string): string {
  const unitArg = unitName.trim().length > 0 ? unitName.trim() : "<unit-id>";
  return [
    `不足している設計文書を scaffold で作成してください: npx phasegate scaffold-design --unit ${unitArg} --phase <logical|domain|uiux|unit-test|it-test> --apply`,
    "各文書のセクション構成は導入先 repo の skills/<skill>/SKILL.md に記載されています（logical_design.md → skills/logical-designer/SKILL.md、domain_model.md → skills/domain-designer/SKILL.md、unit plan → skills/unit-designer/SKILL.md）。",
    "skills/ が repo に無い場合は `npx phasegate skills info <skill-name>` で同じ内容を stdout から読めます。",
  ].join("\n");
}

export class PhaseDependencyPhaseGatePolicyAdapter implements PhaseGatePolicyPort {
  async checkPrerequisites(context: { unitName: string; currentPhase: string }): Promise<{
    satisfied: boolean;
    violations: readonly HarnessErrorLike[];
  }> {
    if (context.unitName.trim().length === 0) {
      return { satisfied: true, violations: [] };
    }

    try {
      // WI-085: paths config を phase-dependency-model に流入させる
      const { createConfigFoundationModule } = await import("../../../config-foundation/composition-root.js");
      const { toPhaseConfigSection } = await import(
        "../../../config-foundation/application/mappers/phase-config-section-mapper.js"
      );
      const configModule = createConfigFoundationModule();
      const resolvedConfig = await configModule.usecases.loadResolvedConfigUseCase.execute();
      const { createPhaseDependencyModelModule } = await import("../../../phase-dependency-model/composition-root.js");
      const mod = createPhaseDependencyModelModule({
        rootDir: process.cwd(),
        phaseConfig: toPhaseConfigSection(resolvedConfig.config),
        reportOutputDir: resolvedConfig.config.reporting.outputDir,
      });
      const result = await mod.checkPhaseGateCommandHandler.execute({
        targetLevel: 2,
        unitId: context.unitName,
      });

      if (result.exitCode === 0) {
        return { satisfied: true, violations: [] };
      }

      if (result.exitCode === 1) {
        return {
          satisfied: false,
          violations: [
            {
              code: { value: "L2-001", toString: () => "L2-001" },
              severity: { value: "error", toString: () => "error" },
              message: result.text,
              suggestion: buildPhaseGateRecoverySuggestion(context.unitName),
            },
          ],
        };
      }

      // Fail-closed: an unexpected exit code means prerequisites could not be confirmed.
      console.error(`[validator-system] phase gate check returned unexpected exit code ${result.exitCode}`);
      return {
        satisfied: false,
        violations: [
          {
            code: { value: "L2-002", toString: () => "L2-002" },
            severity: { value: "error", toString: () => "error" },
            message: `phase gate check returned unexpected exit code ${result.exitCode}; prerequisites cannot be confirmed`,
            suggestion: "phase gate prerequisites could not be evaluated; treating as NOT satisfied (fail-closed)",
          },
        ],
      };
    } catch (err) {
      // Fail-closed: if the phase-dependency-model could not be loaded/executed we cannot
      // confirm prerequisites are met, so treat them as NOT satisfied rather than opening the gate.
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[validator-system] phase gate prerequisite check failed to run: ${message}`);
      return {
        satisfied: false,
        violations: [
          {
            code: { value: "L2-002", toString: () => "L2-002" },
            severity: { value: "error", toString: () => "error" },
            message: `phase gate prerequisite check could not be evaluated: ${message}`,
            suggestion: "phase gate prerequisites could not be evaluated; treating as NOT satisfied (fail-closed)",
          },
        ],
      };
    }
  }
}
