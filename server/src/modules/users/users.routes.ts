import { FastifyInstance } from "fastify";
import usersController from "./users.controller";

export async function usersRoutes(app: FastifyInstance) {
    // Rota que deve ser autenticada (não é a tela inicial adiocnar a autenticação JWT)
    app.post('/', usersController.createUser)
    app.post('/root', usersController.createUserRootIfNotExists)
    
}