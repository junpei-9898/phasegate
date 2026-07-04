// @unit harness-api
// @layer test

import { expect, it } from "vitest";
import { computeNextWorkItemId, toPosixPath } from "../../../main.ts";
import { target, context } from "../../helpers/test-helpers.ts";

target("computeNextWorkItemId", () => {
  context("既存 WI がない場合", () => {
    it("WI-001 を返す", () => {
      // Arrange
      const files: string[] = [];

      // Act
      const actual = computeNextWorkItemId(files);

      // Assert
      expect(actual).toBe("WI-001");
    });
  });

  context("POSIX セパレータの description.md がある場合", () => {
    it("最大番号+1 を返す", () => {
      // Arrange
      const files = [
        "docs/inception/unit-a/WI-001/description.md",
        "docs/inception/unit-a/WI-007/description.md",
      ];

      // Act
      const actual = computeNextWorkItemId(files);

      // Assert
      expect(actual).toBe("WI-008");
    });
  });

  context("Windows バックスラッシュセパレータの場合", () => {
    it("セパレータを正規化して最大番号+1 を返す (WI-001 に潰れない)", () => {
      // Arrange
      const files = [
        "docs\\inception\\unit-a\\WI-001\\description.md",
        "docs\\inception\\unit-a\\WI-012\\description.md",
      ];

      // Act
      const actual = computeNextWorkItemId(files);

      // Assert
      expect(actual).toBe("WI-013");
    });
  });

  context("番号が 999 を超える場合", () => {
    it("桁を動的に拡張し WI-1000 を返す (データ損失なし)", () => {
      // Arrange
      const files = ["docs/inception/unit-a/WI-999/description.md"];

      // Act
      const actual = computeNextWorkItemId(files);

      // Assert
      expect(actual).toBe("WI-1000");
    });
  });

  context("4桁 WI が既に存在する場合", () => {
    it("既存の桁幅を維持したまま最大番号+1 を返す", () => {
      // Arrange
      const files = [
        "docs/inception/unit-a/WI-0001/description.md",
        "docs/inception/unit-a/WI-1234/description.md",
      ];

      // Act
      const actual = computeNextWorkItemId(files);

      // Assert
      expect(actual).toBe("WI-1235");
    });
  });

  context("description.md 以外のファイルのみの場合", () => {
    it("WI ディレクトリの他ファイルは番号に影響せず WI-001 を返す", () => {
      // Arrange
      const files = [
        "docs/inception/unit-a/WI-005/logical_design.md",
        "docs/inception/unit-a/README.md",
      ];

      // Act
      const actual = computeNextWorkItemId(files);

      // Assert
      expect(actual).toBe("WI-001");
    });
  });
});

target("toPosixPath", () => {
  context("Windows パスの場合", () => {
    it("全てのバックスラッシュをスラッシュに変換する", () => {
      // Arrange
      const input = "docs\\inception\\unit-a\\WI-001\\description.md";

      // Act
      const actual = toPosixPath(input);

      // Assert
      expect(actual).toBe("docs/inception/unit-a/WI-001/description.md");
    });
  });
});
