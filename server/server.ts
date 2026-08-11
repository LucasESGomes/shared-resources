import { z } from "zod";
import dotenv from "dotenv";
import fastify from "./src/app";

dotenv.config();

// Garantindo que os dados venham de forma correta
const envSchema = z.object({
    PORT: z.string().transform(Number).default(5000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url(),
});

const env = envSchema.parse(process.env);
const app = fastify;

const start = async () => {
    try {
        await app.listen({ port: env.PORT, host: '0.0.0.0' });
        console.log(`Servidor rodando na porta ${env.PORT}`);
    } catch (err) {
        app.log.error({err}, 'Erro ao iniciar o servidor');
        process.exit(1);
    }
};

start();