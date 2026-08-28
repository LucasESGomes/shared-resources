import { FastifyInstance } from "fastify";
import usersController from "./users.controller";

export async function usersRoutes(app: FastifyInstance) {
    // Rota inicial para criação de usuário
    app.post('/', usersController.createUser)

    
}