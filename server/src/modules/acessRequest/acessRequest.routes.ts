import { FastifyInstance } from "fastify";
import acessRequestController from "./acessRequest.controller";

export async function acessRequestRoutes(app: FastifyInstance) {
    app.post('/', acessRequestController.createAcessRequest)
    

    app.get('/root', acessRequestController.findMany)
}