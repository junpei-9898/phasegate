import { describe, expect, it } from "vitest";

describe("GoodTest", () => {
  it("should work correctly", () => {
    // Arrange
    const sut = new Service();

    // Act
    const actual = sut.run();

    // Assert
    expect(actual).toBe(true);
  });
});
