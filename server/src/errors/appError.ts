// Classe base de todos os erros de negócio da aplicação
export class AppError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number = 400,
        public readonly code: string = 'APP_ERROR'
    ) {
        super(message);
        this.name = new.target.name;
    }
};

// no throw new lá é só escrever a mensagem *para todos os métodos está assim

export class NotFoundError extends AppError {
    constructor(message: string) {
        super(message, 404, 'NOT_FOUND_ERROR');
    }
};

export class UnauthorizedError extends AppError {
    constructor(message: string) {
        super(message, 401, 'UNAUTHORIZED_ERROR');
    }
};

export class ForbiddenError extends AppError {
    constructor(message: string) {
        super(message, 403, 'FORBIDDEN_ERROR');
    }
};

export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409, 'CONFLICT_ERROR');
    }
};
