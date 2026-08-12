import { FastifyReply, FastifyRequest } from "fastify";
import { Param } from "@prisma/client/runtime/client";

export default class ApiResponse {
    success: boolean;
    status: number;
    message: String;
    data: any;

    constructor(success: boolean, status: number, message: String, data: null) {
        this.success = success;
        this.status = status;
        this.message = message;
        if (data != null) this.data = data;
    }

    
}