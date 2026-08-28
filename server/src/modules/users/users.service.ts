import { CreateUserDTO } from "./users.schema";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../utils/hash";
import { FastifyBaseLogger } from "fastify";
import { ConflictError } from "../../errors/appError";


class UsersService {

    async create(
        data: CreateUserDTO,
        prisma: PrismaClient
    ) {
        const userExists = await prisma.users.findUnique({
            where: { email: data.email },
        });

        if (userExists) {
            throw new ConflictError('Este e-mail já está em uso', 409)
        }

        // Configurando o hash de senha
        const hashedPassword = await hashPassword(data.password);

        return await prisma.users.create({
            data: {
                name: data.email,
                email: data.email,
                password_hash: hashedPassword,
            },
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                role: true
            }
        });
    }

    // Criando um user root caso não existe registros
    async createRootUserIfNotExists(
        prisma: PrismaClient,
        logger: FastifyBaseLogger
    ) {
        const rootEmail = process.env.ROOT_USER_EMAIL
        const rootPassword = process.env.ROOT_USER_PASSWORD

        if (!rootEmail || !rootPassword) {
            logger.warn('ROOT_USER_EMAIL e ROOT_USER_PASSWORD não estão definidos nas variáveis de ambiente.')
            return;
        }

        try {
            const rootExists = await prisma.users.findUnique({
                where: { email: rootEmail },
                select: { id: true}
            })
            if (rootExists) {
                logger.info('O usuário já está cadastrado.')
                return;
            }

            const hashedPassword = await hashPassword(rootPassword)

            return await prisma.users.create({
                data: {
                    name: "Root Admin",
                    email: rootEmail,
                    password_hash: hashedPassword,
                    role: "admin"
                }
            });
            logger.info("Usuário root criado com sucesso")

        } catch (error: any) {
            logger.error(`Error ao tentar criar user root ${error.message}`)
        }
    }

    // Adicionar aqui o restante dos métodos

}

export default new UsersService();