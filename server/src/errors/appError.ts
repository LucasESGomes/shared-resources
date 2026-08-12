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

// Criar o restante...