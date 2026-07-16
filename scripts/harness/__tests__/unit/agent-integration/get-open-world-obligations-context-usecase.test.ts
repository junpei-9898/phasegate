// @unit agent-integration
// @layer test
// @work-item-id WI-304
// @story H17-16
// @ac H17-16-1
// @ac H17-16-2
// @ac H17-16-3
// @ac H17-16-5

import { describe, expect, it, vi } from "vitest";
import { GetOpenWorldObligationsContextUseCase } from "../../../agent-integration/application/usecases/get-open-world-obligations-context-usecase.js";

const fingerprint = (character: string): string => `pgw:v1:violation-fingerprint:sha256:${character.repeat(64)}`;

describe("GetOpenWorldObligationsContextUseCase", () => {
  it("World無効時はquery portを呼ばずdisabledを返すこと", async () => {
    // Arrange
    const query = vi.fn();
    const usecase = new GetOpenWorldObligationsContextUseCase({ worldObligationsQueryPort: { query } });

    // Act
    const actual = await usecase.execute({ enabled: false });

    // Assert
    expect(actual).toEqual({ status: "disabled" });
    expect(query).not.toHaveBeenCalled();
  });

  it("blocking・cleanup・waivedを優先順位とstable keyで決定的に並べること", async () => {
    // Arrange
    const usecase = new GetOpenWorldObligationsContextUseCase({
      worldObligationsQueryPort: {
        query: async () => ({
          status: "available" as const,
          entries: [
            {
              kind: "structural" as const,
              classification: "waived" as const,
              ruleId: "WCR-008",
              constraintId: "pgw:v1:constraint:z",
              violationFingerprint: fingerprint("d"),
              subjectId: null,
            },
            {
              kind: "cleanup-required" as const,
              classification: "cleanup-required" as const,
              ruleId: "WCR-005",
              constraintId: null,
              violationFingerprint: fingerprint("c"),
              subjectId: null,
            },
            {
              kind: "policy-diagnostic" as const,
              classification: "expired-waiver" as const,
              ruleId: null,
              constraintId: null,
              violationFingerprint: null,
              subjectId: "pgw:v1:waiver:world.expired",
            },
            {
              kind: "structural" as const,
              classification: "new-structural" as const,
              ruleId: "WCR-008",
              constraintId: "pgw:v1:constraint:b",
              violationFingerprint: fingerprint("b"),
              subjectId: null,
            },
            {
              kind: "structural" as const,
              classification: "invalid-declaration" as const,
              ruleId: "WCR-001",
              constraintId: "pgw:v1:constraint:a",
              violationFingerprint: fingerprint("a"),
              subjectId: null,
            },
          ],
        }),
      },
    });

    // Act
    const actual = await usecase.execute({ enabled: true });

    // Assert
    expect(actual.status).toBe("available");
    if (actual.status !== "available") throw new Error("context must be available");
    expect(actual.entries.map((entry) => entry.classification)).toEqual([
      "invalid-declaration",
      "new-structural",
      "expired-waiver",
      "cleanup-required",
      "waived",
    ]);
  });

  it("adopted legacy 604件を個別entryから除外して件数だけ保持すること", async () => {
    // Arrange
    const entries = Array.from({ length: 604 }, (_, index) => ({
      kind: "structural" as const,
      classification: "adopted-legacy" as const,
      ruleId: "WCR-005",
      constraintId: null,
      violationFingerprint: `pgw:v1:violation-fingerprint:sha256:${index.toString(16).padStart(64, "0")}`,
      subjectId: null,
    }));
    const usecase = new GetOpenWorldObligationsContextUseCase({
      worldObligationsQueryPort: { query: async () => ({ status: "available" as const, entries }) },
    });

    // Act
    const actual = await usecase.execute({ enabled: true });

    // Assert
    expect(actual).toEqual({ status: "available", entries: [], adoptedLegacyCount: 604 });
  });

  it("query不能をrepo由来reasonのないunavailableへ変換すること", async () => {
    // Arrange
    const usecase = new GetOpenWorldObligationsContextUseCase({
      worldObligationsQueryPort: { query: async () => ({ status: "unavailable" as const }) },
    });

    // Act
    const actual = await usecase.execute({ enabled: true });

    // Assert
    expect(actual).toEqual({ status: "unavailable" });
  });
});
