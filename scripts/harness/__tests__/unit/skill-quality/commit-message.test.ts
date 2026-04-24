// @unit skill-quality
// @layer test
// @story H12-07
import { describe, expect, it } from "vitest";
import { CommitMessage } from "../../../skill-quality/domain/value-objects/commit-message.js";
import { context, target } from "../../helpers/test-helpers.js";

function createCommitMessage(
  overrides: Partial<{
    unit: string;
    storyId: string;
    description: string;
    workItemId: string;
  }> = {},
): CommitMessage {
  return CommitMessage.create(
    overrides.unit ?? "skill-quality",
    overrides.storyId ?? "H12-01",
    overrides.description ?? "implement domain model",
    overrides.workItemId,
  );
}

target("CommitMessage", () => {
  describe("create: 有効な引数で正常生成", () => {
    context("unit='skill-quality', storyId='H12-01', description='implement domain model' の場合", () => {
      it("正常に生成される", () => {
        expect(() => createCommitMessage()).not.toThrow();
      });
    });
  });

  describe("create: unit が空文字列のとき EMPTY_COMMIT_FIELD エラー", () => {
    context("unit='' の場合", () => {
      it("HarnessError(EMPTY_COMMIT_FIELD) がスローされる", () => {
        expect(() => createCommitMessage({ unit: "" })).toThrow(
          expect.objectContaining({ code: expect.stringContaining("EMPTY_COMMIT_FIELD") }),
        );
      });
    });
  });

  describe("create: storyId が空文字列のとき EMPTY_COMMIT_FIELD エラー", () => {
    context("storyId='' の場合", () => {
      it("HarnessError(EMPTY_COMMIT_FIELD) がスローされる", () => {
        expect(() => createCommitMessage({ storyId: "" })).toThrow(
          expect.objectContaining({ code: expect.stringContaining("EMPTY_COMMIT_FIELD") }),
        );
      });
    });
  });

  describe("create: description が空文字列のとき EMPTY_COMMIT_FIELD エラー", () => {
    context("description='' の場合", () => {
      it("HarnessError(EMPTY_COMMIT_FIELD) がスローされる", () => {
        expect(() => createCommitMessage({ description: "" })).toThrow(
          expect.objectContaining({ code: expect.stringContaining("EMPTY_COMMIT_FIELD") }),
        );
      });
    });
  });

  describe("format: feat({unit}/{storyId}): {description} の形式で返ること", () => {
    context("unit='skill-quality', storyId='H12-01', description='add lesson collector' の場合", () => {
      it("整形済みコミットメッセージが返される", () => {
        const msg = createCommitMessage({
          unit: "skill-quality",
          storyId: "H12-01",
          description: "add lesson collector",
        });
        const actual = msg.format();
        expect(actual).toBe("feat(skill-quality/H12-01): add lesson collector");
      });
    });
  });

  describe("format: 別の unit/storyId で正しいフォーマットが返ること", () => {
    context("unit='harness-error', storyId='H09-03', description='fix error code' の場合", () => {
      it("別Unitの整形済みコミットメッセージが返される", () => {
        const msg = createCommitMessage({ unit: "harness-error", storyId: "H09-03", description: "fix error code" });
        const actual = msg.format();
        expect(actual).toBe("feat(harness-error/H09-03): fix error code");
      });
    });
  });

  describe("format: workItemId が指定された場合に Work-Item trailer が付与されること", () => {
    context("workItemId='WI-026' の場合", () => {
      it("空行区切りで `Work-Item: WI-026` が返される", () => {
        const msg = createCommitMessage({ workItemId: "WI-026" });
        const actual = msg.format();
        expect(actual).toBe("feat(skill-quality/H12-01): implement domain model\n\nWork-Item: WI-026");
      });
    });
  });

  describe("create: workItemId が WI 形式でない場合 INVALID_WORK_ITEM_ID エラー", () => {
    context("workItemId='ISSUE-026' の場合", () => {
      it("HarnessError(INVALID_WORK_ITEM_ID) がスローされる", () => {
        expect(() => createCommitMessage({ workItemId: "ISSUE-026" })).toThrow(
          expect.objectContaining({ code: expect.stringContaining("INVALID_WORK_ITEM_ID") }),
        );
      });
    });
  });

  describe("equals: 同一フィールドを持つ 2 つの CommitMessage は等値", () => {
    context("同一 unit/storyId/description を持つ 2 つの CommitMessage を比較する場合", () => {
      it("equals() が true を返す", () => {
        const a = createCommitMessage();
        const b = createCommitMessage();
        const actual = a.equals(b);
        expect(actual).toBe(true);
      });
    });
  });

  describe("equals: description のみ異なる CommitMessage は非等値", () => {
    context("description のみ異なる 2 つの CommitMessage を比較する場合", () => {
      it("equals() が false を返す", () => {
        const a = createCommitMessage({ description: "desc A" });
        const b = createCommitMessage({ description: "desc B" });
        const actual = a.equals(b);
        expect(actual).toBe(false);
      });
    });
  });

  describe("equals: workItemId のみ異なる CommitMessage は非等値", () => {
    context("workItemId のみ異なる 2 つの CommitMessage を比較する場合", () => {
      it("equals() が false を返す", () => {
        const a = createCommitMessage({ workItemId: "WI-001" });
        const b = createCommitMessage({ workItemId: "WI-002" });
        const actual = a.equals(b);
        expect(actual).toBe(false);
      });
    });
  });

  describe("不変性: Object.freeze() によりプロパティ変更不可（INV-8）", () => {
    context("生成後にプロパティ変更を試みる場合", () => {
      it("プロパティが変更されない", () => {
        const msg = createCommitMessage();
        const originalUnit = msg.unit;
        try {
          (msg as unknown as { unit: string }).unit = "changed";
        } catch {
          // strict mode では TypeError
        }
        const actual = msg.unit;
        expect(actual).toBe(originalUnit);
      });
    });
  });
});
