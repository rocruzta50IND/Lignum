import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import pool from '../database/connection'; 
import { getIO } from '../lib/socket';

const getColumnsQuerySchema = z.object({ boardId: z.string().uuid().optional() });
const createColumnBodySchema = z.object({ title: z.string().min(1), boardId: z.string().uuid() });
const updateColumnParamsSchema = z.object({ columnId: z.string().uuid() });
const updateColumnBodySchema = z.object({ title: z.string().min(1) });
const moveColumnParamsSchema = z.object({ columnId: z.string().uuid() });
const moveColumnBodySchema = z.object({ newPosition: z.number().min(0) });
const deleteColumnParamsSchema = z.object({ columnId: z.string().uuid() });

const columnsRoutes: FastifyPluginAsync = async (app) => {
  
  // 1. LISTAR COLUNAS (COM LABELS E ANEXOS)
  app.get('/', { onRequest: [app.authenticate] }, async (request, reply) => {
    try {
        const q = getColumnsQuerySchema.safeParse(request.query);
        if (!q.success) return reply.status(400).send({ error: 'Parâmetros inválidos' });
        
        let { boardId } = q.data;
        const userId = request.user.id;

        if (!boardId) {
            const b = await pool.query('SELECT b.id FROM boards b JOIN board_members bm ON b.id = bm.board_id WHERE bm.user_id = $1 ORDER BY bm.last_viewed_at DESC LIMIT 1', [userId]);
            if ((b.rowCount || 0) > 0) boardId = b.rows[0].id;
            else return reply.send([]);
        }

        // 1. Colunas
        const columnsRes = await pool.query(
            'SELECT id, title, board_id, order_index as "order" FROM columns WHERE board_id = $1 ORDER BY order_index ASC',
            [boardId]
        );

        // 2. Cards
        const cardsRes = await pool.query(`
            SELECT 
                k.id, k.title, k.description, k.column_id, k.rank_position,
                k.priority, k.hex_color, k.due_date, k.assignee, 
                k.checklist, k.comments
            FROM cards k
            JOIN columns c ON k.column_id = c.id
            WHERE c.board_id = $1
            ORDER BY k.rank_position ASC
        `, [boardId]);

        // 3. Labels (Vínculos)
        const cardLabelsRes = await pool.query(`
            SELECT cl.card_id, l.id, l.title, l.color
            FROM card_labels cl
            JOIN labels l ON cl.label_id = l.id
            WHERE l.board_id = $1
        `, [boardId]);

        // 4. ANEXOS (NOVO!) - Busca todos os anexos deste quadro
        const attachmentsRes = await pool.query(`
            SELECT a.id, a.card_id, a.file_name, a.file_path, a.file_type, a.created_at
            FROM attachments a
            JOIN cards c ON a.card_id = c.id
            JOIN columns col ON c.column_id = col.id
            WHERE col.board_id = $1
            ORDER BY a.created_at DESC
        `, [boardId]);

        // Montagem dos dados
        const columns = columnsRes.rows.map(col => {
            const colCards = cardsRes.rows.filter(c => c.column_id === col.id);
            
            const formattedCards = colCards.map(c => {
                // Labels do card
                const myLabels = cardLabelsRes.rows
                    .filter(cl => cl.card_id === c.id)
                    .map(l => ({ id: l.id, title: l.title, color: l.color }));

                // Anexos do card
                const myAttachments = attachmentsRes.rows
                    .filter(a => a.card_id === c.id)
                    .map(a => ({
                        id: a.id,
                        fileName: a.file_name,
                        filePath: a.file_path, // O front usará isso na URL
                        fileType: a.file_type,
                        createdAt: a.created_at
                    }));

                return {
                    id: c.id,
                    title: c.title,
                    description: c.description || '',
                    columnId: c.column_id,
                    order: c.rank_position,
                    priority: c.priority || 'Média',
                    hexColor: c.hex_color || '#2C2C2C',
                    dueDate: c.due_date,
                    assignee: c.assignee,
                    checklist: c.checklist || [],
                    comments: c.comments || [],
                    labels: myLabels,
                    attachments: myAttachments // <--- CAMPO NOVO
                };
            });

            return { ...col, cards: formattedCards, board_id: col.board_id };
        });

        return reply.send(columns);

    } catch (e: any) { 
        console.error(e);
        return reply.code(500).send({ error: 'Erro interno' }); 
    }
  });

  // --- RESTO DAS ROTAS (POST/PATCH/DELETE) IGUAIS ---
  app.post('/', { onRequest: [app.authenticate] }, async (req, reply) => {
      try {
        const b = createColumnBodySchema.parse(req.body);
        const c = await pool.query('SELECT COUNT(*) FROM columns WHERE board_id=$1', [b.boardId]);
        const count = parseInt(c.rows[0].count) || 0;
        const res = await pool.query('INSERT INTO columns (title, board_id, order_index) VALUES ($1, $2, $3) RETURNING *', [b.title, b.boardId, count]);
        const newCol = { ...res.rows[0], cards: [], order: res.rows[0].order_index };
        getIO().to(b.boardId).emit('column_created', newCol);
        return reply.status(201).send(newCol);
      } catch (error) { return reply.code(500).send(error); }
  });
  
  app.patch('/:columnId', { onRequest: [app.authenticate] }, async (req, reply) => {
      const p = updateColumnParamsSchema.parse(req.params); 
      const b = updateColumnBodySchema.parse(req.body);
      const res = await pool.query('UPDATE columns SET title=$1 WHERE id=$2 RETURNING *', [b.title, p.columnId]);
      const updated = res.rows[0];
      getIO().to(updated.board_id).emit('column_updated', { id: updated.id, title: updated.title });
      return reply.send(updated);
  });

  app.patch('/:columnId/move', { onRequest: [app.authenticate] }, async (req, reply) => {
      const p = moveColumnParamsSchema.parse(req.params);
      const b = moveColumnBodySchema.parse(req.body);
      const curr = await pool.query('SELECT order_index, board_id FROM columns WHERE id=$1', [p.columnId]);
      if (curr.rowCount === 0) return reply.code(404).send();
      const oldPos = curr.rows[0].order_index; 
      const boardId = curr.rows[0].board_id; 
      const newPos = b.newPosition;
      if (oldPos === newPos) return reply.send({success:true});
      const client = await pool.connect();
      try {
          await client.query('BEGIN');
          if (newPos > oldPos) {
              await client.query('UPDATE columns SET order_index = order_index - 1 WHERE board_id=$1 AND order_index > $2 AND order_index <= $3', [boardId, oldPos, newPos]);
          } else {
              await client.query('UPDATE columns SET order_index = order_index + 1 WHERE board_id=$1 AND order_index >= $2 AND order_index < $3', [boardId, newPos, oldPos]);
          }
          await client.query('UPDATE columns SET order_index=$1 WHERE id=$2', [newPos, p.columnId]);
          await client.query('COMMIT');
          getIO().to(boardId).emit('column_moved', { columnId: p.columnId, newPosition: newPos });
      } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
      return reply.send({success:true});
  });

  app.delete('/:columnId', { onRequest: [app.authenticate] }, async (req, reply) => {
      const p = deleteColumnParamsSchema.parse(req.params);
      const find = await pool.query('SELECT board_id FROM columns WHERE id=$1', [p.columnId]);
      if (find.rowCount === 0) return reply.send();
      const boardId = find.rows[0].board_id;
      await pool.query('DELETE FROM columns WHERE id=$1', [p.columnId]);
      getIO().to(boardId).emit('column_deleted', { columnId: p.columnId });
      return reply.status(204).send();
  });
};

export default columnsRoutes;