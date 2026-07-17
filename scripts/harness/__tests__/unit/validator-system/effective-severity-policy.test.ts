// @layer test
// @unit validator-system
// @work-item-id WI-332
import { expect, it } from "vitest";
import { isEffectivelyPassed } from "../../../validator-system/domain/services/effective-severity-policy.js";
import { target } from "../../helpers/test-helpers.js";

target("isEffectivelyPassed (effective-severity-policy)", () => {
  // UT-ESP-001
  it("skipped=true の項目は passed の値に関わらず実効 pass と判定されること", () => {
    // Arrange
    const item = { passed: false, skipped: true, errors: [] };
    // Act
    const actual = isEffectivelyPassed(item);
    // Assert
    expect(actual).toBe(true);
  });

  // UT-ESP-002
  it("passed=true の項目は実効 pass と判定されること", () => {
    // Arrange
    const item = { passed: true, errors: [] };
    // Act
    const actual = isEffectivelyPassed(item);
    // Assert
    expect(actual).toBe(true);
  });

  // UT-ESP-003
  it("passed=false かつ warning のみの項目は failOnWarning 既定(false)で実効 pass と判定されること", () => {
    // Arrange
    const item = { passed: false, errors: [{ severity: "warning" }] };
    // Act
    const actual = isEffectivelyPassed(item);
    // Assert
    expect(actual).toBe(true);
  });

  // UT-ESP-004
  it("passed=false かつ warning のみの項目は failOnWarning=true で実効 fail と判定されること", () => {
    // Arrange
    const item = { passed: false, errors: [{ severity: "warning" }] };
    // Act
    const actual = isEffectivelyPassed(item, true);
    // Assert
    expect(actual).toBe(false);
  });

  // UT-ESP-005
  it("passed=false かつ error severity を含む項目は failOnWarning に関わらず実効 fail と判定されること", () => {
    // Arrange
    const item = { passed: false, errors: [{ severity: "warning" }, { severity: "error" }] };
    // Act
    const actual = [isEffectivelyPassed(item, false), isEffectivelyPassed(item, true)];
    // Assert
    expect(actual).toEqual([false, false]);
  });

  // UT-ESP-006
  it("passed=false かつ errors 空/未定義の防御的ケースは実効 fail と判定されること", () => {
    // Arrange
    const emptyErrors = { passed: false, errors: [] };
    const undefinedErrors = { passed: false };
    // Act
    const actual = [isEffectivelyPassed(emptyErrors), isEffectivelyPassed(undefinedErrors)];
    // Assert
    expect(actual).toEqual([false, false]);
  });
});
