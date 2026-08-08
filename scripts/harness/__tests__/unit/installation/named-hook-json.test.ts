// @unit installation
// @layer application
// @story H11-01
// @work-item-id WI-385

import { describe, expect, it } from "vitest";
import { mergeNamedHookJson, removeNamedHookJson } from "../../../installation/application/named-hook-json.js";

const canonical = {
  "phasegate-gate": {
    PreToolUse: [
      {
        matcher: "write_to_file",
        hooks: [{ type: "command", command: "npx phasegate hook pre-tool-use", timeout: 30 }],
      },
    ],
  },
};

describe("Antigravity named hook JSON ownership", () => {
  it("利用者named keyを保持してphasegate定義だけを置換すること", () => {
    // Arrange
    const existing = {
      "user-hook": { hooks: [{ event: "PreToolUse", command: "custom" }] },
      "phasegate-gate": { stale: true },
    };

    // Act
    const actual = mergeNamedHookJson(existing, canonical);

    // Assert
    expect(actual).toEqual({ "user-hook": existing["user-hook"], "phasegate-gate": canonical["phasegate-gate"] });
  });

  it("再度named mergeしても構造とbyte列が安定すること", () => {
    // Arrange
    const first = mergeNamedHookJson({ "user-hook": { enabled: true } }, canonical);

    // Act
    const actual = JSON.stringify(mergeNamedHookJson(first, canonical), null, 2);

    // Assert
    expect(actual).toBe(JSON.stringify(first, null, 2));
  });

  it("削除時はphasegate所有keyだけを除いて利用者定義を残すこと", () => {
    // Arrange
    const existing = { "user-hook": { enabled: true }, ...canonical };

    // Act
    const actual = removeNamedHookJson(existing);

    // Assert
    expect(actual).toEqual({ "user-hook": { enabled: true } });
  });
});
