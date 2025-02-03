import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Request } from "express";
import { createResponseValidator, validateResponse } from "../src/response.js";
import { mockNext, mockRes, wait } from "./utils.js";

describe("validateResponse()", () => {
  describe("valid responses", () => {
    test("valid json response", async () => {
      const { res, result } = mockRes();
      const middleware = validateResponse({ 200: (res, done) => done({ ...res, transformed: true }) });
      await middleware({} as Request, res, mockNext({ requestHandler: () => res.json({ message: "success" }) }));

      assert.deepEqual(result.data, { message: "success", transformed: true });
    });

    test("valid sendStatus response", async () => {
      const { res, result } = mockRes();
      const middleware = validateResponse({ 200: (res, done) => done(res) });
      await middleware({} as Request, res, mockNext({ requestHandler: () => res.sendStatus(200) }));

      assert.equal(result.data, 200);
    });

    test("valid send response", async () => {
      const { res, result } = mockRes();
      const middleware = validateResponse({ 200: (res, done) => done({ ...res, transformed: true }) });
      await middleware({} as Request, res, mockNext({ requestHandler: () => res.send({ message: "success" }) }));

      assert.deepEqual(result.data, { message: "success", transformed: true });
    });
  });

  describe("validators", () => {
    test("sync runtime error is passed to NextFunction", async () => {
      const { res, result } = mockRes();
      const middleware = validateResponse({
        200: () => {
          throw new Error("Runtime Error");
        },
      });
      await middleware(
        {} as Request,
        res,
        mockNext({
          requestHandler: () => res.sendStatus(200),
          errorHandler: () => res.status(500).json({ message: "Runtime Error" }),
        }),
      );

      assert.equal(res.statusCode, 500);
      assert.deepEqual(result.data, { message: "Runtime Error" });
    });

    test("async runtime error is passed to NextFunction", async () => {
      const { res, result } = mockRes();
      const middleware = validateResponse({
        200: async () => {
          throw new Error("Runtime Error");
        },
      });
      await middleware(
        {} as Request,
        res,
        mockNext({
          requestHandler: () => res.sendStatus(200),
          errorHandler: () => res.status(500).json({ message: "Runtime Error" }),
        }),
      );

      assert.equal(res.statusCode, 500);
      assert.deepEqual(result.data, { message: "Runtime Error" });
    });
  });

  describe("BadResponseHandler", () => {
    test("default handler", async () => {
      const { res, result } = mockRes();
      const middleware = validateResponse({ 200: (res, done) => done(res, {}) });
      await middleware({} as Request, res, mockNext({ requestHandler: () => res.send() }));

      assert.equal(result.data, 500);
    });

    test("custom handler", async () => {
      const validateResponse = createResponseValidator({
        badResponseHandler: (_err, _req, res) => res.status(500).json({ message: "Custom Handler" }),
      });
      const { res, result } = mockRes();
      const middleware = validateResponse({ 200: (res, done) => done(res, {}) });
      await middleware({} as Request, res, mockNext({ requestHandler: () => res.send() }));

      assert.equal(res.statusCode, 500);
      assert.deepEqual(result.data, { message: "Custom Handler" });
    });

    test("sync runtime error is passed to NextFunction", async () => {
      const validateResponse = createResponseValidator({
        badResponseHandler: () => {
          throw new Error("Runtime Error");
        },
      });
      const { res, result } = mockRes();
      const middleware = validateResponse({ 200: (res, done) => done(res, {}) });
      await middleware(
        {} as Request,
        res,
        mockNext({
          requestHandler: () => res.sendStatus(200),
          errorHandler: () => res.status(500).json({ message: "Runtime Error" }),
        }),
      );

      assert.equal(res.statusCode, 500);
      assert.deepEqual(result.data, { message: "Runtime Error" });
    });

    test("async runtime error is passed to NextFunction", async () => {
      const validateResponse = createResponseValidator({
        badResponseHandler: async () => {
          throw new Error("Runtime Error");
        },
      });
      const { res, result } = mockRes();
      const middleware = validateResponse({ 200: (res, done) => done(res, {}) });
      await middleware(
        {} as Request,
        res,
        mockNext({
          requestHandler: () => res.sendStatus(200),
          errorHandler: () => res.status(500).json({ message: "Runtime Error" }),
        }),
      );

      await wait(100);
      assert.equal(res.statusCode, 500);
      assert.deepEqual(result.data, { message: "Runtime Error" });
    });
  });

  describe("MissingValidatorHandler", () => {
    test("default handler", async () => {
      const validateResponse = createResponseValidator({ requireValidator: true });
      const { res, result } = mockRes();
      const middleware = validateResponse({});
      await middleware({} as Request, res, mockNext({ requestHandler: () => res.sendStatus(200) }));

      assert.equal(result.data, 500);
    });

    test("custom handler", async () => {
      const validateResponse = createResponseValidator({
        missingValidatorHandler: (_err, _req, res) => res.status(500).json({ message: "Custom Handler" }),
        requireValidator: true,
      });
      const { res, result } = mockRes();
      const middleware = validateResponse({});
      await middleware({} as Request, res, mockNext({ requestHandler: () => res.sendStatus(200) }));

      assert.equal(res.statusCode, 500);
      assert.deepEqual(result.data, { message: "Custom Handler" });
    });

    test("sync runtime error is passed to NextFunction", async () => {
      const validateResponse = createResponseValidator({
        requireValidator: true,
        missingValidatorHandler: () => {
          throw new Error("Runtime Error");
        },
      });
      const { res, result } = mockRes();
      const middleware = validateResponse({});
      await middleware(
        {} as Request,
        res,
        mockNext({
          requestHandler: () => res.sendStatus(200),
          errorHandler: () => res.status(500).json({ message: "Runtime Error" }),
        }),
      );

      assert.equal(res.statusCode, 500);
      assert.deepEqual(result.data, { message: "Runtime Error" });
    });

    test("async runtime error is passed to NextFunction", async () => {
      const validateResponse = createResponseValidator({
        requireValidator: true,
        missingValidatorHandler: async () => {
          throw new Error("Runtime Error");
        },
      });
      const { res, result } = mockRes();
      const middleware = validateResponse({});
      await middleware(
        {} as Request,
        res,
        mockNext({
          requestHandler: () => res.sendStatus(200),
          errorHandler: () => res.status(500).json({ message: "Runtime Error" }),
        }),
      );

      await wait(100);
      assert.equal(res.statusCode, 500);
      assert.deepEqual(result.data, { message: "Runtime Error" });
    });
  });

  describe("GlobalValidators", () => {
    test("allow valid requests", async () => {
      const validateResponse = createResponseValidator({
        globalValidators: {
          200: (_res, done) => done({ secret: "*****" }),
        },
      });
      const { res, result } = mockRes();
      const middleware = validateResponse({});
      await middleware(
        {} as Request,
        res,
        mockNext({
          requestHandler: () => res.json({ secret: "super secret" }),
        }),
      );

      assert.equal(res.statusCode, 200);
      assert.deepEqual(result.data, { secret: "*****" });
    });

    test("global validators can be overridden", async () => {
      const validateResponse = createResponseValidator({
        globalValidators: { 200: (_res, done) => done() },
      });
      const { res, result } = mockRes();
      const middleware = validateResponse({
        200: (res, done) => done(res),
      });
      await middleware(
        {} as Request,
        res,
        mockNext({
          requestHandler: () => res.json({ exists: true }),
        }),
      );

      assert.deepEqual(result.data, { exists: true });
    });
  });

  describe("requireValidator", () => {
    test("reject responses with undefined validators when requireValidator = true", async () => {
      const { res, result } = mockRes();
      const validateResponse = createResponseValidator({
        requireValidator: true,
      });
      const middleware = validateResponse({});
      await middleware({} as Request, res, () => res.json({ data: 1234 }));

      assert.equal(res.statusCode, 500);
      assert.equal(result.data, 500);
    });

    test("allow responses with undefined validators when requireValidator = false", async () => {
      const { res, result } = mockRes();
      const validateResponse = createResponseValidator({
        requireValidator: false,
      });
      const middleware = validateResponse({});
      await middleware({} as Request, res, () => res.json({ data: 1234 }));

      assert.equal(res.statusCode, 200);
      assert.deepEqual(result.data, { data: 1234 });
    });
  });
});
