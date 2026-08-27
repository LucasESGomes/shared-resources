import { FastifyRequest, FastifyReply } from "fastify";
import { createUserSchema } from "./users.schema";
import { AppError } from "../../errors/appError";
import { FastifyBaseLogger } from "fastify";
import usersService from "./users.service";


export async function createUserController(
    request: FastifyRequest, 
    reply: FastifyReply, 
    logger: FastifyBaseLogger
) {
    try {
        const data = createUserSchema.parse(request.body);

        // Instânciando o prisma para fastify
        const prisma = request.server.prisma;

        const newUser = usersService.create(data, prisma);

        return reply.status(201).send({
            message: 'Usuário cadastrado com sucesso, esperando aprovação do administrador',
            user: newUser
            logger.info('Success user registered')
        })

    } catch (error) {
        
    }
}