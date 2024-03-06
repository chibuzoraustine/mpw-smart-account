import { Response } from "express";
import { IResponseError } from "../types/errors.types";

function handleResponseError(res: Response, err: unknown) {
    if (
        (err instanceof (BadRequestError)) ||
        (err instanceof (UnauthorizedError)) ||
        (err instanceof (ValidationError)) ||
        (err instanceof (InternalServerError))
    ) {
        res.status(err.status).json(err)
    } else {
        res.status(500).json(err)
    }
}

class BadRequestError implements IResponseError {
    public status: number
    constructor(
        public message: string = "Bad Request",
        public data: object = {},
        readonly name: string = "BadRequestError"
    ) {
        this.status = 400;
    }
}

class UnauthorizedError implements IResponseError {
    public status: number
    constructor(
        public message: string = "Unauthorized",
        public data: object = {},
        readonly name: string = "UnauthorizedError"
    ) {
        this.status = 401;
    }
}

class ValidationError implements IResponseError {
    public status: number
    constructor(
        public message: string = "Input validation failed",
        public data: object = [],
        readonly name: string = "ValidationError"
    ) {
        this.status = 422;
    }
}

class InternalServerError implements IResponseError {
    public status: number
    constructor(
        public message: string = "Internal Server Error",
        public data: object = {},
        readonly name: string = "InternalServerError"
    ) {
        this.status = 500;
    }
}

export {
    handleResponseError,
    BadRequestError,
    UnauthorizedError,
    ValidationError,
    InternalServerError
}