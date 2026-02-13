import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import pool from '../database/connection';
import { getIO } from '../lib/socket';

const createCardSchema = z.object({
  columnId: z.string().uuid(),
  title: z.string().min(1),
});

const updateCardParams = z.object({
  cardId: z.string().uuid(),
});

const updateCardBody = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['Baixa', 'Média', 'Alta']).optional(),
  dueDate: z.string().optional().nullable(),
  assignee: z.string().optional().nullable(),
  hexColor: z.string().optional(),
  completed: z.boolean().optional(),
  checklist: z.array(z.any()).optional(),
  comments: z.array(z.any()).optional(),
});

const moveCardBody = z.object({
  newColumnId: z.string().uuid(),
  newRankPosition: z.number(),
});

const cardsRoutes: FastifyPluginAsync = async (app) => {

  // --- 🔄 HELPER: Tradutor Banco -> Frontend ---
  const formatCard = (c: any) => ({
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
      labels: c.labels || [],  // Agora vai vir preenchido!
      attachments: c.attachments || [] // Agora vai vir preenchido!
  });

  const checkCardPermission = async (cardId: string, userId: string) => {
    const res = await pool.query(`SELECT c.board_id FROM cards k JOIN columns c ON k.column_id = c.id WHERE k.id = $1`, [cardId]);
    if (res.rowCount === 0) throw new Error('CARD_NOT_FOUND');
    const boardId = res.rows[0].board_id;

    const check = await pool.query(`SELECT 1 FROM boards b LEFT JOIN board_members bm ON b.id = bm.board_id WHERE b.id = $1 AND (b.owner_id = $2 OR bm.user_id = $2) LIMIT 1`, [boardId, userId]);
    if ((check.rowCount || 0) === 0) throw new Error('FORBIDDEN_ACCESS');
    return boardId;
  };

  // 1. CRIAR CARD
  app.post('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    try {
      const { columnId, title } = createCardSchema.parse(req.body);
      // @ts-ignore
      const userId = req.user.id;

      const colCheck = await pool.query(`SELECT board_id FROM columns WHERE id = $1`, [columnId]);
      if (colCheck.rowCount === 0) return reply.status(404).send();
      const boardId = colCheck.rows[0].board_id;

      const perm = await pool.query(`SELECT 1 FROM boards b LEFT JOIN board_members bm ON b.id = bm.board_id WHERE b.id = $1 AND (b.owner_id = $2 OR bm.user_id = $2)`, [boardId, userId]);
      if (perm.rowCount === 0) return reply.status(403).send();

      const countRes = await pool.query('SELECT COUNT(*) FROM cards WHERE column_id = $1', [columnId]);
      const rank = (parseInt(countRes.rows[0].count) + 1) * 10000;

      const insert = await pool.query(`
        INSERT INTO cards (title, column_id, rank_position, priority, hex_color, checklist, comments)
        VALUES ($1, $2, $3, 'Média', '#2C2C2C', '[]', '[]')
        RETURNING *
      `, [title, columnId, rank]);

      const newCardRaw = insert.rows[0];
      const newCardFormatted = formatCard(newCardRaw); // Labels virão vazias, ok para card novo

      getIO().to(boardId).emit('card_created', newCardFormatted);
      return reply.status(201).send(newCardFormatted);
    } catch (e) { return reply.status(500).send(e); }
  });

  // 2. ATUALIZAR CARD (PATCH) - CORRIGIDO AQUI 🚨
  app.patch('/:cardId', { onRequest: [app.authenticate] }, async (req, reply) => {
    try {
      const { cardId } = updateCardParams.parse(req.params);
      const body = updateCardBody.parse(req.body);
      // @ts-ignore
      const userId = req.user.id;

      const boardId = await checkCardPermission(cardId, userId);

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      Object.entries(body).forEach(([key, value]) => {
        let dbCol = key;
        if (key === 'dueDate') dbCol = 'due_date';
        if (key === 'hexColor') dbCol = 'hex_color';
        const finalValue = (key === 'checklist' || key === 'comments') ? JSON.stringify(value) : value;
        fields.push(`${dbCol} = $${idx}`);
        values.push(finalValue);
        idx++;
      });

      if (fields.length === 0) return reply.send({ message: 'Nada a atualizar' });

      values.push(cardId);
      const query = `UPDATE cards SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;

      const res = await pool.query(query, values);
      const updatedCardRaw = res.rows[0];

      // --- CORREÇÃO: Resgatar Labels e Anexos para manter integridade ---
      
      // 1. Labels
      const labelsRes = await pool.query(`
        SELECT l.id, l.title, l.color 
        FROM card_labels cl
        JOIN labels l ON cl.label_id = l.id
        WHERE cl.card_id = $1
      `, [cardId]);
      updatedCardRaw.labels = labelsRes.rows;

      // 2. Anexos
      const attachRes = await pool.query(`
        SELECT id, file_name, file_path, file_type, created_at
        FROM attachments
        WHERE card_id = $1
      `, [cardId]);
      
      // Formata anexos para camelCase manualmente antes de passar pro formatCard
      updatedCardRaw.attachments = attachRes.rows.map(a => ({
          id: a.id, fileName: a.file_name, filePath: a.file_path, fileType: a.file_type, createdAt: a.created_at
      }));

      // --- FIM DA CORREÇÃO ---

      const updatedCardFormatted = formatCard(updatedCardRaw);

      getIO().to(boardId).emit('card_updated', updatedCardFormatted);
      return reply.send(updatedCardFormatted);

    } catch (e: any) {
      console.error("Erro UPDATE:", e);
      if (e.message === 'FORBIDDEN_ACCESS') return reply.status(403).send();
      return reply.status(500).send(e);
    }
  });

  // 3. MOVER CARD
  app.patch('/:cardId/move', { onRequest: [app.authenticate] }, async (req, reply) => {
    try {
        const { cardId } = updateCardParams.parse(req.params);
        const { newColumnId, newRankPosition } = moveCardBody.parse(req.body);
        // @ts-ignore
        const userId = req.user.id;
        const boardId = await checkCardPermission(cardId, userId);

        await pool.query(`UPDATE cards SET column_id = $1, rank_position = $2 WHERE id = $3`, [newColumnId, newRankPosition, cardId]);

        getIO().to(boardId).emit('card_moved', { cardId, newColumnId, newRankPosition });
        return reply.send({ success: true });
    } catch (e: any) { return reply.status(500).send(e); }
  });

  // 4. DELETAR CARD
  app.delete('/:cardId', { onRequest: [app.authenticate] }, async (req, reply) => {
    try {
        const { cardId } = updateCardParams.parse(req.params);
        // @ts-ignore
        const userId = req.user.id;
        const boardId = await checkCardPermission(cardId, userId);
        
        await pool.query('DELETE FROM cards WHERE id = $1', [cardId]);
        getIO().to(boardId).emit('card_deleted', { cardId });
        return reply.status(204).send();
    } catch (e: any) { return reply.status(500).send(e); }
  });
};

export default cardsRoutes;