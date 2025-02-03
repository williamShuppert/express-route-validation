import type { Request, RequestHandler } from "express";
import { isError, type Handler, type Validator, type ValidatorCallback } from "./shared.js";

export type RequestValidator<ValidatorError> = Validator<Request, { [key: string]: any }, ValidatorError>;

export type RequestAdapter<ValidatorError, AdapterParams extends any[]> = (
  ...param: AdapterParams
) => RequestValidator<ValidatorError>;

export interface RequestConfig<ValidatorError, AdapterParams extends any[]> {
  badRequestHandler?: Handler<ValidatorError>;
  adapter?: RequestAdapter<ValidatorError, AdapterParams>;
}

export const createRequestValidator = <
  ValidatorError = any,
  AdapterParams extends any[] = [RequestValidator<ValidatorError>],
>(
  config?: RequestConfig<ValidatorError, AdapterParams>,
) => {
  return (...params: AdapterParams): RequestHandler => {
    const requiredConfig = {
      badRequestHandler: (_err, _req, res) => res.sendStatus(400),
      adapter: (validator: RequestValidator<ValidatorError>) => validator,
      ...config,
    } as Required<RequestConfig<ValidatorError, AdapterParams>>;

    return async (req, res, next) => {
      try {
        const callback: ValidatorCallback<{ [key: string]: any }, ValidatorError> = (result, error) => {
          try {
            if (isError<ValidatorError>(error)) return requiredConfig.badRequestHandler(error, req, res, next);

            if (result !== undefined)
              for (const [property, value] of Object.entries(result)) (req as any)[property] = value;

            next();
          } catch (error) {
            next(error);
          }
        };

        const validator = requiredConfig.adapter(...params);
        await validator(req, callback);
      } catch (error) {
        next(error);
      }
    };
  };
};

export const validateRequest = createRequestValidator();
