import Fastify, { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import corsOptions from "./config/cors";
import cors from "@fastify/cors";
import prisma from "./config/db";


import { configDotenv } from "dotenv";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

configDotenv();

const fastify = Fastify();

// Configurando CORS
fastify.register(cors, corsOptions);

export function buildApp() {
    const app = Fastify({ logger: true });

    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)

    // Configurando o limite de requisições
    app.register(rateLimit, {
        max: 100, 
        timeWindow: '1 minute',
        errorResponseBuilder: (req, context) => {
            return {
                statusCode: 429,
                error: 'Muitas requisições deste IP',
                message: `Você só pode fazer ${context.max} requisições a cada ${context.after}. Tente novamente mais tarde.`
            };
        }
    });

    // Testando a conexão com o DB
    fastify.get('./health', async (request, reply) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            return { status: 'UP', database: 'PRISMA_CONNECTED' };
    
        } catch (error) {
            reply.status(500);
            return { status: 'DOWN', error: (error as Error).message }
        } finally {
            prisma.close()
        }
    });

    return app;
}

export default fastify;    