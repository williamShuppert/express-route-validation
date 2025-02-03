import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isError } from "../src/shared.js";

describe("isError()", () => {
  describe("is NOT an error", () => {
    test("empty array", () => assert.ok(!isError([])));
    test("undefined", () => assert.ok(!isError(undefined)));
    test("null", () => assert.ok(!isError(null)));
    test("false", () => assert.ok(!isError(false)));
    test("empty string", () => assert.ok(!isError("")));
    test("zero", () => assert.ok(!isError(0)));
  });

  describe("is an error", () => {
    test("non-empty array", () => assert.ok(isError([""])));
    test("true", () => assert.ok(isError(true)));
    test("non-empty string", () => assert.ok(isError("error")));
    test("negative numbers", () => assert.ok(isError(-1)));
    test("positive numbers", () => assert.ok(isError(1)));
  });
});
