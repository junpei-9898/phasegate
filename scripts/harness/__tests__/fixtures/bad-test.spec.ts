import { describe, expect, it } from "vitest";

describe("BadTest", () => {
  it("should do something", () => {
    const result = new Service().run();
    expect(result).toBe(true);
  });
});
