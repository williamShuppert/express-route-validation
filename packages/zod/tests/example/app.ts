import express, { type ErrorRequestHandler } from "express";
import { validateRequest, createResponseValidator } from "../../src/index.js";
import { z } from "zod";
import { db } from "./mock-db.js";

const usernameSchema = z
  .string()
  .min(3, "must contain at least 3 characters")
  .max(20, "must contain at most 20 characters")
  .regex(
    /^[a-z0-9-]+$/,
    "can only contain lowercase letters, numbers, and dashes"
  )
  .regex(/^[a-z0-9]/, "cannot start with a dash")
  .regex(/[a-z0-9]$/, "cannot end with a dash");

const passwordSchema = z
  .string()
  .min(6, "must contain at least 6 characters")
  .regex(/[A-Z]/, "must contain at least one uppercase letter")
  .regex(/[a-z]/, "must contain at least one lowercase letter")
  .regex(/[0-9]/, "must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "must contain at least one special character");

const validateResponse = createResponseValidator({ requireValidator: true });

export const app = express();

app.use(express.json());

app.post(
  "/users",
  validateResponse({
    201: z.object({
      id: z.number(),
      username: z.string(),
    }),
    400: z.any(),
    409: z.object({ message: z.literal("username taken") }),
  }),
  validateRequest({
    body: z.object({
      username: usernameSchema,
      password: passwordSchema,
      test: z
        .object({
          useMissingResponseValidator: z.boolean().default(false),
          useBadResponse: z.boolean().default(false),
        })
        .default({}),
    }),
  }),
  (req, res): any => {
    const { username, password, test } = req.validated.body;

    if (test.useMissingResponseValidator) return res.sendStatus(501);
    if (test.useBadResponse) return res.sendStatus(409);

    const user = db.users.insert(username, password);
    if (!user) return res.status(409).json({ message: "username taken" });
    res.status(201).json(user);
  }
);

app.use(((error, _req, res, _next) => {
  console.log("Error Handler:", error);
  res.status(500).json({ message: "Internal Server Error" });
}) as ErrorRequestHandler);
