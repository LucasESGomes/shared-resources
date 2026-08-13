import { z } from "zod";

// Schema de validação de usuário
export const createUserSchema = z.object({
    name: z.string()
        .min(3, "O nome deve conter no mínimo 3 caracteres.")
        .max(100, "O nome excede o limite de caracteres."),

    email: z.email("Formato de e-mail inválido.")
        .max(255, "O e-mail excede o limite de caracteres."),

    password: z.string()
        .min(6, "A senha deve conter no mínimo 6 caracteres."),

    role: z.enum(["user", "admin"], 
        { message: "O cargo é 'usuário' ou 'administrador é obrigatório'." }),

    photo_url: z.url({ message: "O formato da imagem é inválido" })
        .optional()
        .or(z.literal("")),
});

export type CreateUserDTO = z.infer<typeof createUserSchema>