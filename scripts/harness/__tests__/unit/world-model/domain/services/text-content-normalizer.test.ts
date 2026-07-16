// @unit world-model
// @layer test
// @work-item-id WI-287
// @story H17-02
import { describe, expect, it } from "vitest";
import { TextContentNormalizer } from "../../../../../world-model/domain/services/text-content-normalizer.js";
import { target } from "../../../../helpers/test-helpers.js";

const encode = (value: string): Uint8Array => new TextEncoder().encode(value);

target("TextContentNormalizer", () => {
  describe("UTF-8 textのtransport改行だけを正規化する", () => {
    it("LF・CRLF・lone CRを同じLF bytesにすること", () => {
      // Arrange
      const normalizer = new TextContentNormalizer();

      // Act
      const actual = [
        normalizer.normalize(encode("a\nb\n")),
        normalizer.normalize(encode("a\r\nb\r\n")),
        normalizer.normalize(encode("a\rb\r")),
      ];

      // Assert
      expect(actual.every((result) => result.ok)).toBe(true);
      if (actual.every((result) => result.ok)) {
        expect(actual[0].bytes).toEqual(actual[1].bytes);
        expect(actual[1].bytes).toEqual(actual[2].bytes);
        expect(actual[0].text).toBe("a\nb\n");
      }
    });

    it("Unicode NFCとNFDを別bytesとして保持すること", () => {
      // Arrange
      const normalizer = new TextContentNormalizer();

      // Act
      const actualNfc = normalizer.normalize(encode("Café"));
      const actualNfd = normalizer.normalize(encode("Cafe\u0301"));

      // Assert
      expect(actualNfc.ok).toBe(true);
      expect(actualNfd.ok).toBe(true);
      if (actualNfc.ok && actualNfd.ok) {
        expect(actualNfc.bytes).not.toEqual(actualNfd.bytes);
      }
    });

    it("BOM・trailing whitespace・final newlineを保持すること", () => {
      // Arrange
      const normalizer = new TextContentNormalizer();
      const input = "\uFEFFtext  \n";

      // Act
      const actual = normalizer.normalize(encode(input));

      // Assert
      expect(actual.ok).toBe(true);
      if (actual.ok) {
        expect(actual.text).toBe(input);
        expect(actual.bytes).toEqual(encode(input));
      }
    });

    it("trailing whitespace差とfinal newline有無を別bytesとして保持すること", () => {
      // Arrange
      const normalizer = new TextContentNormalizer();

      // Act
      const actualPlain = normalizer.normalize(encode("text"));
      const actualWhitespace = normalizer.normalize(encode("text "));
      const actualNewline = normalizer.normalize(encode("text\n"));

      // Assert
      expect(actualPlain.ok && actualWhitespace.ok && actualNewline.ok).toBe(true);
      if (actualPlain.ok && actualWhitespace.ok && actualNewline.ok) {
        expect(actualPlain.bytes).not.toEqual(actualWhitespace.bytes);
        expect(actualPlain.bytes).not.toEqual(actualNewline.bytes);
      }
    });
  });

  describe("invalid UTF-8を扱う", () => {
    it("replacement characterで続行せずdiagnosticを返すこと", () => {
      // Arrange
      const normalizer = new TextContentNormalizer();
      const invalid = Uint8Array.from([0xc3, 0x28]);

      // Act
      const actual = normalizer.normalize(invalid);

      // Assert
      expect(actual.ok).toBe(false);
      if (!actual.ok) {
        expect(actual.diagnostic.code).toBe("invalid-utf8");
        expect(actual.diagnostic.payload).toEqual({ byteLength: 2 });
      }
    });
  });
});
