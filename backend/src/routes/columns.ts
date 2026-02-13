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

  // 1. LISTAR COLUNAS (GET)
  app.get('/', { onRequest: [app.authenticate] }, async (request, reply) => {
    try {
        const q = getColumnsQuerySchema.safeParse(request.query);
        if (!q.success) return reply.status(400).send({ error: 'Parâmetros inválidos' });
        
        // @ts-ignore
        const user = request.user;
        const userId = user?.id || user?.sub;

        if (!userId) return reply.status(401).send({ error: 'Sessão inválida' });

        let { boardId } = q.data;

        // Se não vier boardId, busca o primeiro disponível
        if (!boardId) {
            const b = await pool.query(`
                SELECT b.id FROM boards b 
                LEFT JOIN board_members bm ON b.id = bm.board_id 
                WHERE b.owner_id = $1 OR bm.user_id = $1 
                LIMIT 1
            `, [userId]);
            
            if ((b.rowCount || 0) > 0) boardId = b.rows[0].id;
            else return reply.send([]);
        }

        // Verifica permissão (Dono ou Membro)
        const check = await pool.query(`
            SELECT 1 FROM boards b
            LEFT JOIN board_members bm ON b.id = bm.board_id
            WHERE b.id = $1 AND (b.owner_id = $2 OR bm.user_id = $2)
            LIMIT 1
        `, [boardId, userId]);

        if ((check.rowCount || 0) === 0) {
            return reply.status(403).send({ error: 'Acesso negado.' });
        }

        // Busca dados do quadro
        const columnsRes = await pool.query(
            'SELECT id, title, board_id, order_index as "order" FROM columns WHERE board_id = $1 ORDER BY order_index ASC',
            [boardId]
        );

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

        const cardLabelsRes = await pool.query(`
            SELECT cl.card_id, l.id, l.title, l.color
            FROM card_labels cl JOIN labels l ON cl.label_id = l.id WHERE l.board_id = $1
        `, [boardId]);

        const attachmentsRes = await pool.query(`
            SELECT a.id, a.card_id, a.file_name, a.file_path, a.file_type, a.created_at
            FROM attachments a 
            JOIN cards c ON a.card_id = c.id JOIN columns col ON c.column_id = col.id
            WHERE col.board_id = $1 ORDER BY a.created_at DESC
        `, [boardId]);

        const columns = columnsRes.rows.map(col => {
            const colCards = cardsRes.rows.filter(c => c.column_id === col.id);
            const formattedCards = colCards.map(c => {
                return {
                    id: c.id, title: c.title, description: c.description || '',
                    columnId: c.column_id, order: c.rank_position, 
                    priority: c.priority || 'Média', hexColor: c.hex_color || '#2C2C2C',
                    dueDate: c.due_date, assignee: c.assignee,
                    checklist: c.checklist || [], comments: c.comments || [],
                    labels: cardLabelsRes.rows.filter(l => l.card_id === c.id)
                        .map(l => ({ id: l.id, title: l.title, color: l.color })),
                    attachments: attachmentsRes.rows.filter(a => a.card_id === c.id)
                        .map(a => ({ id: a.id, fileName: a.file_name, filePath: a.file_path, fileType: a.file_type, createdAt: a.created_at }))
                };
            });
            return { ...col, cards: formattedCards, board_id: col.board_id };
        });

        return reply.send(columns);

    } catch (e) { 
        console.error(e); 
        return reply.code(500).send({ error: 'Erro interno' }); 
    }
  });

  // 2. CRIAR COLUNA
  app.post('/', { onRequest: [app.authenticate] }, async (req, reply) => {
      try {
        const b = createColumnBodySchema.parse(req.body);
        // @ts-ignore
        const userId = req.user?.id || req.user?.sub;

        // Verifica permissão
        const check = await pool.query(`SELECT 1 FROM boards b LEFT JOIN board_members bm ON b.id = bm.board_id WHERE b.id=$1 AND (b.owner_id=$2 OR bm.user_id=$2) LIMIT 1`, [b.boardId, userId]);
        if ((check.rowCount || 0) === 0) return reply.status(403).send();

        const c = await pool.query('SELECT COUNT(*) FROM columns WHERE board_id=$1', [b.boardId]);
        const count = parseInt(c.rows[0].count) || 0;
        const res = await pool.query('INSERT INTO columns (title, board_id, order_index) VALUES ($1, $2, $3) RETURNING *', [b.title, b.boardId, count]);
        const newCol = { ...res.rows[0], cards: [], order: res.rows[0].order_index };
        getIO().to(b.boardId).emit('column_created', newCol);
        return reply.status(201).send(newCol);
      } catch (error) { return reply.code(500).send(error); }
  });
  
  // 3. EDITAR COLUNA
  app.patch('/:columnId', { onRequest: [app.authenticate] }, async (req, reply) => {
      try {
        const p = updateColumnParamsSchema.parse(req.params); 
        const b = updateColumnBodySchema.parse(req.body);
        
        const check = await pool.query('SELECT board_id FROM columns WHERE id=$1', [p.columnId]);
        if(check.rowCount === 0) return reply.code(404).send();
        const boardId = check.rows[0].board_id;

        // @ts-ignore
        const userId = req.user?.id || req.user?.sub;
        const perm = await pool.query(`SELECT 1 FROM boards b LEFT JOIN board_members bm ON b.id = bm.board_id WHERE b.id=$1 AND (b.owner_id=$2 OR bm.user_id=$2) LIMIT 1`, [boardId, userId]);
        if ((perm.rowCount || 0) === 0) return reply.status(403).send();

        const res = await pool.query('UPDATE columns SET title=$1 WHERE id=$2 RETURNING *', [b.title, p.columnId]);
        getIO().to(boardId).emit('column_updated', { id: p.columnId, title: b.title });
        return reply.send(res.rows[0]);
      } catch (e) { return reply.code(500).send(e); }
  });

  // 4. DELETAR COLUNA
  app.delete('/:columnId', { onRequest: [app.authenticate] }, async (req, reply) => {
      try {
        const p = deleteColumnParamsSchema.parse(req.params);
        const find = await pool.query('SELECT board_id FROM columns WHERE id=$1', [p.columnId]);
        if (find.rowCount === 0) return reply.status(204).send();
        const boardId = find.rows[0].board_id;

        // @ts-ignore
        const userId = req.user?.id || req.user?.sub;
        const perm = await pool.query(`SELECT 1 FROM boards b LEFT JOIN board_members bm ON b.id = bm.board_id WHERE b.id=$1 AND (b.owner_id=$2 OR bm.user_id=$2) LIMIT 1`, [boardId, userId]);
        if ((perm.rowCount || 0) === 0) return reply.status(403).send();

        await pool.query('DELETE FROM columns WHERE id=$1', [p.columnId]);
        getIO().to(boardId).emit('column_deleted', { columnId: p.columnId });
        return reply.status(204).send();
      } catch (e) { return reply.code(500).send(e); }
  });

  // 5. MOVER COLUNA
  app.patch('/:columnId/move', { onRequest: [app.authenticate] }, async (req, reply) => {
      try {
        const p = moveColumnParamsSchema.parse(req.params);
        const b = moveColumnBodySchema.parse(req.body);
        const curr = await pool.query('SELECT order_index, board_id FROM columns WHERE id=$1', [p.columnId]);
        if (curr.rowCount === 0) return reply.code(404).send();
        const boardId = curr.rows[0].board_id; 
        
        // @ts-ignore
        const userId = req.user?.id || req.user?.sub;
        const perm = await pool.query(`SELECT 1 FROM boards b LEFT JOIN board_members bm ON b.id = bm.board_id WHERE b.id=$1 AND (b.owner_id=$2 OR bm.user_id=$2) LIMIT 1`, [boardId, userId]);
        if ((perm.rowCount || 0) === 0) return reply.status(403).send();

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const oldPos = curr.rows[0].order_index;
            const newPos = b.newPosition;
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
      } catch (e) { return reply.code(500).send(e); }
  });
};

export default columnsRoutes;