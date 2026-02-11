import 'dotenv/config';import { z } from 'zod';const envSchema = z.object({

NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

PORT: z.coerce.number().default(3000),

// URL de conexão padrão do PostgreSQL

DATABASE_URL: z.string().url({ message: "DATABASE_URL deve ser uma URL de conexão válida do PostgreSQL" }),

// Segredo para assinatura de JWT (RNF03)

JWT_SECRET: z.string().min(32, { message: "JWT_SECRET deve ter no mínimo 32 caracteres para segurança" }),

// Define o nível de log do Fastify

LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info')

});const _env = envSchema.safeParse(process.env);if (_env.success === false) {

console.error('❌ Variáveis de ambiente inválidas:', _env.error.format());

throw new Error('Variáveis de ambiente inválidas.');

}export const env = _env.data;