import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import pool from '../database/connection';
import { getIO } from '../lib/socket';

const chatRoutes: FastifyPluginAsync = async (app) => {
  
  // LISTAR MENSAGENS (Histórico)
  app.get('/:boardId', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { boardId } = req.params as any;
    
    // Busca mensagens com dados do usuário (nome e avatar)
    const result = await pool.query(
      `SELECT m.id, m.content, m.created_at, m.user_id, u.name as user_name, u.avatar as user_avatar
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.board_id = $1
       ORDER BY m.created_at ASC`,
      [boardId]
    );
    
    return result.rows;
  });

  // ENVIAR MENSAGEM
  app.post('/:boardId', { onRequest: [app.authenticate] }, async (req: any, reply) => {
    const { boardId } = req.params;
    const userId = req.user.id;
    
    const bodySchema = z.object({
        content: z.string().min(1),
        mentionedUserIds: z.array(z.string()).optional() 
    });
    const body = bodySchema.parse(req.body);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Salvar Mensagem
        const res = await client.query(
            `INSERT INTO messages (board_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
            [boardId, userId, body.content]
        );
        const savedMsg = res.rows[0];

        // 2. CORREÇÃO: Buscar Nome E AVATAR do autor para enviar no socket
        const userRes = await client.query('SELECT name, avatar FROM users WHERE id = $1', [userId]);
        const user = userRes.rows[0];

        // 3. Processar Notificações de Menção
        if (body.mentionedUserIds && body.mentionedUserIds.length > 0) {
            for (const mentionedId of body.mentionedUserIds) {
                if (mentionedId !== userId) {
                    await client.query(
                        `INSERT INTO notifications (user_id, type, content, resource_link) 
                         VALUES ($1, 'mention', $2, $3)`,
                        [
                            mentionedId, 
                            `${user.name} te mencionou no chat: "${body.content.substring(0, 30)}..."`,
                            `/board/${boardId}`
                        ]
                    );
                }
            }
        }

        await client.query('COMMIT');

        // 4. Emitir evento via Socket com TODOS os dados visuais
        const msgPayload = {
            ...savedMsg,
            user_name: user.name,
            user_avatar: user.avatar // <--- IMPORTANTE: Enviando a foto em tempo real
        };
        
        getIO().to(boardId).emit('receive_message', msgPayload);

        return reply.status(201).send(msgPayload);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        return reply.code(500).send(err);
    } finally {
        client.release();
    }
  });
};

export default chatRoutes;