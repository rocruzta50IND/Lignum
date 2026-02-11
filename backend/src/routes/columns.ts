import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import pool from '../database/connection'; 

const getColumnsQuerySchema = z.object({ boardId: z.string().uuid().optional() });
const createColumnBodySchema = z.object({ title: z.string().min(1), boardId: z.string().uuid() });
const deleteColumnParamsSchema = z.object({ columnId: z.string().uuid() });
const updateColumnParamsSchema = z.object({ columnId: z.string().uuid() });
const updateColumnBodySchema = z.object({ title: z.string().min(1) });
const moveColumnParamsSchema = z.object({ columnId: z.string().uuid() });
const moveColumnBodySchema = z.object({ newPosition: z.number().min(0) });

const columnsRoutes: FastifyPluginAsync = async (app) => {
  
  // LISTAR COLUNAS E CARDS (Query Aprimorada e Segura)
  app.get('/', { onRequest: [app.authenticate] }, async (request, reply) => {
    const q = getColumnsQuerySchema.safeParse(request.query);
    if (!q.success) return reply.status(400).send({ error: 'Parâmetros inválidos' });
    let { boardId } = q.data;
    const userId = request.user.id;

    try {
      // Auto-Discovery (Lógica existente)
      if (!boardId) {
          const b = await pool.query('SELECT b.id FROM boards b JOIN board_members bm ON b.id = bm.board_id WHERE bm.user_id = $1 LIMIT 1', [userId]);
          
          // CORREÇÃO TYPESCRIPT: Garantindo que rowCount é número
          if ((b.rowCount || 0) > 0) {
              boardId = b.rows[0].id;
          } else {
              // Cria board padrão se não existir nenhum
              const client = await pool.connect();
              try {
                  await client.query('BEGIN');
                  const nb = await client.query('INSERT INTO boards (title, created_by) VALUES ($1, $2) RETURNING id', ['Meu Quadro', userId]);
                  boardId = nb.rows[0].id;
                  await client.query("INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, 'owner')", [boardId, userId]);
                  await client.query("INSERT INTO columns (title, board_id, order_position) VALUES ('A Fazer', $1, 0), ('Em Progresso', $1, 1), ('Concluído', $1, 2)", [boardId]);
                  await client.query('COMMIT');
              } catch (err) {
                  await client.query('ROLLBACK');
                  throw err;
              } finally {
                  client.release();
              }
          }
      }

      // Busca Colunas
      const columnsRes = await pool.query(
        'SELECT id, title, board_id, order_position as "order" FROM columns WHERE board_id = $1 ORDER BY order_position ASC',
        [boardId]
      );

      // BUSCA CARDS (CORREÇÃO DE TIPO SQL AQUI)
      // Adicionado ::text para evitar erro de UUID vs Varchar
      const cardsRes = await pool.query(`
        SELECT 
            k.id, k.title, k.description, k.column_id, k.rank_position,
            k.priority, k.hex_color, k.due_date, k.assignee, 
            u.name as assignee_name, 
            k.checklist, k.comments
        FROM cards k
        JOIN columns c ON k.column_id = c.id
        LEFT JOIN users u ON k.assignee::text = u.id::text -- <--- CORREÇÃO CRÍTICA
        WHERE c.board_id = $1
        ORDER BY k.rank_position ASC
      `, [boardId]);

      // Mapper
      const columns = columnsRes.rows.map(col => {
        const colCards = cardsRes.rows.filter(c => c.column_id === col.id);
        
        const formattedCards = colCards.map(c => ({
            id: c.id,
            title: c.title,
            description: c.description || '',
            columnId: c.column_id,
            order: c.rank_position,
            priority: c.priority || 'Média',
            hexColor: c.hex_color || '#2C2C2C',
            dueDate: c.due_date,
            assignee: c.assignee,
            assigneeName: c.assignee_name, 
            checklist: c.checklist || [],
            comments: c.comments || []
        }));

        return { ...col, cards: formattedCards, board_id: col.board_id };
      });

      return reply.send(columns);

    } catch (e: any) { 
        console.error("ERRO GET COLUMNS:", e); // Log para ver no terminal se der erro
        return reply.code(500).send({ error: 'Erro interno', details: e.message }); 
    }
  });

  // --- MANTENDO AS OUTRAS ROTAS ---
  
  app.post('/', { onRequest: [app.authenticate] }, async (req, reply) => {
      const b = createColumnBodySchema.parse(req.body);
      const c = await pool.query('SELECT COUNT(*) FROM columns WHERE board_id=$1', [b.boardId]);
      const res = await pool.query('INSERT INTO columns (title, board_id, order_position) VALUES ($1, $2, $3) RETURNING *', [b.title, b.boardId, parseInt(c.rows[0].count)+1]);
      return reply.status(201).send({ ...res.rows[0], cards: [] });
  });
  
  app.patch('/:columnId', { onRequest: [app.authenticate] }, async (req, reply) => {
      const p = updateColumnParamsSchema.parse(req.params); const b = updateColumnBodySchema.parse(req.body);
      const res = await pool.query('UPDATE columns SET title=$1 WHERE id=$2 RETURNING *', [b.title, p.columnId]);
      return reply.send(res.rows[0]);
  });

  app.patch('/:columnId/move', { onRequest: [app.authenticate] }, async (req, reply) => {
      const p = moveColumnParamsSchema.parse(req.params);
      const b = moveColumnBodySchema.parse(req.body);
      const curr = await pool.query('SELECT order_position, board_id FROM columns WHERE id=$1', [p.columnId]);
      const oldPos = curr.rows[0].order_position; const boardId = curr.rows[0].board_id; const newPos = b.newPosition;
      if (oldPos===newPos) return reply.send({success:true});
      const client = await pool.connect();
      try {
          await client.query('BEGIN');
          if (newPos > oldPos) await client.query('UPDATE columns SET order_position = order_position - 1 WHERE board_id=$1 AND order_position > $2 AND order_position <= $3', [boardId, oldPos, newPos]);
          else await client.query('UPDATE columns SET order_position = order_position + 1 WHERE board_id=$1 AND order_position >= $2 AND order_position < $3', [boardId, newPos, oldPos]);
          await client.query('UPDATE columns SET order_position=$1 WHERE id=$2', [newPos, p.columnId]);
          await client.query('COMMIT');
      } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
      return reply.send({success:true});
  });

  app.delete('/:columnId', { onRequest: [app.authenticate] }, async (req, reply) => {
      const p = deleteColumnParamsSchema.parse(req.params);
      await pool.query('DELETE FROM columns WHERE id=$1', [p.columnId]);
      return reply.status(204).send();
  });
};

export default columnsRoutes;