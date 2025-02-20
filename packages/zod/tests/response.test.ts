import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Request } from "express";
import { z } from "zod";
import { mockNext, mockRes, wait } from "../../core/tests/utils.js";
import { createResponseValidator } from "../src/index.js";

describe("zod response validator", () => {
  const validateResponse = createResponseValidator({ requireValidator: true });
  const middleware = validateResponse({
    200: z.object({ username: z.string() }),
  });

  test("valid response", async () => {
    const { res, result } = mockRes();
    await middleware(
      {} as Request,
      res,
      mockNext({
        requestHandler: () =>
          res.json({ username: "user", password: "super secret" }),
      }),
    );

    await wait(100); // wait because zod validators are async
    assert.equal(res.statusCode, 200);
    assert.deepEqual(result.data, { username: "user" });
  });

  test("invalid response", async () => {
    const { res } = mockRes();
    await middleware(
      {} as Request,
      res,
      mockNext({
        requestHandler: () => res.json({}),
      }),
    );

    await wait(100);
    assert.equal(res.statusCode, 500);
  });

  test("missing response validator", async () => {
    const { res } = mockRes();
    await middleware(
      {} as Request,
      res,
      mockNext({
        requestHandler: () => res.sendStatus(404),
      }),
    );

    await wait(100);
    assert.equal(res.statusCode, 500);
  });
});
