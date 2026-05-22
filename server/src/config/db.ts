import { Pool, PoolConfig } from "pg";
import dotenv, { configDotenv } from "dotenv";

configDotenv();

// Connfigurando a conexão do postgre com o server
const poolConfig: PoolConfig = {
    host: process.env.DB_HOST || 'database',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    max: 20,              
    idleTimeoutMillis: 30000, 
    connectionTimeoutMillis: 2000, 
};

const pool = new Pool(poolConfig);

// log de sucesso
pool.on('connect', () => {
    console.log("Conexão POOl estabelecida com PostgreSQL"); 
});

// Log de erro conexão não estabelecida
pool.on('error', (err) => {
    console.error('❌ Erro inesperado no cliente do Postgres', err);
    process.exit(-1);
});

export default pool;