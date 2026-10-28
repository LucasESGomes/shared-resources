import { FastifyRequest, FastifyReply } from "fastify";
import { acessRequest } from "./acessRequest.schema";
import acessRequestService from "./acessRequest.service";
import { PrismaClient } from "@prisma/client";

class acessRequestController {
    async createAcessRequest(
        request: FastifyRequest,
        reply: FastifyReply
    ) {
        const data = acessRequest.parse(request.body);

        const prisma = request.server.prisma;

        const newAcessRequest = await acessRequestService.create(data, prisma);

        return reply.status(201).send({
            message: 'Usuário cadastrado com sucesso, esperando aprovação do administrador',
            user: newAcessRequest
        })
    }

    async findMany(request: FastifyRequest, reply: FastifyReply){
        const prisma = request.server.prisma;

        const acessRequests = await acessRequestService.findMany(prisma);

        return reply.status(200).send({
            message: "Dados carregados com sucesso!",
            acessRequests: acessRequests
        })
    }



}

export default new acessRequestController();