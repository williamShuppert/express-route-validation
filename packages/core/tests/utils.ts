import type { NextFunction, Response } from "express";

export const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const mockNext =
  (options: { requestHandler?: () => void; errorHandler?: (error: any) => void }): NextFunction =>
  (error?: any) => {
    if (error) options.errorHandler?.(error);
    else options.requestHandler?.();
  };

export const mockRes = () => {
  const result: { data: any } = { data: undefined };

  const res = {
    statusCode: 200,
    status: (code) => {
      res.statusCode = code;
      return res;
    },
    sendStatus: (code) => {
      res.status(code);
      result.data = code;
    },
    json: (body) => (result.data = body),
    send: (body) => (result.data = body),
  } as Response;

  return { res, result };
};
