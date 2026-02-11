import { FastifyPluginAsync } from 'fastify';
import pool from '../database/connection';

const usersRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    try {
      // Retorna ID, Nome e Email de todos (exceto o próprio usuário logado)
      const result = await pool.query(
        'SELECT id, name, email FROM users WHERE id != $1 ORDER BY name ASC',
        [req.user.id]
      );
      return result.rows;
    } catch (err) {
      return reply.code(500).send(err);
    }
  });
};

export default usersRoutes;