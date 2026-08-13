import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError, 
    NotFoundError, 
    UnauthorizedError,
    ForbiddenError,
    ConflictError } from "./appError";


export function errorHandler(
    error: FastifyError | ZodError | NotFoundError | UnauthorizedError | ForbiddenError | ConflictError,
    request: FastifyRequest,
    reply: FastifyReply,
) {
    if (error instanceof ZodError) {
        return reply.status(400).send({
            status: 'error',
            code: 'VALIDATION_ERROR',
            message: 'Erro ao validar os dados enviados.',
            issues: error.format()
        });
    }

    if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
            status: 'error',
            message: error.message,
        });
    }

    if (error instanceof NotFoundError) {
        return reply.status(error.statusCode).send({
            status: 'error',
            code: 'NOT_FOUND_ERROR',
            message: error.message
        })
    }

    if (error instanceof UnauthorizedError) {
        return reply.status(error.statusCode).send({
            status: 'error',
            code: 'UNAUTHORIZED_ERROR',
            message: error.message
        })
    }

    if (error instanceof ForbiddenError) {
        return reply.status(error.statusCode).send({
            status: 'error',
            code: 'FORBIDDEN_ERROR',
            message: error.message
        })
    }

    if (error instanceof ConflictError) {
        return reply.status(error.statusCode).send({
            status: 'error',
            code: 'CONFLICT_ERROR',
            message: error.message
        })
    }

    request.log.error(error);

    // Erro genérico do servidor
    return reply.status(500).send({
        status: 'error',
        message: 'Erro interno do servidor'
    })
}