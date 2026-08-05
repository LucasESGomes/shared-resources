import Fastify, { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import corsOptions from "./config/cors";
import cors from "@fastify/cors";
import pool from "./config/db";
import dotenv from "dotenv";

import { configDotenv } from "dotenv";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { da } from "zod/locales";

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

    // Rota de health check
    app.get('/health', async (request, reply) => {  
            await pool.query('SELECT 1');
            return reply.status(200).send({
                status: 'ok',
                database: 'conexão bem-sucedida',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

    


    return app;
}

export default fastify;    
