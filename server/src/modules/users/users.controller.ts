import { FastifyRequest, FastifyReply } from "fastify";
import { createUserSchema } from "./users.schema";
import { AppError } from "../../errors/appError";
import usersService from "./users.service";


class UserController {

    async createUserRootIfNotExists(request: FastifyRequest, reply: FastifyReply) {
        try {
            await usersService.createRootUserIfNotExists(
                request.server.prisma,
                request.log,
            );

            return reply.status(200).send({
                message: 'Usuário root verificado com sucesso',
            });
        } catch (error) {
            if (error instanceof AppError) {
                return reply.status(error.statusCode).send({ error: error.message });
            }

            throw error;
        }

    }


    async createUser(
        request: FastifyRequest,
        reply: FastifyReply,
    ) {
        try {
            const data = createUserSchema.parse(request.body);

            // Instânciando o prisma para fastify
            const prisma = request.server.prisma;

            // Chamando a regra de negócio a ser aplicada
            const newUser = usersService.create(data, prisma);

            return reply.status(201).send({
                message: 'Usuário cadastrado com sucesso, esperando aprovação do administrador',
                user: newUser
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

    // Adicionar o restante
}

export default new UserController();
