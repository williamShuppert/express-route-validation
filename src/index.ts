import { NextFunction, Request, RequestHandler, Response, Send } from "express";

export type ValidationErrorType = 'missing schema' | 'bad response' | 'missing validator';

export class ValidationError extends Error {
	type: ValidationErrorType;

	constructor(message: string, type: ValidationErrorType) {
		super(message)
		this.message = message
		this.type = type
	}
}

export type ErrorHandler = (
	error: any,
	req: Request,
	res: Response,
	next: NextFunction,
) => void;

export type ParseSuccess = {
	success: true;
	data: any;
	error?: never;
};

export type ParseError = {
	success: false;
	error: any;
	data?: never;
};

export type ParseReturnType = ParseSuccess | ParseError;

type RouteResponseValidations = { [statusCode: number]: any };

export interface Config {
	badRequestHandler?: ErrorHandler;
	validator?: (data: any, schema: any) => ParseReturnType;
}

export const defaultBadRequestHandler: ErrorHandler = (
	_error,
	_req,
	res,
	_next,
) => {
	res.status(400).json({ message: "Bad Request" });
};

let options: Config = {
	badRequestHandler: defaultBadRequestHandler,
};

export function config(config: Config) {
	options = {
		...options,
		...config,
	};
}

export const validateRequest =
	(requestSchema: any) =>
	async (req: Request, res: Response, next: NextFunction) => {
		if (!options.validator) {
			next(new ValidationError('Validator not set', 'missing validator'))
			return
		}

		const parse = options.validator!(req, requestSchema);

		if (!parse.success) {
			options.badRequestHandler!(parse.error, req, res, next);
			return;
		}

		req = parse.data as any;

		next();
	};

export const validateResponse =
	(responseSchemas: RouteResponseValidations): RequestHandler =>
	async (req, res, next) => {
		if (!options.validator) {
			next(new ValidationError('Validator not set', 'missing validator'))
			return
		}

		const sendTypes = ["send", "json", "sendStatus"];
		const originals = new Map<string, Send>();
		for (const type of sendTypes)
			originals.set(type, (res as any)[type].bind(res));

		const builder = (send: Send) => (body?: any) => {
			// Reset sends
			for (let [type, func] of originals) (res as any)[type] = func;

			// Allow any 5XX codes to be sent without validation
			if (res.statusCode >= 500 && res.statusCode <= 511) {
				res.send(body);
				return res;
			}

			// Ensure schema exists
			const schema = responseSchemas[res.statusCode];
			if (schema === undefined)
				throw new ValidationError(
					`Response of ${res.statusCode} is missing a validation schema at (${req.method}) ${req.originalUrl}`,
					'missing schema'
				);

			// Validate body
			const parse = options.validator!(body, schema);
			if (!parse.success)
				throw new ValidationError(
					`Response of ${res.statusCode} does not match the validation schema at (${req.method}) ${req.originalUrl}    Zod Error Message: ${parse.error.message}`,
					'bad response'
				);

			return send(parse.data);
		};

		// Override send functions
		for (let [type, func] of originals) (res as any)[type] = builder(func);

		// sendStatus has to set the status code first
		res.sendStatus = (code: number) => {
			res.status(code);
			return builder(originals.get("send")!)();
		};

		next();
	};
