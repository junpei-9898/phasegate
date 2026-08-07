// @unit ci-governance
// @layer domain
// @story H13-01
// @work-item-id WI-384

import { expect, it } from "vitest";
import { IntegrityTarget } from "../../../ci-governance/domain/value-objects/integrity-target.js";

it("Codex hook 定義を integrity pin の既定対象として列挙すること", () => {
  // Arrange / Act
  const actual = IntegrityTarget.defaultTargets();

  // Assert
  expect(actual.include).toContain(".codex/hooks.json");
});
