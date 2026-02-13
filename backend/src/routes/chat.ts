import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import pool from '../database/connection';
import { getIO } from '../lib/socket';

const chatRoutes: FastifyPluginAsync = async (app) => {
  
  // 1. LISTAR MENSAGENS
  app.get('/:boardId', { onRequest: [app.authenticate] }, async (req, reply) => {
    const paramsSchema = z.object({ boardId: z.string().uuid() });
    const { boardId } = paramsSchema.parse(req.params);
    
    try {
        const result = await pool.query(
        `SELECT m.id, m.content, m.created_at, m.user_id, u.name as user_name, u.avatar as user_avatar
            FROM messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.board_id = $1
            ORDER BY m.created_at ASC`,
        [boardId]
        );
        return result.rows;
    } catch (error) {
        console.error("Erro chat:", error);
        return reply.code(500).send({ error: 'Erro ao carregar chat' });
    }
  });

  // 2. ENVIAR MENSAGEM + NOTIFICAR
  app.post('/:boardId', { onRequest: [app.authenticate] }, async (req, reply) => {
    const paramsSchema = z.object({ boardId: z.string().uuid() });
    const bodySchema = z.object({
        content: z.string().min(1),
        mentionedUserIds: z.array(z.string()).optional() 
    });

    const { boardId } = paramsSchema.parse(req.params);
    const body = bodySchema.parse(req.body);
    const userId = req.user.id;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Salvar Mensagem
        const res = await client.query(
            `INSERT INTO messages (board_id, user_id, content) VALUES ($1, $2, $3) RETURNING id, content, created_at, user_id`,
            [boardId, userId, body.content]
        );
        const savedMsg = res.rows[0];

        // Buscar dados do autor
        const userRes = await client.query('SELECT name, avatar FROM users WHERE id = $1', [userId]);
        const user = userRes.rows[0];

        // Processar Notificações de Menção
        if (body.mentionedUserIds && body.mentionedUserIds.length > 0) {
            for (const mentionedId of body.mentionedUserIds) {
                if (mentionedId !== userId) {
                    // 1. Salva no Banco
                    const notifContent = `${user.name} te mencionou: "${body.content.substring(0, 20)}..."`;
                    const notifLink = `/board/${boardId}`;
                    
                    const notifRes = await client.query(
                        `INSERT INTO notifications (user_id, type, content, resource_link) 
                         VALUES ($1, 'mention', $2, $3) RETURNING *`,
                        [mentionedId, notifContent, notifLink]
                    );
                    
                    // 2. EMITE O SOCKET EM TEMPO REAL (A Correção)
                    const newNotification = notifRes.rows[0];
                    getIO().to(mentionedId).emit('new_notification', newNotification);
                }
            }
        }

        await client.query('COMMIT');

        // Socket do Chat (Geral)
        const msgPayload = {
            id: savedMsg.id,
            content: savedMsg.content,
            created_at: savedMsg.created_at,
            user_id: savedMsg.user_id,
            user_name: user.name,
            user_avatar: user.avatar 
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