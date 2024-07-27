export class ValidationError<T> extends Error {
    errors: T

    constructor(errors: T) {
        super()
        this.errors = errors
    }
}

export class RequestValidationError extends ValidationError<RequestErrorData<any>[]> {
    constructor(errors: RequestErrorData<any>[]) {
        super(errors)
        this.errors = errors
    }
}

export class ResponseValidationError extends ValidationError<any> {
    constructor(errors: any) {
        super(errors)
        this.errors = errors
    }
}

export class MissingSchemaError extends ValidationError<MissingSchemaErrorData> {

    constructor(errors: MissingSchemaErrorData) {
        super(errors)
        this.errors = errors
    }
}

export type MissingSchemaErrorData = {
    statusCode: number
    method: string
    originalUrl: string
    message: string
}

export type RequestErrorData<T> = {
    location: string,
    error: T
}