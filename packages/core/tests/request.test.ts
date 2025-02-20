import { describe, it, test, mock } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { createRequestValidator, validateRequest } from "../src/request.js";

describe("validateRequest()", () => {
  it("valid request continues to NextFunction with validated data", async () => {
    const next = mock.fn();
    const req = { body: { username: "first last" } } as Request;

    const middleware = validateRequest((req, done) => {
      let username = req.body.username as string;
      username = username.replace(/\s/g, "-");
      done({ body: { username } });
    });
    await middleware(req, {} as Response, next);

    assert.equal(next.mock.callCount(), 1, "NextFunction should be called once");
    assert.equal(next.mock.calls[0]?.arguments.length, 0, "an error was passed to NextFunction");
    assert.equal(req.validated.body.username, "first-last", "Request object is not using validated data");
  });

  test("invalid request sends status code of 400", async () => {
    const next = mock.fn();
    const req = { body: { modified: false } } as Request;
    const sendStatus = mock.fn((_) => {});
    const res = {
      sendStatus,
    } as unknown as Response;

    const middleware = validateRequest((_req, done) => done({ body: { modified: true } }, "error"));
    await middleware(req, res, next);

    assert.equal(next.mock.callCount(), 0, "NextFunction should not be called");
    assert.equal(sendStatus.mock.callCount(), 1, "sendStatus was called more than once");
    assert.equal(sendStatus.mock.calls[0]?.arguments[0], 400, "Wrong status code sent");
    assert.equal(req.validated, undefined, "Request object should have validated data");
  });

  test("errors thrown in a validator are passed to NextFunction", async () => {
    const next = mock.fn();

    const middleware = validateRequest(() => {
      throw new Error("runtime");
    });
    await middleware({} as Request, {} as Response, next);

    assert.equal(next.mock.callCount(), 1, "NextFunction should be called once");
    assert.ok(next.mock.calls[0]?.arguments[0] instanceof Error, "error wasn't passed to NextFunction");
  });

  test("errors thrown in BadRequestHandler are passed to NextFunction", async () => {
    // res.sendStatus is not defined so BadRequestHandler throws a TypeError
    const next = mock.fn();
    const middleware = validateRequest((req, done) => done(req, "error"));
    await middleware({} as Request, {} as Response, next);

    assert.equal(next.mock.callCount(), 1, "NextFunction was called more than once");
    assert.ok(next.mock.calls[0]?.arguments[0] instanceof TypeError, "NextFunction didn't receive correct error");
  });

  test("custom path", async () => {
    const next = mock.fn();
    const validateRequest = createRequestValidator({ path: "validateValues" });
    const req = { body: { username: "first last" } } as Request;

    const middleware = validateRequest((req, done) => {
      let username = req.body.username as string;
      username = username.replace(/\s/g, "-");
      done({ body: { username } });
    });
    await middleware(req, {} as Response, next);

    assert.equal(next.mock.callCount(), 1, "NextFunction should be called once");
    assert.equal(next.mock.calls[0]?.arguments.length, 0, "an error was passed to NextFunction");
    assert.equal(req.validated, undefined, "Validated data should not be found at req.validated");
    assert.equal(
      (req as any).validateValues.body.username,
      "first-last",
      "Request object is missing validated data at custom path",
    );
  });

  test("custom BadRequestHandler", async () => {
    const res = {
      status: () => res,
      json() {},
    } as unknown as Response;
    const status = mock.method(res, "status");
    const json = mock.method(res, "json");

    const validateRequest = createRequestValidator({
      badRequestHandler: (error: string, _req, res, _next) => res.status(400).json({ error }),
    });

    const middleware = validateRequest((req, done) => done(req, "send this error"));
    await middleware({} as Request, res, (err) => console.log(err));

    assert.equal(status.mock.callCount(), 1);
    assert.equal(status.mock.calls[0]?.arguments[0], 400, "wrong status code");
    assert.equal(json.mock.callCount(), 1);
    assert.deepEqual(json.mock.calls[0]?.arguments[0], { error: "send this error" }, "wrong json response");
  });

  test("custom RequestAdapter", async () => {
    const next = mock.fn();
    const res = {
      sendStatus: () => {},
    } as unknown as Response;
    const sendStatus = mock.method(res, "sendStatus");

    const validateRequest = createRequestValidator({
      adapter: (property: string, value: any) => (req, done) => done(req, req.body[property] !== value),
    });

    const middleware = validateRequest("isAdmin", true);
    middleware({ body: { isAdmin: true } } as Request, res, next);
    middleware({ body: { isAdmin: false } } as Request, res, next);

    assert.equal(next.mock.callCount(), 1);
    assert.equal(next.mock.calls[0]?.arguments[0], undefined);

    assert.equal(sendStatus.mock.callCount(), 1);
    assert.equal(sendStatus.mock.calls[0]?.arguments[0], 400);
  });
});
