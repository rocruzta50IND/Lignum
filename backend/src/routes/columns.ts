import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import pool from '../database/connection'; 

const getColumnsQuerySchema = z.object({ boardId: z.string().uuid().optional() });
const createColumnBodySchema = z.object({ title: z.string().min(1), boardId: z.string().uuid() });
const deleteColumnParamsSchema = z.object({ columnId: z.string().uuid() });
const updateColumnParamsSchema = z.object({ columnId: z.string().uuid() });
const updateColumnBodySchema = z.object({ title: z.string().min(1) });

// NOVO: Schema para mover
const moveColumnParamsSchema = z.object({ columnId: z.string().uuid() });
const moveColumnBodySchema = z.object({ newPosition: z.number().min(0) });

const columnsRoutes: FastifyPluginAsync = async (app) => {
  
  // LISTAR
  app.get('/', { onRequest: [app.authenticate] }, async (request, reply) => {
    const q = getColumnsQuerySchema.safeParse(request.query);
    if (!q.success) return reply.status(400).send({ error: 'Parâmetros inválidos' });
    let { boardId } = q.data;
    const userId = request.user.id;

    try {
      if (!boardId) {
          const b = await pool.query('SELECT id FROM boards LIMIT 1');
          if (b.rowCount > 0) boardId = b.rows[0].id;
          else {
              const nb = await pool.query('INSERT INTO boards (title, created_by) VALUES ($1, $2) RETURNING id', ['Meu Quadro', userId]);
              boardId = nb.rows[0].id;
              await pool.query("INSERT INTO columns (title, board_id, order_position) VALUES ('A Fazer', $1, 0), ('Em Progresso', $1, 1), ('Concluído', $1, 2)", [boardId]);
          }
      }
      const cRes = await pool.query('SELECT id, title, board_id, order_position as "order" FROM columns WHERE board_id = $1 ORDER BY order_position ASC', [boardId]);
      const kRes = await pool.query(`SELECT k.* FROM cards k JOIN columns c ON k.column_id = c.id WHERE c.board_id = $1 ORDER BY k.rank_position ASC`, [boardId]);

      const cols = cRes.rows.map(col => ({
          ...col,
          board_id: col.board_id,
          cards: kRes.rows.filter(c => c.column_id === col.id).map(c => ({
            id: c.id, title: c.title, description: c.description||'', columnId: c.column_id, order: c.rank_position,
            priority: c.priority||'Média', hexColor: c.hex_color||'#2C2C2C', dueDate: c.due_date, assignee: c.assignee, checklist: c.checklist||[], comments: c.comments||[]
          }))
      }));
      return reply.send(cols);
    } catch (e: any) { return reply.code(500).send({ error: 'Erro interno', details: e.message }); }
  });

  // CRIAR
  app.post('/', { onRequest: [app.authenticate] }, async (request, reply) => {
    const b = createColumnBodySchema.parse(request.body);
    try {
      const c = await pool.query('SELECT COUNT(*) FROM columns WHERE board_id = $1', [b.boardId]);
      const next = parseInt(c.rows[0].count);
      const res = await pool.query('INSERT INTO columns (title, board_id, order_position) VALUES ($1, $2, $3) RETURNING *', [b.title, b.boardId, next]);
      return reply.status(201).send({ ...res.rows[0], cards: [] });
    } catch (e) { return reply.status(500).send(e); }
  });

  // ATUALIZAR (PATCH Title)
  app.patch('/:columnId', { onRequest: [app.authenticate] }, async (req, reply) => {
    try {
        const p = updateColumnParamsSchema.parse(req.params);
        const b = updateColumnBodySchema.parse(req.body);
        const res = await pool.query('UPDATE columns SET title = $1 WHERE id = $2 RETURNING *', [b.title, p.columnId]);
        if (res.rowCount === 0) return reply.status(404).send();
        return reply.send(res.rows[0]);
    } catch (e) { return reply.status(500).send(e); }
  });

  // --- NOVO: MOVER COLUNA (PATCH Move) ---
  app.patch('/:columnId/move', { onRequest: [app.authenticate] }, async (req, reply) => {
    try {
        const p = moveColumnParamsSchema.parse(req.params);
        const b = moveColumnBodySchema.parse(req.body); // newPosition (index)

        // 1. Descobrir posição atual e board_id
        const currentRes = await pool.query('SELECT order_position, board_id FROM columns WHERE id = $1', [p.columnId]);
        if (currentRes.rowCount === 0) return reply.code(404).send();
        
        const oldPos = currentRes.rows[0].order_position;
        const boardId = currentRes.rows[0].board_id;
        const newPos = b.newPosition;

        if (oldPos === newPos) return reply.send({ success: true });

        // 2. Reordenar os outros
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            if (newPos > oldPos) {
                // Moveu para direita (ex: 0 -> 2): Decrementa quem está no meio (1, 2 viram 0, 1)
                await client.query(
                    'UPDATE columns SET order_position = order_position - 1 WHERE board_id = $1 AND order_position > $2 AND order_position <= $3',
                    [boardId, oldPos, newPos]
                );
            } else {
                // Moveu para esquerda (ex: 2 -> 0): Incrementa quem está no meio
                await client.query(
                    'UPDATE columns SET order_position = order_position + 1 WHERE board_id = $1 AND order_position >= $2 AND order_position < $3',
                    [boardId, newPos, oldPos]
                );
            }
            // 3. Atualiza o alvo
            await client.query('UPDATE columns SET order_position = $1 WHERE id = $2', [newPos, p.columnId]);
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        return reply.send({ success: true });
    } catch (e) { console.error(e); return reply.status(500).send(e); }
  });

  // DELETAR
  app.delete('/:columnId', { onRequest: [app.authenticate] }, async (request, reply) => {
    const p = deleteColumnParamsSchema.parse(request.params);
    try { await pool.query('DELETE FROM columns WHERE id = $1', [p.columnId]); return reply.status(204).send(); } catch (e) { return reply.status(500).send(e); }
  });
};

export default columnsRoutes;