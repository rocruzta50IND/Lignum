import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import pool from '../database/connection';

// --- SCHEMAS ---
const createBoardBodySchema = z.object({
  title: z.string().min(1),
  background_color: z.string().optional().default('#1E1E1E'),
  members: z.array(z.string()).optional()
});

const addMemberParamsSchema = z.object({ id: z.string().uuid() });
const addMemberBodySchema = z.object({ userId: z.string().uuid() });

const removeMemberParamsSchema = z.object({ 
  id: z.string().uuid(),
  userId: z.string().uuid() 
});

const deleteBoardParamsSchema = z.object({ id: z.string().uuid() });

const boardsRoutes: FastifyPluginAsync = async (app) => {
  
  // 1. LISTAR BOARDS
  app.get('/', { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    
    // Query otimizada trazendo avatar dos membros
    const query = `
        SELECT 
            b.id, b.title, b.background_color, b.created_by, b.created_at,
            bm_me.role as my_role,
            COALESCE(
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', u.id, 
                            'name', u.name,
                            'avatar', u.avatar 
                        )
                    )
                    FROM board_members bm_all
                    JOIN users u ON bm_all.user_id = u.id
                    WHERE bm_all.board_id = b.id
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

  // 2. CRIAR BOARD (Corrigido: Cria colunas padrão)
  app.post('/', { onRequest: [app.authenticate] }, async (request, reply) => {
    const body = createBoardBodySchema.parse(request.body);
    const userId = request.user.id;

    // Pega nome do criador para notificação
    const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    const creatorName = userRes.rows[0]?.name || 'Alguém';

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); 

        // 1. Cria o Board
        const insertBoardSql = `INSERT INTO boards (title, background_color, created_by) VALUES ($1, $2, $3) RETURNING *;`;
        const boardRes = await client.query(insertBoardSql, [body.title, body.background_color, userId]);
        const newBoard = boardRes.rows[0];

        // 2. Adiciona o CRIADOR como 'owner'
        await client.query(`INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, 'owner')`, [newBoard.id, userId]);

        // 3. Adiciona convidados (se houver) e notifica
        if (body.members && body.members.length > 0) {
            for (const memberId of body.members) {
                await client.query(
                    `INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, 'editor') ON CONFLICT DO NOTHING`, 
                    [newBoard.id, memberId]
                );
                
                // Cria notificação
                const content = `${creatorName} te convidou para o quadro "${newBoard.title}"`;
                await client.query(
                    `INSERT INTO notifications (user_id, type, content, resource_link) VALUES ($1, 'invite', $2, $3)`,
                    [memberId, content, `/board/${newBoard.id}`]
                );
            }
        }

        // 4. CRIA COLUNAS PADRÃO (Essencial para o Kanban funcionar!)
        // Usando 'order_index' conforme seu schema.sql
        await client.query(
            "INSERT INTO columns (title, board_id, order_index) VALUES ('A Fazer', $1, 0), ('Em Progresso', $1, 1), ('Concluído', $1, 2)", 
            [newBoard.id]
        );

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

  // 3. ADICIONAR MEMBRO
  app.post('/:id/members', { onRequest: [app.authenticate] }, async (req, reply) => {
      const { id } = addMemberParamsSchema.parse(req.params);
      const { userId } = addMemberBodySchema.parse(req.body);
      const requesterId = req.user.id;

      // Verifica permissão
      const roleCheck = await pool.query('SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2', [id, requesterId]);
      if (roleCheck.rowCount === 0) return reply.code(403).send({ error: 'Sem permissão' });

      try {
          await pool.query(
              `INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, 'editor') ON CONFLICT DO NOTHING`,
              [id, userId]
          );
          
          // Notificação
          const boardRes = await pool.query('SELECT title FROM boards WHERE id = $1', [id]);
          const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [requesterId]);
          
          if(boardRes.rowCount && userRes.rowCount) {
             const content = `${userRes.rows[0].name} te adicionou ao quadro "${boardRes.rows[0].title}"`;
             await pool.query(
                `INSERT INTO notifications (user_id, type, content, resource_link) VALUES ($1, 'invite', $2, $3)`,
                [userId, content, `/board/${id}`]
             );
          }

          return reply.send({ success: true });
      } catch (e) {
          return reply.code(500).send(e);
      }
  });

  // 4. REMOVER MEMBRO
  app.delete('/:id/members/:userId', { onRequest: [app.authenticate] }, async (req, reply) => {
      const { id, userId } = removeMemberParamsSchema.parse(req.params);
      const requesterId = req.user.id;

      const ownerCheck = await pool.query('SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2', [id, requesterId]);
      const isOwner = ownerCheck.rows[0]?.role === 'owner';
      
      // Regra: Só dono remove outros. Usuário pode se remover.
      if (!isOwner && requesterId !== userId) {
          return reply.code(403).send({ error: 'Apenas o dono pode remover membros.' });
      }

      // Ninguém remove o dono
      const targetCheck = await pool.query('SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2', [id, userId]);
      if (targetCheck.rows[0]?.role === 'owner') {
          return reply.code(400).send({ error: 'O dono do quadro não pode ser removido.' });
      }

      await pool.query('DELETE FROM board_members WHERE board_id = $1 AND user_id = $2', [id, userId]);
      return reply.send({ success: true });
  });

  // 5. EXCLUIR QUADRO
  app.delete('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
      const { id } = deleteBoardParamsSchema.parse(req.params);
      const requesterId = req.user.id;

      const check = await pool.query('SELECT created_by FROM boards WHERE id = $1', [id]);
      
      // Regra: Apenas quem criou (created_by) pode deletar o quadro inteiro
      if (check.rowCount === 0) return reply.code(404).send();
      
      if (check.rows[0].created_by !== requesterId) {
          return reply.code(403).send({ error: 'Apenas o criador pode excluir o quadro.' });
      }

      await pool.query('DELETE FROM boards WHERE id = $1', [id]);
      return reply.send({ success: true });
  });
};

export default boardsRoutes;