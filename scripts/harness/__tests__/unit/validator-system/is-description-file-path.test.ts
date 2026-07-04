// @layer test
// @unit validator-system

import { expect, it } from "vitest";
import { context, target } from "../../helpers/test-helpers.js";
import { isDescriptionFilePath } from "../../../validator-system/infrastructure/adapters/file-system-work-item-reflection-adapter.js";

target("isDescriptionFilePath", () => {
  context("POSIX セパレータのパスの場合", () => {
    it("description.md を指すパスは true を返す", () => {
      // Arrange
      const value = "docs/inception/unit-a/WI-001/description.md";

      // Act
      const actual = isDescriptionFilePath(value);

      // Assert
      expect(actual).toBe(true);
    });
  });

  context("Windows バックスラッシュセパレータのパスの場合", () => {
    it("セパレータを正規化して true を返す", () => {
      // Arrange
      const value = "docs\\inception\\unit-a\\WI-001\\description.md";

      // Act
      const actual = isDescriptionFilePath(value);

      // Assert
      expect(actual).toBe(true);
    });
  });

  context("description.md 以外のファイルの場合", () => {
    it("false を返す", () => {
      // Arrange
      const value = "docs\\inception\\unit-a\\WI-001\\logical_design.md";

      // Act
      const actual = isDescriptionFilePath(value);

      // Assert
      expect(actual).toBe(false);
    });
  });

  context("ファイル名の一部に description.md を含むが末尾ではない場合", () => {
    it("false を返す", () => {
      // Arrange
      const value = "docs/inception/description.md.bak";

      // Act
      const actual = isDescriptionFilePath(value);

      // Assert
      expect(actual).toBe(false);
    });
  });
});
