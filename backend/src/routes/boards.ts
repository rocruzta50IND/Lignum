import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import pool from '../database/connection';

const boardsRoutes: FastifyPluginAsync = async (app) => {
  
  // LISTAR BOARDS (Com preview de membros)
  app.get('/', { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    
    // QUERY INTELIGENTE:
    // Fazemos uma subquery para buscar os membros deste board e retornar como JSON array
    const query = `
        SELECT 
            b.*, 
            bm_me.role as my_role,
            COALESCE(
                (
                    SELECT json_agg(json_build_object('name', u.name, 'id', u.id))
                    FROM board_members bm_all
                    JOIN users u ON bm_all.user_id = u.id
                    WHERE bm_all.board_id = b.id
                    LIMIT 4 -- Trazemos apenas os 4 primeiros para o preview
                ), 
                '[]'
            ) as members
        FROM boards b
        JOIN board_members bm_me ON b.id = bm_me.board_id
        WHERE bm_me.user_id = $1
        ORDER BY b.created_at DESC
    `;
    
    try {
        const result = await pool.query(query, [userId]);
        return result.rows;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Erro ao listar quadros' });
    }
  });

  // CRIAR BOARD (Mantém a lógica de transação que fizemos antes)
  app.post('/', { onRequest: [app.authenticate] }, async (request, reply) => {
    const bodySchema = z.object({
        title: z.string().min(1),
        background_color: z.string().optional().default('#1E1E1E'),
        members: z.array(z.string()).optional()
    });
    
    const body = bodySchema.parse(request.body);
    const userId = request.user.id;
    const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    const creatorName = userRes.rows[0]?.name || 'Alguém';

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); 

        const insertBoardSql = `INSERT INTO boards (title, background_color, created_by) VALUES ($1, $2, $3) RETURNING *;`;
        const boardRes = await client.query(insertBoardSql, [body.title, body.background_color, userId]);
        const newBoard = boardRes.rows[0];

        await client.query(`INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, 'owner')`, [newBoard.id, userId]);

        if (body.members && body.members.length > 0) {
            for (const memberId of body.members) {
                await client.query(
                    `INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, 'editor') ON CONFLICT DO NOTHING`, 
                    [newBoard.id, memberId]
                );
                const content = `${creatorName} te convidou para o quadro "${newBoard.title}"`;
                await client.query(
                    `INSERT INTO notifications (user_id, type, content, resource_link) VALUES ($1, 'invite', $2, $3)`,
                    [memberId, content, `/board/${newBoard.id}`]
                );
            }
        }

        await client.query('COMMIT'); 
        return reply.code(201).send(newBoard);

    } catch (error) {
        await client.query('ROLLBACK'); 
        request.log.error(error);
        return reply.code(500).send({ error: 'Erro ao criar quadro' });
    } finally {
        client.release();
    }
  });
};

export default boardsRoutes;