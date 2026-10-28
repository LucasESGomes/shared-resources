import { FastifyRequest, FastifyReply } from "fastify";
import { createUserSchema } from "./users.schema";
import usersService from "./users.service";


class UserController {

    async createUserRootIfNotExists(request: FastifyRequest, reply: FastifyReply) {
        await usersService.createRootUserIfNotExists(
            request.server.prisma,
            request.log,
        );

        return reply.status(200).send({
            message: 'Usuário root verificado com sucesso',
        });
    }


    async createUser(
        request: FastifyRequest,
        reply: FastifyReply,
    ) {
        const data = createUserSchema.parse(request.body);

        // Instânciando o prisma para fastify
        const prisma = request.server.prisma;

        // Chamando a regra de negócio a ser aplicada
        const newUser = await usersService.create(data, prisma);

        return reply.status(201).send({
            message: 'Usuário cadastrado com sucesso, esperando aprovação do administrador',
            user: newUser
        })
    }

    // Adicionar o restante
}

export default new UserController();
