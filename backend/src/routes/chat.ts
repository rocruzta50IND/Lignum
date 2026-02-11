import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import pool from '../database/connection';
import { getIO } from '../lib/socket';

const chatRoutes: FastifyPluginAsync = async (app) => {
  
  // LISTAR MENSAGENS (Histórico)
  app.get('/:boardId', { onRequest: [app.authenticate] }, async (req: any, reply) => {
    const { boardId } = req.params;
    try {
      // Busca as últimas 50 mensagens com dados do usuário
      const result = await pool.query(`
        SELECT m.*, u.name as user_name, u.email as user_email
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.board_id = $1
        ORDER BY m.created_at ASC
        LIMIT 50
      `, [boardId]);
      return result.rows;
    } catch (err) {
      return reply.code(500).send(err);
    }
  });

  // ENVIAR MENSAGEM
  app.post('/:boardId', { onRequest: [app.authenticate] }, async (req: any, reply) => {
    const { boardId } = req.params;
    const userId = req.user.id;
    
    // Schema: Recebe o conteúdo e uma lista de IDs mencionados (opcional)
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

        // 2. Buscar dados do autor para enviar no socket
        const userRes = await client.query('SELECT name FROM users WHERE id = $1', [userId]);
        const userName = userRes.rows[0].name;

        // 3. Processar Notificações de Menção
        if (body.mentionedUserIds && body.mentionedUserIds.length > 0) {
            for (const mentionedId of body.mentionedUserIds) {
                // Não notifica se o usuário marcou a si mesmo
                if (mentionedId !== userId) {
                    await client.query(
                        `INSERT INTO notifications (user_id, type, content, resource_link) 
                         VALUES ($1, 'mention', $2, $3)`,
                        [
                            mentionedId, 
                            `${userName} te mencionou no chat: "${body.content.substring(0, 30)}..."`,
                            `/board/${boardId}` // Link para voltar ao board
                        ]
                    );
                }
            }
        }

        await client.query('COMMIT');

        // 4. Emitir evento via Socket para todos na sala
        const msgPayload = {
            ...savedMsg,
            user_name: userName
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