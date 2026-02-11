import { FastifyPluginAsync } from 'fastify';
import pool from '../database/connection';

const notificationsRoutes: FastifyPluginAsync = async (app) => {
  // Listar notificações do usuário
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.id;
    try {
      const result = await pool.query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
        [userId]
      );
      return result.rows;
    } catch (err) {
      return reply.code(500).send(err);
    }
  });

  // Marcar como lida
  app.patch('/:id/read', { onRequest: [app.authenticate] }, async (req: any, reply) => {
    const { id } = req.params;
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    return { success: true };
  });
};

export default notificationsRoutes;