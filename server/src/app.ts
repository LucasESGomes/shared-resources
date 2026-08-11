import { FastifyRequest, FastifyReply } from "fastify";
import Fastify, { FastifyInstance } from "fastify";
import RateLimit from "@fastify/rate-limit";
import corsOptions from "./config/cors";

import cors from "@fastify/cors";
import prisma from "./config/db";

import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { configDotenv } from "dotenv";


configDotenv();

const fastify = Fastify();

// Configurando CORS
fastify.register(cors, corsOptions);

export function buildApp() {
    const app = Fastify({ logger: true });

    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)

    // Configurando o limite de requisições
    app.register(RateLimit, {
        max: 100, 
        timeWindow: '1 minute',
        errorResponseBuilder: (req: FastifyRequest, context) => {
            return {
                statusCode: 429,
                error: 'Muitas requisições deste IP',
                message: `Você só pode fazer ${context.max} requisições a cada ${context.after}. Tente novamente mais tarde.`
            };
        }
    });

    // Testando a conexão com o DB via Prisma
    fastify.get('./health', async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            return reply.status(200).send({ status: 'UP', database: 'conectado', timeStamp: new Date().toISOString() });
    
        } catch (error) {
            app.log.error({ error }, 'Erro no banco de dados:');
            return reply.status(500).send({ status: 'DOWN', database: 'desconectado', error: (error as Error).message }); 
        }
    });

    return app;
}

// registrar as rotas disponiveis

export default fastify;    