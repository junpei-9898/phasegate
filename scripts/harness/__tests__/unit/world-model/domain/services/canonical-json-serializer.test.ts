// @unit world-model
// @layer test
// @work-item-id WI-287
// @story H17-02
import { describe, expect, it } from "vitest";
import { CanonicalJsonSerializer } from "../../../../../world-model/domain/services/canonical-json-serializer.js";
import { target } from "../../../../helpers/test-helpers.js";

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

target("CanonicalJsonSerializer", () => {
  describe("JSON値を決定的なUTF-8 bytesへ直列化する", () => {
    it("入れ子objectのkey挿入順が違っても同じbytesにすること", () => {
      // Arrange
      const serializer = new CanonicalJsonSerializer();
      const left = { z: true, a: { d: 2, c: 'line\nquote"' } };
      const right = { a: { c: 'line\nquote"', d: 2 }, z: true };

      // Act
      const actualLeft = serializer.serialize(left);
      const actualRight = serializer.serialize(right);

      // Assert
      expect(actualLeft).toEqual(actualRight);
      expect(decode(actualLeft)).toBe('{"a":{"c":"line\\nquote\\"","d":2},"z":true}');
    });

    it("ordered arrayの順序差をbytesへ反映すること", () => {
      // Arrange
      const serializer = new CanonicalJsonSerializer();

      // Act
      const actualLeft = serializer.serialize({ values: [1, 2, 3] });
      const actualRight = serializer.serialize({ values: [3, 2, 1] });

      // Assert
      expect(actualLeft).not.toEqual(actualRight);
    });

    it("explicit nullとfield absenceを区別すること", () => {
      // Arrange
      const serializer = new CanonicalJsonSerializer();

      // Act
      const actualNull = serializer.serialize({ value: null });
      const actualAbsent = serializer.serialize({});

      // Assert
      expect(actualNull).not.toEqual(actualAbsent);
    });

    it("BOM・indent・trailing newlineを付けないこと", () => {
      // Arrange
      const serializer = new CanonicalJsonSerializer();

      // Act
      const actual = serializer.serialize({ b: 2, a: 1 });

      // Assert
      expect(decode(actual)).toBe('{"a":1,"b":2}');
      expect(actual[0]).not.toBe(0xef);
      expect(decode(actual).endsWith("\n")).toBe(false);
    });
  });

  describe("JSON data model外の値を拒否する", () => {
    it.each([
      { label: "undefined", value: { value: undefined } },
      { label: "NaN", value: { value: Number.NaN } },
      { label: "Infinity", value: { value: Number.POSITIVE_INFINITY } },
      { label: "bigint", value: { value: BigInt(1) } },
      { label: "function", value: { value: () => true } },
      { label: "symbol", value: { value: Symbol("value") } },
    ])("$labelをsilent omissionせず拒否すること", ({ value }) => {
      // Arrange
      const serializer = new CanonicalJsonSerializer();
      const act = () => serializer.serialize(value);

      // Act
      const actual = act;

      // Assert
      expect(actual).toThrowError();
    });

    it("sparse arrayをnullへ変換せず拒否すること", () => {
      // Arrange
      const serializer = new CanonicalJsonSerializer();
      const sparse = new Array(2);
      sparse[1] = "present";
      const act = () => serializer.serialize(sparse);

      // Act
      const actual = act;

      // Assert
      expect(actual).toThrowError();
    });

    it("循環objectを拒否すること", () => {
      // Arrange
      const serializer = new CanonicalJsonSerializer();
      const cyclic: Record<string, unknown> = {};
      cyclic.self = cyclic;
      const act = () => serializer.serialize(cyclic);

      // Act
      const actual = act;

      // Assert
      expect(actual).toThrowError();
    });
  });
});
