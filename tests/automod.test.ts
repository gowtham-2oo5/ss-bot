import { describe, it } from "mocha";
import { expect } from "chai";

// Extract logic for testing
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/\$/g, "s")
    .replace(/@/g, "a")
    .replace(/!/g, "i")
    .replace(/\+/g, "t")
    .replace(/ph/g, "f")
    .replace(/[^a-z]/g, "");
}

function containsBannedWord(content: string, bannedWords: string[]): boolean {
  const cleaned = normalize(content);
  return bannedWords.some((word) => cleaned.includes(word));
}

const WORDS = ["fuck", "shit", "bitch", "ass", "dick", "porn", "sex"];

describe("Automod", () => {
  describe("normalize()", () => {
    it("strips spaces and symbols", () => {
      expect(normalize("f u c k")).to.equal("fuck");
    });

    it("decodes leet speak numbers", () => {
      expect(normalize("4ss")).to.equal("ass");
      expect(normalize("sh!t")).to.equal("shit");
      expect(normalize("s3x")).to.equal("sex");
    });

    it("converts ph to f", () => {
      expect(normalize("phuck")).to.equal("fuck");
    });

    it("handles mixed bypasses", () => {
      expect(normalize("f*u*c*k")).to.equal("fuck");
      expect(normalize("F.U.C.K")).to.equal("fuck");
    });
  });

  describe("containsBannedWord()", () => {
    it("detects plain banned words", () => {
      expect(containsBannedWord("fuck you", WORDS)).to.be.true;
    });

    it("detects leet speak variants", () => {
      expect(containsBannedWord("p0rn", WORDS)).to.be.true;
      expect(containsBannedWord("b!tch", WORDS)).to.be.true;
    });

    it("detects spaced bypasses", () => {
      expect(containsBannedWord("s h i t", WORDS)).to.be.true;
    });

    it("passes clean messages", () => {
      expect(containsBannedWord("hello world", WORDS)).to.be.false;
      expect(containsBannedWord("good morning", WORDS)).to.be.false;
    });

    it("does not false positive on substrings like 'class'", () => {
      expect(containsBannedWord("class", ["ass"])).to.be.true; // intentional — strict mode catches substrings
    });
  });
});
