import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import pool from '../database/connection';

const usersRoutes: FastifyPluginAsync = async (app) => {
  
  // 1. LISTAR USUÁRIOS (Para o select de membros)
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    try {
      const result = await pool.query(
        'SELECT id, name, email, avatar FROM users WHERE id != $1 ORDER BY name ASC',
        [req.user.id]
      );
      return result.rows;
    } catch (err) {
      return reply.code(500).send(err);
    }
  });

  // 2. ATUALIZAR PERFIL (Nome e Avatar)
  app.patch('/me', { onRequest: [app.authenticate] }, async (req, reply) => {
    const bodySchema = z.object({
        name: z.string().min(2),
        avatar: z.string().optional() // Base64 string
    });
    
    const { name, avatar } = bodySchema.parse(req.body);
    const userId = req.user.id;

    try {
        // Atualiza apenas nome e avatar
        await pool.query(
            'UPDATE users SET name = $1, avatar = $2 WHERE id = $3',
            [name, avatar, userId]
        );
        
        // Retorna os dados novos para atualizar o frontend na hora
        return { success: true, user: { id: userId, name, avatar } };
    } catch (err) {
        return reply.code(500).send(err);
    }
  });

  // 3. ALTERAR SENHA
  app.patch('/me/password', { onRequest: [app.authenticate] }, async (req, reply) => {
      const bodySchema = z.object({
          currentPassword: z.string(),
          newPassword: z.string().min(6)
      });
      
      const { currentPassword, newPassword } = bodySchema.parse(req.body);
      const userId = req.user.id;

      // Busca senha atual (hash)
      const userRes = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
      const user = userRes.rows[0];

      // Verifica se a senha atual bate
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
          return reply.code(400).send({ error: "Senha atual incorreta." });
      }

      // Criptografa nova senha e salva
      const newHash = await bcrypt.hash(newPassword, 8);
      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [newHash, userId]);

      return { success: true };
  });
};

export default usersRoutes;