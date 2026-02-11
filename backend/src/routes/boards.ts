import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { runTransaction } from '../database/connection';

const boardsRoutes: FastifyPluginAsync = async (app) => {
  // LISTAR BOARDS
  app.get('/', { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    // Retorna todos os boards que o usuário tem acesso (simplificado para MVP)
    const result = await runTransaction(async (client) => {
        return client.query('SELECT * FROM boards ORDER BY created_at DESC');
    }, userId);
    return result.rows;
  });

  // CRIAR BOARD
  app.post('/', { onRequest: [app.authenticate] }, async (request, reply) => {
    const bodySchema = z.object({
        title: z.string().min(1),
        background_color: z.string().optional().default('#1E1E1E')
    });
    const body = bodySchema.parse(request.body);
    const userId = request.user.id;

    const result = await runTransaction(async (client) => {
        const insert = `
            INSERT INTO boards (title, background_color, created_by)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        return client.query(insert, [body.title, body.background_color, userId]);
    }, userId);

    return reply.code(201).send(result.rows[0]);
  });
};

export default boardsRoutes;