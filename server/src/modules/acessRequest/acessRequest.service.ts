import { UserAcessRequest, UpdateAcessRequest } from "./acessRequest.schema";
import { ConflictError } from "../../errors/appError";
import { UserStatus } from "@prisma/client";
import { hashPassword } from "../../utils/hash";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../../errors/appError";
import { FastifyBaseLogger } from "fastify";


class acessRequestService {
    async create(
        data: UserAcessRequest,
        prisma: PrismaClient
    ) {
        const userExists = await prisma.users.findUnique({
            where: { email: data.email }
        });

        if (userExists) {
            throw new ConflictError('Este e-mail já está em uso', 409)
        }

        // Configurando o hash de senha
        const hashedPassword = await hashPassword(data.password_hash);
                
        return await prisma.users.create({
            data: {
                name: data.name,
                email: data.email,
                password_hash: hashedPassword,
                status: data.status = "pending",
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

    // Busca todas as requisições de acesso
    async getAll(data: UserAcessRequest, prisma: PrismaClient) { 
        const acessRequest = await prisma.users.findMany();
        return acessRequest
    }

    async findById(id: string, prisma: PrismaClient) {
        const user = await prisma.users.findUnique({
            where: { id },
            select: { id: true, name: true, email: true, isActive: true, role: true, created_at: true }
        });

        if (!user) {
            throw new AppError('Usuário não encontrado', 404);
        }

        return user;
    }

    // Método para update da requisição do usuário
    async update(id: string, data: UserAcessRequest, prisma: PrismaClient) {
        await this.findById(id, prisma);

        return await prisma.users.update({
            where: { id },
            data: { data, status: data.status = "pending"},
            select: { id: true, name: true, email: true, isActive: true }
        })
    }

    // Atualiza o apenas status dos novos usuários
    async updateAcessRequest(id: string, data: UpdateAcessRequest, prisma: PrismaClient ) {
        await this.findById(id, prisma);

        return await prisma.users.update({
            where: { id },
            data: { status: data.status },
            select: { id: true, name: true, email: true, isActive: true }
        });
    }

    async delete(id: string, prisma: PrismaClient) {
        await this.findById(id, prisma);

        await prisma.users.delete({
            where: { id }
        })

        return { message: "Usuário removido com sucesso!" }
    }

}

export default new acessRequestService;