import { FastifyRequest, FastifyReply } from "fastify";
import Fastify from "fastify";
import RateLimit from "@fastify/rate-limit";
import corsOptions from "./config/cors";

import prismaPlugin from "./plugins/prisma.plugin";
import cors from "@fastify/cors";

import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { errorHandler } from "./errors/errorHandler";
import { configDotenv } from "dotenv";


configDotenv();

export default function buildApp() {
    const app = Fastify({ logger: true });

    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)

    // Configurando CORS
    app.register(cors, corsOptions);

    // Tratador de erros global
    app.setErrorHandler(errorHandler)

    // Confirando plugin Prisma Global
    app.register(prismaPlugin);

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
    app.get('/health', async (request, reply) => {
        try {
            await app.prisma.$queryRaw`SELECT 1`;
            return reply.status(200).send({ status: 'UP', database: 'conectado', timeStamp: new Date().toISOString() });
    
        } catch (error) {
            app.log.error({ error }, 'Erro no banco de dados:');
            return reply.status(500).send({ status: 'DOWN', database: 'desconectado', error: (error as Error).message }); 
        }
    });

    return app;
}

// registrar as rotas disponiveis