import { FastifyRequest, FastifyReply } from "fastify";
import { createUserSchema } from "./users.schema";
import { AppError } from "../../errors/appError";
import usersService from "./users.service";


class UserController {

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
