import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
import { AppError } from "./appError";


export function errorHandler(
    error: FastifyError | Error,
    request: FastifyRequest,
    reply: FastifyReply,
) {
    // Erros de negócio lançados pelos services (AppError e todas as subclasses)
    if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
            status: 'error',
            code: error.code,
            message: error.message,
        });
    }

    // Erro de validação lançado por um schema.parse() manual
    if (error instanceof ZodError) {
        return reply.status(400).send({
            status: 'error',
            code: 'VALIDATION_ERROR',
            message: 'Erro ao validar os dados enviados.',
            issues: error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            })),
        });
    }

    // Erro de validação do schema declarado na rota (fastify-type-provider-zod)
    if (hasZodFastifySchemaValidationErrors(error)) {
        return reply.status(400).send({
            status: 'error',
            code: 'VALIDATION_ERROR',
            message: 'Erro ao validar os dados enviados.',
            issues: error.validation.map((issue) => ({
                field: issue.instancePath.replace(/^\//, '').replace(/\//g, '.'),
                message: issue.message,
            })),
        });
    }

    // Erros conhecidos do Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Violação de campo único (ex: e-mail duplicado)
        if (error.code === 'P2002') {
            return reply.status(409).send({
                status: 'error',
                code: 'CONFLICT_ERROR',
                message: 'Já existe um registro com esses dados.',
            });
        }

        // Registro não encontrado em update/delete
        if (error.code === 'P2025') {
            return reply.status(404).send({
                status: 'error',
                code: 'NOT_FOUND_ERROR',
                message: 'Registro não encontrado.',
            });
        }
    }

    // Erros do próprio Fastify e de plugins com status 4xx (JSON inválido, rate limit, etc.)
    const statusCode = (error as FastifyError).statusCode;
    if (statusCode && statusCode >= 400 && statusCode < 500) {
        return reply.status(statusCode).send({
            status: 'error',
            code: (error as FastifyError).code ?? 'REQUEST_ERROR',
            message: error.message,
        });
    }

    request.log.error({ err: error }, 'Erro não tratado');

    // Erro genérico do servidor
    return reply.status(500).send({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro interno do servidor'
    })
}
