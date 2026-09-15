import { z } from "zod";

export const acessRequest = z.object({
    name: z.string()
        .max(200, "O nome excede o limite de caracteres")
        .min(1, "O nome deve conter no mínimo 3 caracteres"),

    email: z.email("Formato de e-mail inválido.")
        .max(255, "O e-mail excede o limite de caracteres.")
        .min(1, "O e-mail não pode estar vazio"),

    password_hash: z.string()
        .min(6, "A senha deve conter no mínimo 6 caracteres"),

    role: z.enum(["user", "admin"],
        { message: "O cargo 'usuário' ou 'administrador é obrigatório'." }),

    photo_url: z.url({ message: "O formato da imagem é inválido" })
        .optional()
        .or(z.literal("")),

    status: z.enum(["pending", "approved", "repproved"],
        { message: "O status deve ser 'pending', 'approved' ou 'repproved'." }),
});

export type UserAcessRequest = z.infer<typeof acessRequest>