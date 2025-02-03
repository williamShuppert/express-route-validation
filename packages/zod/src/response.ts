import {
  createResponseValidator as baseCreateResponseValidator,
  type ResponseAdapter,
  type ResponseConfig,
  type ResponseValidators,
} from "express-route-validation";
import z from "zod";

export type ZodResponseSchemas = { [code: number]: z.Schema };
export const zodResponseAdapter: ResponseAdapter<
  z.ZodIssue[],
  [ZodResponseSchemas]
> = (schemas: ZodResponseSchemas) => {
  const validators: ResponseValidators<z.ZodIssue[]> = {};
  Object.entries(schemas).forEach(([code, schema]) => {
    validators[Number(code)] = async (data, next) => {
      const parse = await schema.safeParseAsync(data);
      next(parse.data, parse.error?.errors);
    };
  });
  return validators;
};

export const createResponseValidator = (
  config?: Omit<ResponseConfig<z.ZodIssue[], [ZodResponseSchemas]>, "adapter">
) =>
  baseCreateResponseValidator({
    requireValidator: false,
    adapter: zodResponseAdapter,
    ...config,
  });

export const validateResponse = createResponseValidator();
