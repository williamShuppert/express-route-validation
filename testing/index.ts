import request from "supertest";
import express from "express";
import {
	validateRequest,
	validateResponse,
	defaultBadRequestHandler,
	config,
} from "../src";
import { z, ZodError, ZodSchema } from "zod";
import Joi, { ObjectSchema } from "joi";

// Setup validator with Zod and Joi
const configureZod = () =>
	config({
		validator: (data, schema: ZodSchema) => schema.safeParse(data),
		badRequestHandler: (err: ZodError, req, res) => res.status(400).json({ errors: err.errors })
	});

const configureJoi = () =>
	config({
		validator: (data, schema: ObjectSchema) => {
			const parse = schema.validate(data);
			console.log(parse);
			return parse.error
				? { success: false, error: parse.error }
				: { success: true, data: parse.value };
		},
	});

// Create API
const app = express();
app.use(express.json());

app.get(
	"/",
	validateRequest(
		z.object({
			query: z.object({
				number: z.coerce.number(),
			}),
		}),
	),
	(req, res) => {
		res.json({ number: req.query.number });
	},
);

app.get("/missing-response-schema", validateResponse({}), (_, res) => {
	res.sendStatus(201);
});

app.get(
	"/valid-json-response",
	validateResponse({
		200: z.object({ hello: z.literal("world") }),
	}),
	(_, res) => {
		res.json({ hello: "world" });
	},
);

app.get(
	"/invalid-json-response",
	validateResponse({
		200: z.object({ hello: z.literal("world") }),
	}),
	(_, res) => {
		res.json({ hello: "sir" });
	},
);

app.get("/server-error", validateResponse({}), (_, res) => {
	res.sendStatus(500);
});

app.get("/throw-error", validateResponse({}), (_, res) => {
	throw new Error();
});

app.get("/not-implemented", validateResponse({}), (_, res) => {
	res.sendStatus(501);
});

app.get(
	"/valid-json-response-joi",
	validateResponse({
		200: Joi.object({ hello: "world" }),
	}),
	(_, res) => {
		res.json({ hello: "world" });
	},
);

// Begin tests
describe("defaults", () => {
	it("should return an error from validateRequest because the validator is not configured", async () => {
		config({ validator: undefined })
		const res = await request(app).get("/")

		expect(res.status).toBe(500);
		expect(res.text.includes('Validator not set')).toBe(true)
	});

	it("should return an error from validateRequest because the validator is not configured", async () => {
		config({ validator: undefined })
		const res = await request(app).get("/valid-json-response")

		expect(res.status).toBe(500);
		expect(res.text.includes('Validator not set')).toBe(true)
	});

	it("should fail validation and successfully use the default bad request handler", async () => {
		configureZod()
		config({
			badRequestHandler: defaultBadRequestHandler
		})
		const res = await request(app).get("/")

		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: "Bad Request" })
	});
})

describe("validateRequest middleware", () => {
	beforeEach(() => {
		configureZod();
	})

	it("should pass validation when query parameter is valid", async () => {
		const res = await request(app).get("/").query({ number: "123" });

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ number: "123" });
	});

	it("should fail validation when query parameter is not a number", async () => {
		const res = await request(app).get("/").query({ number: "abc" });

		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty("errors");
		expect(res.body.errors[0].expected).toBe("number");
		expect(res.body.errors[0].received).toBe("nan");
		expect(res.body.errors[0].path).toEqual(["query", "number"]);
	});

	it("should fail validation when required query parameter is missing", async () => {
		const res = await request(app).get("/");

		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty("errors");
		expect(res.body.errors[0].expected).toBe("number");
		expect(res.body.errors[0].received).toBe("nan");
		expect(res.body.errors[0].path).toEqual(["query", "number"]);
	});

	it("should use the configured bad request handler when a request fails validation", async () => {
		config({
			badRequestHandler: (_err, _req, res) =>
				res.status(400).json({ message: "This is a custom bad request handler" }),
		});
		const res = await request(app).get("/");

		config({
			badRequestHandler: defaultBadRequestHandler,
		});
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty("message");
		expect(res.body.message).toBe("This is a custom bad request handler");
	});
});

describe("validateResponse middleware", () => {
	beforeEach(() => {
		configureZod();
	})

	it("should fail validation when a status code has no associated validation schema", async () => {
		const res = await request(app).get("/missing-response-schema");
		expect(res.status).toBe(500);
	});

	it("should allow a 500 status code without defining a schema", async () => {
		const res = await request(app).get("/server-error");
		expect(res.status).toBe(500);
	});

	it("should allow a 501 status code without defining a schema", async () => {
		const res = await request(app).get("/not-implemented");
		expect(res.status).toBe(501);
	});

	it("should allow 500 status code when an error is thrown without defining a schema", async () => {
		const res = await request(app).get("/throw-error");
		expect(res.status).toBe(500);
	});

	it("should fail validation when response does not match validation schema", async () => {
		const res = await request(app).get("/invalid-json-response");
		expect(res.status).toBe(500);
	});

	it("should pass validation when response matches validation schema", async () => {
		const res = await request(app).get("/valid-json-response");
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ hello: "world" });
	});

	it("should pass validation when response matches Joi validation schema", async () => {
		configureJoi();
		const res = await request(app).get("/valid-json-response-joi");

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ hello: "world" });
	});
});
