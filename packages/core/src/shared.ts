import type { NextFunction, Request, Response } from "express";

export type ValidatorCallback<ValidatedData, Error> = (result?: ValidatedData, error?: Error) => void;

export type Validator<In, Out, Error> = (data: In, done: ValidatorCallback<Out, Error>) => void | Promise<void>;

export type Handler<ValidatorError> = (
  error: ValidatorError,
  req: Request,
  res: Response,
  next: NextFunction,
) => void | any | Promise<void | any>;

export const isError = <Error>(error: any): error is Error => {
  // Empty arrays don't count as errors
  const isArray = Array.isArray(error);
  const isEmptyArray = isArray && error.length == 0;
  const isDefined = !!error; //error != undefined && error != null
  return isDefined && !isEmptyArray;
};
