import type { Response, RequestHandler, Send } from "express";
import { isError, type Handler, type Validator } from "./shared.js";

/*
  TODO:
  Support the following:
    [X] send
    [X] json
    [X] sendStatus
    [ ] jsonp
    [ ] sendFile
    [ ] redirect
    [ ] render
*/

export type ResponseValidators<ValidatorError> = {
  [statusCode: number]: Validator<any, any, ValidatorError>;
};

export type ResponseAdapter<ValidatorError, AdapterParams extends any[]> = (
  ...param: AdapterParams
) => ResponseValidators<ValidatorError>;

export type ResponseConfig<ValidatorError, AdapterParams extends any[]> = {
  badResponseHandler?: Handler<ValidatorError>;
  missingValidatorHandler?: Handler<undefined>;
  adapter?: ResponseAdapter<ValidatorError, AdapterParams>;
  globalValidators?: ResponseValidators<ValidatorError>;
  requireValidator?: boolean;
};

export const createResponseValidator = <ValidatorError = any, AdapterParams extends any[] = [ResponseValidators<any>]>(
  config?: ResponseConfig<ValidatorError, AdapterParams>,
) => {
  // Apply defaults
  const requiredConfig = {
    requireValidator: false,
    badResponseHandler: (_err, req, res) => {
      console.warn(`Bad ${res.statusCode} Response at (${req.method}) ${req.originalUrl}`);
      res.sendStatus(500);
    },
    missingValidatorHandler: (_err, req, res) => {
      console.warn(`Missing ${res.statusCode} Response Validator at (${req.method}) ${req.originalUrl}`);
      res.sendStatus(500);
    },
    adapter: (validator: ResponseValidators<any>) => validator,
    ...config,
  } as Required<ResponseConfig<ValidatorError, AdapterParams>>;

  return (...param: AdapterParams): RequestHandler => {
    const validators = {
      ...requiredConfig.globalValidators,
      ...requiredConfig.adapter(...param),
    };

    return async (req, res, next) => {
      try {
        const callback = async (validatedData: any, error: ValidatorError | undefined, originalSend: Send) => {
          try {
            if (isError<ValidatorError>(error)) await requiredConfig.badResponseHandler(error, req, res, next);
            else originalSend(validatedData);
          } catch (error) {
            next(error);
          }
        };

        // Save original sends
        const sendTypes = ["send", "json", "sendStatus"] as const;
        const originals = new Map<string, Send>();
        for (const type of sendTypes) originals.set(type, (res as any)[type].bind(res));

        const builder =
          (originalSend: Send) =>
          (body?: any): Response => {
            try {
              // Reset sends
              for (let [type, func] of originals) (res as any)[type] = func;

              // Ensure validator exists
              const validator = validators[res.statusCode];
              if (!validator) {
                if (!requiredConfig.requireValidator) originalSend(body);
                else
                  requiredConfig.missingValidatorHandler(undefined, req, res, next)?.catch((error: any) => next(error));
                return res;
              }

              // Run validator
              const result = validator(body, (result, error) => callback(result, error, originalSend));
              if (result instanceof Promise) result.catch((error) => next(error));
            } catch (error) {
              next(error);
            } finally {
              return res;
            }
          };

        // Override send functions
        for (let [type, func] of originals) (res as any)[type] = builder(func);

        // sendStatus has to set the status code first
        res.sendStatus = (code: number) => {
          res.status(code);
          return builder(originals.get("sendStatus")!)(code);
        };

        next();
        /* c8 ignore start */
      } catch (error) {
        next(error);
      }
      /* c8 ignore end */
    };
  };
};

export const validateResponse = createResponseValidator();
