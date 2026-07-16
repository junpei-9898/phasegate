// @unit agent-integration
// @layer test
// @work-item-id WI-304
// @story H17-16
// @ac H17-16-3
// @ac H17-16-4
// @ac H17-16-5
// @ac H17-16-6

import { describe, expect, it } from "vitest";
import type { OpenWorldObligationsContextDto } from "../../../agent-integration/application/dto/open-world-obligations-context-dto.js";
import {
  buildWorldObligationsSessionContext,
  countUnicodeScalars,
} from "../../../agent-integration/presentation/world-obligations-session-context.js";

const fingerprint = (character: string): string => `pgw:v1:violation-fingerprint:sha256:${character.repeat(64)}`;

const entry = (index: number): Extract<OpenWorldObligationsContextDto, { status: "available" }>["entries"][number] => ({
  kind: "structural",
  classification: "new-structural",
  ruleId: `WCR-00${index}`,
  constraintId: `pgw:v1:constraint:world.item-${index}`,
  violationFingerprint: fingerprint(String(index)),
  subjectId: null,
});

describe("World obligations SessionStart presentation", () => {
  it("最大5件を表示して残数を決定的な省略行にすること", () => {
    // Arrange
    const input: OpenWorldObligationsContextDto = {
      status: "available",
      entries: Array.from({ length: 7 }, (_, index) => entry(index + 1)),
      adoptedLegacyCount: 604,
    };

    // Act
    const actual = buildWorldObligationsSessionContext(input, { maxItems: 5, maxChars: 2000 });

    // Assert
    expect(actual?.match(/^- \[BLOCKING/gm)).toHaveLength(5);
    expect(actual).toContain("- Adopted legacy: 604 (summary only)");
    expect(actual).toContain("... 2 more; run phasegate world:derive");
  });

  it("2000 Unicode scalarを超えずentryを途中切断しないこと", () => {
    // Arrange
    const longEntries = Array.from({ length: 5 }, (_, index) => ({
      ...entry(index + 1),
      constraintId: `pgw:v1:constraint:world.${"x".repeat(900)}-${index}`,
    }));
    const input: OpenWorldObligationsContextDto = {
      status: "available",
      entries: longEntries,
      adoptedLegacyCount: 0,
    };

    // Act
    const actual = buildWorldObligationsSessionContext(input, { maxItems: 5, maxChars: 2000 });

    // Assert
    expect(actual).not.toBeNull();
    expect(countUnicodeScalars(actual ?? "")).toBeLessThanOrEqual(2000);
    expect(actual).toContain("... 4 more; run phasegate world:derive");
    expect(actual).not.toContain(`${"x".repeat(400)}…`);
  });

  it("configが大きな値でも5件2000 scalarのhard capを緩和しないこと", () => {
    // Arrange
    const input: OpenWorldObligationsContextDto = {
      status: "available",
      entries: Array.from({ length: 7 }, (_, index) => entry(index + 1)),
      adoptedLegacyCount: 0,
    };

    // Act
    const actual = buildWorldObligationsSessionContext(input, { maxItems: 20, maxChars: 8000 });

    // Assert
    expect(actual?.match(/^- \[BLOCKING/gm)).toHaveLength(5);
    expect(countUnicodeScalars(actual ?? "")).toBeLessThanOrEqual(2000);
    expect(actual).toContain("... 2 more; run phasegate world:derive");
  });

  it("Unicode surrogate pairを1 scalarとして上限判定すること", () => {
    // Arrange
    const first = entry(1);
    const input: OpenWorldObligationsContextDto = {
      status: "available",
      entries: [{ ...first, constraintId: `pgw:v1:constraint:world.${"😀".repeat(20)}` }],
      adoptedLegacyCount: 0,
    };
    const unrestricted = buildWorldObligationsSessionContext(input, { maxItems: 5, maxChars: 2000 }) ?? "";

    // Act
    const actual = buildWorldObligationsSessionContext(input, {
      maxItems: 5,
      maxChars: countUnicodeScalars(unrestricted),
    });

    // Assert
    expect(actual).toBe(unrestricted);
    expect(countUnicodeScalars(unrestricted)).toBeLessThan(unrestricted.length);
  });

  it("unavailableをrepo reasonなしの固定一行warningにすること", () => {
    // Arrange
    const input: OpenWorldObligationsContextDto = { status: "unavailable" };

    // Act
    const actual = buildWorldObligationsSessionContext(input, { maxItems: 5, maxChars: 2000 });

    // Assert
    expect(actual).toBe(
      "⚠ World obligations unavailable at SessionStart; continuing fail-open. Run phasegate world:derive.",
    );
    expect(actual?.split("\n")).toHaveLength(1);
  });

  it("disabledでは何も表示しないこと", () => {
    // Arrange / Act
    const actual = buildWorldObligationsSessionContext({ status: "disabled" }, { maxItems: 5, maxChars: 2000 });

    // Assert
    expect(actual).toBeNull();
  });
});
