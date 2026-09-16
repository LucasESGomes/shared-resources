import { acessRequest, UserAcessRequest } from "./acessRequest.shcema";
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

    async getAll(
        data: UserAcessRequest,
        prisma: PrismaClient
    ){
        const acessRequest = await prisma.users.findMany();
        
    }
}

export default new acessRequestService;