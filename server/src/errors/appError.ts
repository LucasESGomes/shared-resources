export class AppError {
    constructor(
        public readonly message: string,
        public readonly statusCode: number = 400
    ) {}
};

export class NotFoundError {
    constructor(
        public readonly message: string,
        public readonly statusCode: number = 404
    ) {}
};

export class UnauthorizedError {
    constructor(
        public readonly message: string,
        public readonly statusCode: number = 401
    ) {}
};

export class ForbiddenError {
    constructor(
        public readonly message: string,
        public readonly statusCode: number = 403
    ) {}
};

export class ConflictError {
    constructor(
        public readonly message: string,
        public readonly statusCode: number = 409
    ) {}
};
