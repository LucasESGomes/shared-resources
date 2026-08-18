import { CreateUserDTO } from "./users.schema";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../utils/hash";
import { errorHandler } from "../../errors/errorHandler";

export async function createUserService(data: CreateUserDTO, prisma: PrismaClient) {
    const userExists = await prisma.users.findUnique({
        where: { email: data.email },
    });

    if (userExists) {
        throw new AppError('Este e-mail já existe')
    }
}