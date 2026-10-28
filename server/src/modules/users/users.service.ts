import { CreateUserDTO, UpdateUserDTO } from "./users.schema";
import { PrismaClient, PrismaPromise } from "@prisma/client";
import { hashPassword } from "../../utils/hash";
import { FastifyBaseLogger, FastifyRequest } from "fastify";
import { ConflictError, NotFoundError } from "../../errors/appError";
import { paginateWithCursor } from "../../utils/pagination.util";


class UsersService {

    // Método de create service
    async create(data: CreateUserDTO, prisma: PrismaClient) {
        const userExists = await prisma.users.findUnique({
            where: { email: data.email },
        });

        if (userExists) {
            throw new ConflictError('Este e-mail já está em uso')
        }

        // Configurando o hash de senha
        const hashedPassword = await hashPassword(data.password_hash);

        return await prisma.users.create({
            data: {
                name: data.name,
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
    async createRootUserIfNotExists(prisma: PrismaClient, logger: FastifyBaseLogger) {
        const rootEmail = process.env.ROOT_USER_EMAIL
        const rootPassword = process.env.ROOT_USER_PASSWORD

        if (!rootEmail || !rootPassword) {
            logger.warn('ROOT_USER_EMAIL e ROOT_USER_PASSWORD não estão definidos nas variáveis de ambiente.')
            return;
        }

        const rootExists = await prisma.users.findUnique({
            where: { email: rootEmail },
            select: { id: true}
        })
        if (rootExists) {
            logger.info('O usuário já está cadastrado.')
            return;
        }

        const hashedPassword = await hashPassword(rootPassword)

        const rootUser = await prisma.users.create({
            data: {
                name: "Root Admin",
                email: rootEmail,
                password_hash: hashedPassword,
                role: "admin",
                status: "approved"
            }
        });

        logger.info('Usuário criado com sucesso.')
        return rootUser;
    }

    // Get de todos os usuário com paginação
    async getAllUsers(limit: number, cursor: string | undefined, prisma: PrismaClient) {
        const queryArgs = {
            select: { id:true, name: true, email: true, isActive: true, role: true, status: true, createdAt: true },
            orderBy: { created: 'desc' }
        };

        return await paginateWithCursor(prisma.users, queryArgs, limit, cursor);
    }

    // Busca de usuário específica por id
    async getById(id: string, prisma: PrismaClient) {
        const user = await prisma.users.findUnique({
            where: { id },
            select: { id: true, name: true, email: true, isActive: true, role: true, status: true, createdAt: true }
        });

        if (!user) {
            throw new NotFoundError('Usuário não encontrado');
        }

        return user;
    }

    // Método para atualizar o usuário e verificar se e-mail novo já pertence a alguem registrado
    async update(id: string, data: UpdateUserDTO, prisma: PrismaClient ){
        await this.getById(id, prisma); // Validando se existe

        if(data.email) {
            const emailInUse = await prisma.users.findUnique({where: { email: data.email }});
            if (emailInUse && emailInUse.id != id){
                throw new ConflictError('Este e-mail já está sem uso por outro usuário.')
            }
        }

        const updateData: any = { ...data };
        if (data.password_hash) {
            updateData.password_hash = await hashPassword(data.password_hash);
            delete updateData.password_hash;
        };

        return await prisma.users.update({
            where: { id },
            data: updateData,
            select: { id: true, name: true, email: true, isActive: true, role: true, status: true, createdAt: true }
        });
    }


    async delete(id: string, prisma: PrismaClient) {
        await this.getById(id, prisma);

        await prisma.users.delete({
            where: { id }
        });

        return {message: 'Usuário removido com sucesso.'}
    }

    async approvedUser(id: string, prisma: PrismaClient) {
        
    }

}

export default new UsersService();