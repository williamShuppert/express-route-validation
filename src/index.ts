import { NextFunction, Request, RequestHandler, Response, Send } from 'express'
import { MissingSchemaError, MissingSchemaErrorData, RequestErrorData, RequestValidationError, ResponseValidationError } from './validation-error'

export * from './validation-error'

interface ValidatorOptions {
    response: {[statusCode: number]: any}
    request?: {
        body?: any
        query?: any
        params?: any
        headers?: any
    }
    route: RequestHandler
}

export const routeValidator = (options: ValidatorOptions) => (req: Request, res: Response, next: NextFunction) => {
    const resetSends = responseValidator(options, req, res, next)
    requestValidator(options, req, res, next, resetSends)
}

const responseValidator = (options: ValidatorOptions, req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send.bind(res)
    const originalJson = res.json.bind(res)

    const resetSends = () => {
        res.send = originalSend
        res.json = originalJson
    }

    const send = (original: Send) => (body: any) => {
        resetSends()

        const schema = options.response[res.statusCode]

        // Schema doesn't need to be defined for status code 400 if a bad request handler already defined
        if (res.statusCode === 400 && badRequestHandler) {
            original(body)
            return res
        }

        // Ensure a schema is defined for specific response
        if (schema === undefined) {
            const error = {
                statusCode: res.statusCode,
                method: req.method,
                originalUrl: req.originalUrl,
                message: `Response of ${res.statusCode} is missing a validation schema at (${req.method}) ${req.originalUrl}`
            }

            if (missingResponseSchemaHandler)
                missingResponseSchemaHandler(error, req, res, next)
            else
                next(new MissingSchemaError(error))

            return res
        }

        // Validate against schema
        const validation = validate(body, schema)

        if (validation.success)
            original(body)
        else if (badResponseHandler)
            badResponseHandler(validation.error, req, res, next)
        else
            next(new ResponseValidationError(validation.error))

        return res
    }

    res.json = send(originalJson)
    res.send = send(originalSend)

    return resetSends
}

const requestValidator = (options: ValidatorOptions, req: Request, res: Response, next: NextFunction, resetSends: () => void) => {
    const errors: RequestErrorData<any>[] = []
    for (let key in options.request) {
        const data = (req as any)[key]
        if (data === undefined) continue
        const schema = (options.request as any)[key] as any

        // Validate
        const validation = validate(data, schema)
        if (validation.success) (req as any)[key] = validation.data
        else errors.push({ location: key, error: validation.error })
    }

    // Handle errors or pass to next express error handler
    if (errors.length > 0) {
        resetSends() // Don't need to validate response anymore

        if (badRequestHandler)
            badRequestHandler(errors, req, res, next)
        else
            next(new RequestValidationError(errors))
        return
    }

    // No validation errors, run route while catching any sync/async errors
    new Promise(resolve => 
        resolve(options.route(req, res, err => {
            resetSends() // Don't need to validate response anymore
            next(err)
        })))
        .catch(err => {
            resetSends() // Don't need to validate response anymore
            next(err)
        }) // Catch runtime errors and pass to next express error handler
}




type ValidateFunction<SchemaType> = (data: any, schema: SchemaType) => { success: true, data: any } | { success: false, error: any }
let validate: ValidateFunction<any> = (data: any, schema: any) => {
    throw Error("validate function not configured.")
}

export type RequestValidationErrorHandler<ErrorType> = ((errors: RequestErrorData<ErrorType>[], req: Request, res: Response, next: NextFunction) => void) | undefined
export type ResponseValidationErrorHandler<ErrorType> = ((error: ErrorType, req: Request, res: Response, next: NextFunction) => void) | undefined
export type MissingSchemaErrorHandler = ((error: MissingSchemaErrorData, req: Request, res: Response, next: NextFunction) => void) | undefined
let badRequestHandler: RequestValidationErrorHandler<any> = undefined
let badResponseHandler: ResponseValidationErrorHandler<any> = undefined
let missingResponseSchemaHandler: MissingSchemaErrorHandler = undefined

export interface ValidatorConfig<SchemaType, ErrorType> { 
    validator: ValidateFunction<SchemaType>
    badRequestHandler?: RequestValidationErrorHandler<ErrorType>
    badResponseHandler?: ResponseValidationErrorHandler<ErrorType>
    missingResponseSchemaHandler?: MissingSchemaErrorHandler
}
export default <SchemaType, ErrorType>(config: ValidatorConfig<SchemaType, ErrorType>) => {
    validate = config.validator
    if (config.badRequestHandler)
        badRequestHandler = config.badRequestHandler
    if (config.badResponseHandler)
        badResponseHandler = config.badResponseHandler
    if (config.missingResponseSchemaHandler)
        missingResponseSchemaHandler = config.missingResponseSchemaHandler
}