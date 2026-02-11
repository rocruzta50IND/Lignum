import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { query } from '../database/connection';
import { getIO } from '../lib/socket';

// Validação e Tipagem
const paramsSchema = z.object({
  boardId: z.string().uuid(),
});

const sendMessageBodySchema = z.object({
  content: z.string().min(1, "A mensagem não pode estar vazia"),
});

type ChatParams = z.infer<typeof paramsSchema>;
type SendMessageBody = z.infer<typeof sendMessageBodySchema>;

const chatRoutes: FastifyPluginAsync = async (app) => {
  
  // GET /chat/:boardId
  app.get<{ Params: ChatParams }>('/:boardId', async (request, reply) => {
    const params = paramsSchema.parse(request.params);

    try {
      const sql = `
        SELECT 
            sub.id, 
            sub.content, 
            sub.created_at as "createdAt",
            sub.is_pinned as "isPinned",
            json_build_object(
                'id', sub.user_id,
                'name', sub.user_name,
                'role', sub.user_role
            ) as user
        FROM (
            SELECT 
                m.id, 
                m.content, 
                m.created_at, 
                m.is_pinned,
                m.user_id,
                u.name as user_name,
                u.role as user_role
            FROM chat_messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.board_id = $1
            ORDER BY m.created_at DESC
            LIMIT 50
        ) sub
        ORDER BY sub.created_at ASC;
      `;

      const result = await query(sql, [params.boardId]);
      return result.rows;

    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Erro ao buscar histórico do chat.' });
    }
  });

  // POST /chat/:boardId
  app.post<{ Params: ChatParams; Body: SendMessageBody }>('/:boardId', async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const body = sendMessageBodySchema.parse(request.body);

    try {
      // 1. Mock Auth
      const userRes = await query('SELECT id, name, role FROM users LIMIT 1');
      if (userRes.rowCount === 0) throw new Error('Nenhum usuário encontrado.');
      const author = userRes.rows[0];

      // 2. Persistência
      const insertSql = `
        INSERT INTO chat_messages (board_id, user_id, content)
        VALUES ($1, $2, $3)
        RETURNING id, content, created_at as "createdAt", is_pinned as "isPinned";
      `;

      const insertResult = await query(insertSql, [params.boardId, author.id, body.content]);
      const newMessage = insertResult.rows[0];

      // 3. Montagem do Payload
      const fullMessagePayload = {
        ...newMessage,
        user: {
          id: author.id,
          name: author.name,
          role: author.role
        },
        boardId: params.boardId
      };

      // 4. Broadcast via Socket
      const io = getIO();
      io.to(params.boardId).emit('chat_message', fullMessagePayload);
      
      request.log.info(`💬 Chat: Mensagem de ${author.name} na sala ${params.boardId}`);

      return reply.code(201).send(fullMessagePayload);

    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Erro ao enviar mensagem.' });
    }
  });
};

export default chatRoutes;