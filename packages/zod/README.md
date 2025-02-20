# @express-route-validation/zod

Express middleware for request and response validation.

- 🔒 Request validation
- ✨ Response validation
- 💪 100% test coverage
- 📦 Zero dependencies (except peer dependencies)
- 🔥 TypeScript support

Ensure your Express routes are always receiving and returning the correct data with this express validation middleware. Seamlessly validate request and response objects, catching any instances where your route is returning unwanted data.

![npm version](https://img.shields.io/npm/v/@express-route-validation/zod)
![coverage](https://img.shields.io/badge/coverage-100%25-44cc11?style=flat)

## Installation

```bash
npm install @express-route-validation/zod
```

## Example

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import {
  validateRequest,
  validateResponse,
} from "@express-route-validation/zod";
import { v4 as uuid } from "uuid";
import express from "express";
import z from "zod";

type User = {
  id: string;
  username: string;
  password: string;
};
const users: User[] = [];
const app = express();

app.use(express.json());

app.post(
  "/users",
  validateResponse({
    // filters out everything besides id and username
    201: z.object({
      id: z.string().uuid(),
      username: z.string(),
    }),
  }),
  validateRequest({
    // Automatically handles bad requests, returning relevant errors and status of 400
    body: z.object({
      username: z.string().transform((val) => val.replace(/\s+/g, "-")),
      password: z.string().min(6),
    }),
  }),
  (req, res): any => {
    const { username, password } = req.validated.body;

    const exists = users.find((user) => user.username);
    if (exists) return res.status(409).json({ message: "username taken" });

    const user = {
      id: uuid(),
      username,
      password,
    };
    users.push(user);
    res.status(201).json(user);
  },
);

// Test cases

test("valid response", async () => {
  const res = await request(app).post("/users").send({
    username: "my username",
    password: "123456",
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.username, "my-username");
  assert.notEqual(
    users.find((user) => user.id == res.body.id),
    undefined,
  );
});

test("invalid response", async () => {
  const res = await request(app).post("/users").send({
    username: "user",
    password: "1234",
  });

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    errors: [
      {
        location: ["body", "password"],
        messages: ["string must contain at least 6 character(s)"],
      },
    ],
  });
});
```

## Configure

### Request

```ts
import { createRequestValidator } from "@express-route-validation/zod";
import z from "zod";

const validateRequest = createRequestValidator({
  badRequestHandler: (error: z.ZodIssue[], _req, res, _next) => {
    res.status(400).json({ error });
  },
  path: "validated",
});
```

- **badResponseHandler**: called when a request fails validation
- **path**: the location where validated data will be stored on the request object

### Response

```ts
import { createResponseValidator } from "@express-route-validation/zod";

const validateResopnse = createResponseValidator({
  badResponseHandler: (_err, req, res) => {
    console.warn(
      `Bad ${res.statusCode} Response at (${req.method}) ${req.originalUrl}`,
    );
    res.sendStatus(500);
  },
  missingValidatorHandler: (_err, req, res) => {
    console.warn(
      `Missing ${res.statusCode} Response Validator at (${req.method}) ${req.originalUrl}`,
    );
    res.sendStatus(500);
  },
  requireValidator: true,
});
```

- **badResponseHandler**: called when a response fails validation
- **missingValidatorHandler**: called when a response has no validation schema
- **requireValidator**: calls missingValidatorHandler when true
