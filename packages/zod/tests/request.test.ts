import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Request } from "express";
import { validateRequest } from "../src/request.js";
import { z } from "zod";
import { mockRes } from "../../core/tests/utils.js";

describe("zod request validator", () => {
  const middleware = validateRequest({
    body: z.object({
      username: z.string().min(3),
      number: z.coerce.number().optional(),
    }),
  });

  test("invalid request", async () => {
    const { res, result } = mockRes();
    await middleware({ body: { username: "a" } } as Request, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.deepEqual(result.data, {
      errors: [
        {
          location: ["body", "username"],
          messages: ["string must contain at least 3 character(s)"],
        },
      ],
    });
  });

  test("valid request", async () => {
    const { res } = mockRes();
    const req = { body: { username: "username", number: 5 } } as Request;
    await middleware(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(req.validated.body.number, 5);
    assert.notEqual(req.validated.body.number, "5");
  });
});
