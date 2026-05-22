import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import Fastify, { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import corsOptions from "./config/cors";
import cors from "@fastify/cors";
import pool from "./config/db";
import dotenv from "dotenv";

import { configDotenv } from "dotenv";

configDotenv();

const fastify = Fastify();

// Configurando CORS
fastify.register(cors, corsOptions);

const limiter = rateLimit({
    max: 100, 
    timeWindow: '10 minute',
    message : 'Muitas requisições, tente novamente mais tarde!',
});

fastify.register(limiter);

const buildApp() = {
    const app = Fastify({ logger: true });

    // Usando zod para fazer a validação de forma automática 
    app.setSerializerCompiler(serializerCompiler);
    app.setValidatorCompiler(validatorCompiler);

    // Rotas → Schema + zod
    
    return app();
}

export default fastify;
