import { FastifyInstance } from "fastify";
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client';

import fp from 'fastify-plugin';


declare module 'fastify' {
    interface FastifyInstance{
        prisma: PrismaClient;
    }
};

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

async function prismaPlugin(fastify: FastifyInstance) {
    const Prisma = globalForPrisma.prisma || new PrismaClient({
        log: ['query', 'error', 'warn'],
        adapter: new PrismaPg({connectionString: process.env.DATABASE_URL})
    });

    if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = Prisma;
    }

    await Prisma.$connect();

    fastify.decorate('prisma', Prisma); 

    fastify.addHook('onClose', async (instance) => {
        await instance.prisma.$disconnect();
    })
}

export default fp(prismaPlugin);