import {
  createRequestValidator as baseCreateRequestValidator,
  type RequestAdapter,
  type RequestConfig,
} from "express-route-validation";
import z from "zod";

export type ZodRequestSchemas = { [property: string]: z.Schema };
export const zodRequestAdapter: RequestAdapter<
  z.ZodIssue[],
  [ZodRequestSchemas]
> = (schemas: ZodRequestSchemas) => {
  return async (req, next) => {
    const validatedData: any = {};
    const errors: z.ZodIssue[] = [];
    for (const [property, schema] of Object.entries(schemas)) {
      const parse = await z.object({ [property]: schema }).safeParseAsync(req);
      if (parse.success) validatedData[property] = parse.data[property];
      else errors.push(...parse.error.errors);
    }
    next(validatedData, errors);
  };
};

export const createRequestValidator = (
  config?: Omit<RequestConfig<z.ZodIssue[], [ZodRequestSchemas]>, "adapter">
) =>
  baseCreateRequestValidator({
    adapter: zodRequestAdapter,
    badRequestHandler: (errors, _req, res) => {
      const issues: Map<
        string | number,
        {
          messages: string[];
          location: (number | string)[];
        }
      > = new Map();

      // Group errors by path
      for (let error of errors) {
        const key = JSON.stringify(error.path);
        let issue = issues.get(key);
        if (!issue) {
          issue = { messages: [], location: error.path };
          issues.set(key, issue);
        }
        issue.messages.push(error.message);
      }

      res.status(400).json({ errors: Array.from(issues.values()) });
    },
    ...config,
  });

export const validateRequest = createRequestValidator();
