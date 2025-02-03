import request from "supertest";
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { app } from "./example/app.js";
import { db } from "./example/mock-db.js";

describe("(POST) /users", () => {
  test("valid request", async () => {
    const username = "new-user";
    const password = "Pa$5word";
    const res = await request(app).post("/users").send({
      username,
      password,
    });

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.password, undefined);
    assert.equal(res.body.username, username);
    assert.equal(typeof res.body.id, "number");
    assert.deepEqual(db.users.getById(res.body.id), {
      id: res.body.id,
      username,
      password,
    });
  });

  test("username taken", async () => {
    const username = "user";
    const password = "Pa$5word";
    const res = await request(app).post("/users").send({
      username,
      password,
    });

    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.body, { message: "username taken" });
  });

  test("invalid request", async () => {
    const res = await request(app).post("/users").send({
      username: "u-",
      password: "pass",
    });

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
      errors: [
        {
          location: ["body", "username"],
          messages: [
            "must contain at least 3 characters",
            "cannot end with a dash",
          ],
        },
        {
          location: ["body", "password"],
          messages: [
            "must contain at least 6 characters",
            "must contain at least one uppercase letter",
            "must contain at least one number",
            "must contain at least one special character",
          ],
        },
      ],
    });
  });

  test("missing response validator", async () => {
    const res = await request(app)
      .post("/users")
      .send({
        username: "new-user",
        password: "Pa$5word",
        test: {
          useMissingResponseValidator: true,
        },
      });

    assert.equal(res.statusCode, 500);
  });

  test("bad response", async () => {
    const res = await request(app)
      .post("/users")
      .send({
        username: "new-user",
        password: "Pa$5word",
        test: {
          useBadResponse: true,
        },
      });

    assert.equal(res.statusCode, 500);
  });
});
