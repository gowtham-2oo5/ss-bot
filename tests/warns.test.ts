import { describe, it, beforeEach } from "mocha";
import { expect } from "chai";
import { addWarn, getWarns, deleteWarn, deleteAllWarns } from "../src/modules/warns";

const TEST_USER = "123456789";
const TEST_MOD = "987654321";

describe("Warns Module", () => {
  beforeEach(() => {
    deleteAllWarns(TEST_USER);
  });

  it("adds a warn and retrieves it", () => {
    const warn = addWarn(TEST_USER, TEST_MOD, "test reason");
    expect(warn.id).to.be.a("string");
    expect(warn.reason).to.equal("test reason");

    const warns = getWarns(TEST_USER);
    expect(warns).to.have.length(1);
    expect(warns[0].moderator).to.equal(TEST_MOD);
  });

  it("returns empty array for user with no warns", () => {
    expect(getWarns("nonexistent")).to.deep.equal([]);
  });

  it("deletes a specific warn by id", () => {
    const w1 = addWarn(TEST_USER, TEST_MOD, "first");
    addWarn(TEST_USER, TEST_MOD, "second");

    const deleted = deleteWarn(TEST_USER, w1.id);
    expect(deleted).to.be.true;

    const remaining = getWarns(TEST_USER);
    expect(remaining).to.have.length(1);
    expect(remaining[0].reason).to.equal("second");
  });

  it("returns false when deleting non-existent warn", () => {
    expect(deleteWarn(TEST_USER, "fakeid")).to.be.false;
  });

  it("deletes all warns for a user", () => {
    addWarn(TEST_USER, TEST_MOD, "one");
    addWarn(TEST_USER, TEST_MOD, "two");
    addWarn(TEST_USER, TEST_MOD, "three");

    const count = deleteAllWarns(TEST_USER);
    expect(count).to.equal(3);
    expect(getWarns(TEST_USER)).to.have.length(0);
  });
});
