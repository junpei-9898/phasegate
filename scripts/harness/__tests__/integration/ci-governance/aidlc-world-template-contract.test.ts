// @unit ci-governance
// @layer integration
// @work-item-id WI-307
// @story H17-19
// @ac H17-19-3

import { expect, it, vi } from "vitest";
import { RenderCiTemplateUseCase } from "../../../ci-governance/application/usecases/render-ci-template-usecase.js";
import { TemplateGenerator } from "../../../ci-governance/domain/services/template-generator.js";
import { YamlTemplateRendererAdapter } from "../../../ci-governance/infrastructure/adapters/yaml-template-renderer-adapter.js";

it("aidlc-gateがmatrix・conditional derive二重一致・L3を順序どおり生成する", async () => {
  // Arrange
  const validatorPort = { listAll: vi.fn().mockResolvedValue(["v1", "v2"]) };
  const presetPort = { getPreset: vi.fn().mockResolvedValue({ failOnWarning: false }) };
  const generator = new TemplateGenerator(validatorPort, presetPort);
  const rendererPort = new YamlTemplateRendererAdapter(process.cwd());
  const useCase = new RenderCiTemplateUseCase(generator, rendererPort);

  // Act
  const actual = await useCase.execute({ presetId: "standard", templateType: "aidlc-gate" });
  const matrixIndex = actual.content.indexOf("phasegate:generate-matrix");
  const detectIndex = actual.content.indexOf("Detect World Model enablement");
  const deriveIndex = actual.content.indexOf("World derive determinism");
  const l3Index = actual.content.indexOf("L3 CI Check");

  // Assert
  expect(actual.content).toContain("config.world?.enabled === true");
  expect(actual.content).toContain("if: steps.world_config.outputs.enabled == 'true'");
  expect(actual.content).toContain('cmp --silent "$FIRST" "$SECOND"');
  expect(matrixIndex).toBeGreaterThan(-1);
  expect(detectIndex).toBeGreaterThan(matrixIndex);
  expect(deriveIndex).toBeGreaterThan(detectIndex);
  expect(l3Index).toBeGreaterThan(deriveIndex);
});
