import { FastifyRequest, FastifyReply } from "fastify";
import { acessRequest } from "./acessRequest.schema";
import acessRequestService from "./acessRequest.service";
import { AppError } from "../../errors/appError";
import { PrismaClient } from "@prisma/client";

class acessRequestController {
    async createAcessRequest(
        request: FastifyRequest,
        reply: FastifyReply
    ) {
        try {
            const data = acessRequest.parse(request.body);

            const prisma = request.server.prisma;

            const newAcessRequest = acessRequestService.create(data, prisma);

            return reply.status(201).send({
                message: 'Usuário cadastrado com sucesso, esperando aprovação do administrador',
                user: newAcessRequest
            })
        } catch (error) {
            if (error instanceof AppError) {
                return reply.status(error.statusCode).send({ error: error.message });
            } 
            if (error instanceof Error && error.name === 'ZodError') {
                return reply.status(400).send({ error: JSON.parse(error.message) });
            }  
            throw error;
        }

    }

    

}

export default new acessRequestController();