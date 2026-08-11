import { FastifyCorsOptions } from '@fastify/cors';

const environment = process.env.NODE_ENV || "development";

//Quando o código estiver hospedado colocar aqui as URL permitidas
const productionOrigins = [
    
]

const corsOptions = {
    //Alterar origins e credetials quando eu hospedar o código
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false
}


export default corsOptions;