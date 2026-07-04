// @unit agent-integration
// @layer domain
// @story H11-06

import { describe, expect, it } from "vitest";
import { WriteTargetScopeInvariantError } from "../../../agent-integration/domain/errors/write-target-scope-invariant-error.js";
import { WriteTargetScope } from "../../../agent-integration/domain/value-objects/write-target-scope.js";
import { context, createProjectPaths, createWriteTargetScope, target } from "../../helpers/test-helpers.js";

target("WriteTargetScope", () => {
  target("fromPath()", () => {
    describe("書き込み先パスからスコープを推定する", () => {
      context("__tests__/ を含むパスの場合", () => {
        // UT-WTS-001
        it("nullを返すこと", () => {
          // Arrange
          const filePath = "scripts/harness/__tests__/unit/agent-integration/write-target-scope.test.ts";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(null);
        });
      });

      context("source配下のUnitファイルの場合", () => {
        // UT-WTS-002
        it("level=3 かつ unitId付きで返すこと", () => {
          // Arrange
          const filePath = "scripts/harness/validator-system/domain/value-objects/validator-id.ts";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 3, unitId: "validator-system" }));
        });
      });

      context("複数source設定の2件目に一致する場合", () => {
        // UT-WTS-003
        it("一致したsourceからlevel=3を推定すること", () => {
          // Arrange
          const filePath = "src/quick-mode/domain/value-objects/quick-mode-config.ts";
          const projectPaths = createProjectPaths({ source: ["scripts/harness", "src"] });

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 3, unitId: "quick-mode" }));
        });
      });

      context("docs.inception 配下で storyId パターンに一致する場合", () => {
        // UT-WTS-004
        it("level=3 かつ unitId と storyId 付きで返すこと", () => {
          // Arrange
          const filePath = "docs/inception/agent-integration/H11-01/scenario_test_plan.md";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 3, unitId: "agent-integration", storyId: "H11-01" }));
        });
      });

      context("docs.inception 配下で storyId ディレクトリの下層ファイルの場合", () => {
        // UT-WTS-005
        it("ネストしたファイルでも level=3 を返すこと", () => {
          // Arrange
          const filePath = "docs/inception/validator-system/HF1-01/designs/domain/model.md";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 3, unitId: "validator-system", storyId: "HF1-01" }));
        });
      });

      context("docs.inception/_shared 配下の場合", () => {
        // UT-WTS-006
        it("level=1 を返すこと", () => {
          // Arrange
          const filePath = "docs/inception/_shared/product_overview_plan.md";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 1 }));
        });
      });

      context("docs.construction 配下のUnit文書の場合", () => {
        // UT-WTS-007
        it("level=2 かつ unitId付きで返すこと", () => {
          // Arrange
          const filePath = "docs/product/construction/agent-integration/logical_design.md";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 2, unitId: "agent-integration" }));
        });
      });

      context("docs.inception 配下で storyId を持たないUnit文書の場合", () => {
        // UT-WTS-008
        it("level=2 かつ unitId付きで返すこと", () => {
          // Arrange
          const filePath = "docs/inception/agent-integration/domain_model_plan.md";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 2, unitId: "agent-integration" }));
        });
      });

      context("docs.inception 配下で storyId パターンに一致しない下位ディレクトリの場合", () => {
        // UT-WTS-009
        it("R5 として level=2 を返すこと", () => {
          // Arrange
          const filePath = "docs/inception/agent-integration/reference/design_notes.md";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 2, unitId: "agent-integration" }));
        });
      });

      context("docs/product 直下のファイルの場合", () => {
        // UT-WTS-010
        it("level=1 を返すこと", () => {
          // Arrange
          const filePath = "docs/product/product_overview.md";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 1 }));
        });
      });

      context("docs/product 直下の別ファイルの場合", () => {
        // UT-WTS-011
        it("level=1 を返すこと", () => {
          // Arrange
          const filePath = "docs/product/user_stories.md";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 1 }));
        });
      });

      context("どのルールにも一致しない場合", () => {
        // UT-WTS-012
        it("nullを返すこと", () => {
          // Arrange
          const filePath = "README.md";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(null);
        });
      });

      context("source配下でも __tests__/ を含む場合", () => {
        // UT-WTS-013
        it("R2より先にR1が評価され nullを返すこと", () => {
          // Arrange
          const filePath = "scripts/harness/validator-system/__tests__/unit/foo.test.ts";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(null);
        });
      });

      context("docs.inception/_shared 配下がUnit文書判定とも競合しうる場合", () => {
        // UT-WTS-014
        it("R6が優先され level=1 を返すこと", () => {
          // Arrange
          const filePath = "docs/inception/_shared/US-999/cross_cutting.md";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 1 }));
        });
      });

      context("docs.inception/_cross 配下の WI パスの場合", () => {
        // UT-WTS-WI001
        it("横断WIのdescription.mdはPhase 1として返すこと", () => {
          // Arrange
          const filePath = "docs/inception/_cross/WI-026/description.md";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 1 }));
        });
      });

      context("docs.inception/_cross 配下の WI 成果物パスの場合", () => {
        // UT-WTS-WI001B
        it("description.md以外は横断WIを実装レベルの作業単位として返すこと", () => {
          // Arrange
          const filePath = "docs/inception/_cross/WI-026/logical_design.md";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 3, unitId: "_cross", storyId: "WI-026" }));
        });
      });

      context("カスタムdocs.inception配下の _cross WI パスの場合", () => {
        // UT-WTS-WI002
        it("横断WIのdescription.mdはPhase 1として返すこと", () => {
          // Arrange
          const filePath = "custom/inception/_cross/WI-026/description.md";
          const projectPaths = createProjectPaths({
            docs: { construction: "docs/product/construction", inception: "custom/inception" },
          });

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 1 }));
        });
      });

      context("docs.inception 配下のUnit所有WI description.mdの場合", () => {
        // UT-WTS-WI004
        it("Unit所有WIのdescription.mdはPhase 1として返すこと", () => {
          // Arrange
          const filePath = "docs/inception/agent-integration/WI-218/description.md";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 1 }));
        });
      });

      context("docs.inception 配下のUnit所有WI成果物パスの場合", () => {
        // UT-WTS-WI005
        it("description.md以外はUnit所有WIを実装レベルの作業単位として返すこと", () => {
          // Arrange
          const filePath = "docs/inception/agent-integration/WI-218/logical_design.md";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 3, unitId: "agent-integration", storyId: "WI-218" }));
        });
      });

      context("docs.inception/_cross 配下の非WIパスの場合", () => {
        // UT-WTS-WI003
        it("storyId付きの実装レベルとして誤認しないこと", () => {
          // Arrange
          const filePath = "docs/inception/_cross/memo.md";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 1 }));
        });
      });

      context("storyId候補がパターンに一致しない場合", () => {
        // UT-WTS-015
        it("R3ではなくR5が適用され level=2 を返すこと", () => {
          // Arrange
          const filePath = "docs/inception/agent-integration/story-001/scenario_test_plan.md";
          const projectPaths = createProjectPaths();

          // Act
          const actual = WriteTargetScope.fromPath(filePath, projectPaths);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 2, unitId: "agent-integration" }));
        });
      });
    });
  });

  target("create()", () => {
    describe("正常な入力でWriteTargetScopeを生成する", () => {
      context("level=1 の場合", () => {
        // UT-WTS-020
        it("unitId と storyId なしで生成されること", () => {
          // Arrange
          const props = { level: 1 as const };

          // Act
          const actual = WriteTargetScope.create(props);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 1 }));
        });
      });

      context("level=2 の場合", () => {
        // UT-WTS-021
        it("unitId付きで生成されること", () => {
          // Arrange
          const props = { level: 2 as const, unitId: "agent-integration" };

          // Act
          const actual = WriteTargetScope.create(props);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 2, unitId: "agent-integration" }));
        });
      });

      context("level=3 で storyId がある場合", () => {
        // UT-WTS-022
        it("unitId と storyId 付きで生成されること", () => {
          // Arrange
          const props = { level: 3 as const, unitId: "agent-integration", storyId: "H11-01" };

          // Act
          const actual = WriteTargetScope.create(props);

          // Assert
          expect(actual).toEqual(createWriteTargetScope({ level: 3, unitId: "agent-integration", storyId: "H11-01" }));
        });
      });
    });

    describe("不変条件を検証する", () => {
      context("level が 1,2,3 以外の場合", () => {
        // UT-WTS-023
        it("WriteTargetScopeInvariantErrorがthrowされること", () => {
          // Arrange
          const props = { level: 0 as 1, unitId: "agent-integration" };

          // Act
          const actual = () => WriteTargetScope.create(props);

          // Assert
          expect(actual).toThrow(WriteTargetScopeInvariantError);
        });
      });

      context("level=1 で unitId が指定された場合", () => {
        // UT-WTS-024
        it("WriteTargetScopeInvariantErrorがthrowされること", () => {
          // Arrange
          const props = { level: 1 as const, unitId: "agent-integration" };

          // Act
          const actual = () => WriteTargetScope.create(props);

          // Assert
          expect(actual).toThrow(WriteTargetScopeInvariantError);
        });
      });

      context("level=1 で storyId が指定された場合", () => {
        // UT-WTS-025
        it("WriteTargetScopeInvariantErrorがthrowされること", () => {
          // Arrange
          const props = { level: 1 as const, storyId: "H11-01" };

          // Act
          const actual = () => WriteTargetScope.create(props);

          // Assert
          expect(actual).toThrow(WriteTargetScopeInvariantError);
        });
      });

      context("level=2 で unitId がない場合", () => {
        // UT-WTS-026
        it("WriteTargetScopeInvariantErrorがthrowされること", () => {
          // Arrange
          const props = { level: 2 as const };

          // Act
          const actual = () => WriteTargetScope.create(props);

          // Assert
          expect(actual).toThrow(WriteTargetScopeInvariantError);
        });
      });

      context("level=2 で storyId が指定された場合", () => {
        // UT-WTS-027
        it("WriteTargetScopeInvariantErrorがthrowされること", () => {
          // Arrange
          const props = { level: 2 as const, unitId: "agent-integration", storyId: "H11-01" };

          // Act
          const actual = () => WriteTargetScope.create(props);

          // Assert
          expect(actual).toThrow(WriteTargetScopeInvariantError);
        });
      });

      context("level=3 で unitId がない場合", () => {
        // UT-WTS-028
        it("WriteTargetScopeInvariantErrorがthrowされること", () => {
          // Arrange
          const props = { level: 3 as const, storyId: "H11-01" };

          // Act
          const actual = () => WriteTargetScope.create(props);

          // Assert
          expect(actual).toThrow(WriteTargetScopeInvariantError);
        });
      });
    });
  });

  target("equals()", () => {
    describe("等値性を判定する", () => {
      context("同一フィールドを持つ2つのWriteTargetScopeを比較する場合", () => {
        // UT-WTS-030
        it("等値であること", () => {
          // Arrange
          const left = createWriteTargetScope({ level: 3, unitId: "agent-integration", storyId: "H11-01" });
          const right = createWriteTargetScope({ level: 3, unitId: "agent-integration", storyId: "H11-01" });

          // Act
          const actual = left.equals(right);

          // Assert
          expect(actual).toBe(true);
        });
      });

      context("level が異なる2つのWriteTargetScopeを比較する場合", () => {
        // UT-WTS-031
        it("非等値であること", () => {
          // Arrange
          const left = createWriteTargetScope({ level: 2, unitId: "agent-integration" });
          const right = createWriteTargetScope({ level: 3, unitId: "agent-integration" });

          // Act
          const actual = left.equals(right);

          // Assert
          expect(actual).toBe(false);
        });
      });

      context("storyId が異なる2つのWriteTargetScopeを比較する場合", () => {
        // UT-WTS-032
        it("非等値であること", () => {
          // Arrange
          const left = createWriteTargetScope({ level: 3, unitId: "agent-integration", storyId: "H11-01" });
          const right = createWriteTargetScope({ level: 3, unitId: "agent-integration", storyId: "H11-02" });

          // Act
          const actual = left.equals(right);

          // Assert
          expect(actual).toBe(false);
        });
      });
    });
  });

  describe("境界値を検証する", () => {
    context("filePath が空文字の場合", () => {
      // UT-BV-015
      it("nullを返すこと", () => {
        // Arrange
        const filePath = "";
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toEqual(null);
      });
    });

    context("storyId 候補が小文字を含む場合", () => {
      // UT-BV-016
      it("storyIdとしては採用されず level=2 を返すこと", () => {
        // Arrange
        const filePath = "docs/inception/agent-integration/h11-01/scenario_test_plan.md";
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toEqual(createWriteTargetScope({ level: 2, unitId: "agent-integration" }));
      });
    });

    context("docs.construction 配下だが unitId が存在しない場合", () => {
      // UT-BV-017
      it("nullを返すこと", () => {
        // Arrange
        const filePath = "docs/product/construction";
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toEqual(null);
      });
    });

    context("docs.inception/_shared 直下のファイルの場合", () => {
      // UT-BV-018
      it("level=1 を返すこと", () => {
        // Arrange
        const filePath = "docs/inception/_shared/overview.md";
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toEqual(createWriteTargetScope({ level: 1 }));
      });
    });

    context("最小の storyId パターンに一致する場合", () => {
      // UT-BV-022
      it("level=3 として扱うこと", () => {
        // Arrange
        const filePath = "docs/inception/agent-integration/H1-1/scenario_test_plan.md";
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toEqual(createWriteTargetScope({ level: 3, unitId: "agent-integration", storyId: "H1-1" }));
      });
    });

    // === フェーズゲート保護回避（セキュリティ境界）の回帰テスト ===

    context("source配下のUnitファイルを直接指定する場合（P-2/P-3退行防止の基準）", () => {
      // UT-WTS-SEC-BASE
      it("従来通り level=3 として保護されること", () => {
        // Arrange
        const filePath = "scripts/harness/order/domain/order.ts";
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toEqual(createWriteTargetScope({ level: 3, unitId: "order" }));
      });
    });

    context("__tests__/../ の親参照でsource配下の本物のソースに解決される場合（P-2）", () => {
      // UT-WTS-SEC-P2
      it("パス正規化後に __tests__ 除外が適用され level=3 として保護されること", () => {
        // Arrange
        const filePath = "scripts/harness/agent-integration/__tests__/../domain/evil.ts";
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toEqual(createWriteTargetScope({ level: 3, unitId: "agent-integration" }));
      });
    });

    context("親参照を含まない本物のテストファイルの場合（P-2退行防止）", () => {
      // UT-WTS-SEC-P2-REG
      it("従来通り __tests__ 除外で null を返すこと", () => {
        // Arrange
        const filePath = "scripts/harness/x/__tests__/foo.test.ts";
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toEqual(null);
      });
    });

    context("source プレフィックスの大文字小文字が異なる場合（P-3）", () => {
      // UT-WTS-SEC-P3
      it("大小非依存で前方一致し level=3 として保護されること", () => {
        // Arrange
        const filePath = "Scripts/harness/order/domain/evil.ts";
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toEqual(createWriteTargetScope({ level: 3, unitId: "order" }));
      });
    });

    // === WI-026 G2-4: legacy issues 分岐は廃止。WI-XXX / 既存 H-/US- 互換のみ残す ===

    // UT-WTS-I020
    context("既存USパスが後方互換で動作する場合", () => {
      it("US IDパスは従来通りlevel=3として認識される", () => {
        // Arrange
        const filePath = "docs/inception/agent-integration/H11-05/logical_design.md";
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toEqual(createWriteTargetScope({ level: 3, unitId: "agent-integration", storyId: "H11-05" }));
      });
    });

    // UT-WTS-I021
    context("別形式のUS IDパスが後方互換で動作する場合", () => {
      it("HF1-06形式もlevel=3として認識される", () => {
        // Arrange
        const filePath = "docs/inception/phase-dependency-model/HF1-06/tdd_implementation_plan.md";
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toEqual(
          createWriteTargetScope({ level: 3, unitId: "phase-dependency-model", storyId: "HF1-06" }),
        );
      });
    });

    // UT-WTS-I041
    context("issuesディレクトリが小文字のissue IDを含む場合 (legacy 分岐削除後の挙動)", () => {
      it("issues は通常 segment 扱いとなり level=2 として扱われる", () => {
        // Arrange
        const filePath = "docs/inception/agent-integration/issues/issue-001/logical_design.md";
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toEqual(createWriteTargetScope({ level: 2, unitId: "agent-integration" }));
      });
    });

    // UT-WTS-P001〜P006: WORK_ITEM_ID_PATTERN マッチ（fromPath経由の間接検証）
    context("WORK_ITEM_ID_PATTERN にマッチするIDをfromPath経由で検証する場合", () => {
      it.each([
        { id: "H11-05", desc: "US ID（標準形式）" },
        { id: "HF1-06", desc: "US ID（別プレフィックス）" },
        { id: "ISSUE-001", desc: "issue ID（標準形式）" },
        { id: "ISSUE-999", desc: "issue ID（大番号）" },
        { id: "BUG-01", desc: "BUG ID" },
        { id: "A1-1", desc: "最小形式" },
      ])("$desc ($id) はlevel=3として認識される", ({ id }) => {
        // Arrange
        const filePath = `docs/inception/my-unit/${id}/logical_design.md`;
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toEqual(createWriteTargetScope({ level: 3, unitId: "my-unit", storyId: id }));
      });
    });

    // UT-WTS-P010〜P015: WORK_ITEM_ID_PATTERN 不マッチ（fromPath経由の間接検証）
    context("WORK_ITEM_ID_PATTERN にマッチしないIDをfromPath経由で検証する場合", () => {
      it.each([
        { id: "lowercase-001", desc: "小文字始まり" },
        { id: "123-456", desc: "数字始まり" },
        { id: "NO_HYPHEN", desc: "ハイフンなし" },
        { id: "-INVALID-01", desc: "ハイフン始まり" },
        { id: "H-", desc: "IDなし" },
        { id: "_shared", desc: "アンダースコア始まり" },
      ])("$desc ($id) はlevel=3として認識されない", ({ id }) => {
        // Arrange
        const filePath = `docs/inception/my-unit/${id}/logical_design.md`;
        const projectPaths = createProjectPaths();

        // Act
        const actual = WriteTargetScope.fromPath(filePath, projectPaths);

        // Assert
        expect(actual).toEqual(createWriteTargetScope({ level: 2, unitId: "my-unit" }));
      });
    });
  });
});
