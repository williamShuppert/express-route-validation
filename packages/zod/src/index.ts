export * from "./request.js";
export * from "./response.js";

// import {
//   createResponseValidator,
//   type RequestAdapter,
//   type ResponseValidators,
// } from "express-route-validation";
// import z from "zod";

// // Zod Request Adapter
// export type ZodRequestSchemas = { [property: string]: z.Schema };
// export const zodRequestAdapter: RequestAdapter<
//   ZodRequestSchemas,
//   z.ZodIssue[]
// > = (schemas) => {
//   return async (data, next) => {
//     const validatedData: any = {};
//     const errors: any[] = [];
//     for (const [property, schema] of Object.entries(schemas)) {
//       const parse = await schema.safeParseAsync((data as any)[property]);
//       validatedData[property] = parse.data;
//       if (parse.error) errors.push(...parse.error.errors);
//     }
//     next(validatedData, errors);
//   };
// };
// export const validateRequest = createRequestValidator({
//   badRequestHandler: (_error, _req, res) => {
//     res.sendStatus(400);
//   },
//   adapter: zodRequestAdapter,
// });

// // Zod Response Adapter
// export type ZodResponseSchemas = { [code: number]: z.Schema };
// export const zodResponseAdapter: ValidatorsAdapter<ZodResponseSchemas> = (
//   schemas,
// ): ResponseValidators => {
//   const validators: ResponseValidators = {};
//   Object.entries(schemas).forEach(([code, schema]) => {
//     validators[Number(code)] = async (data, next) => {
//       const parse = await schema.safeParseAsync(data);
//       next(parse.data, parse.error?.errors);
//     };
//   });
//   return validators;
// };
// export const validateResponse = createResponseValidator({
//   adapter: zodResponseAdapter,
// });
