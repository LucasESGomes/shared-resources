import dotenv from "dotenv";
import fastify from "./src/app";

dotenv.config();

const app = fastify;

const PORT = Number(process.env.PORT || 5000);

// Chamando servidor na porta 5000
const start = async () => {
    try {
        await app.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`Servidor rodando na porta ${PORT}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
