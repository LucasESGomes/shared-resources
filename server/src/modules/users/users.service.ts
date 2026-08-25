import { CreateUserDTO } from "./users.schema";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../utils/hash";
import { AppError } from "../../errors/errorHandler";



export async function createUserService(data: CreateUserDTO, prisma: PrismaClient) {
    const userExists = await prisma.users.findUnique({
        where: { email: data.email },
    });

    if (userExists) {
        throw new AppError('Este e-mail já está em uso', 409);
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.users.create({
        data: {
            name: data.name,
            email: data.email,
            password_hash: hashedPassword,
        },
        select: {
            id: true,
            name: true,
            email: true,
            
        }
    })
}