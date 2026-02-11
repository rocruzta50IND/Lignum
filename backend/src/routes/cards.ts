import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import pool from '../database/connection'; 
import { getIO } from '../lib/socket';

const updateCardParamsSchema = z.object({
  cardId: z.string().uuid(),
});

const updateCardBodySchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  checklist: z.array(z.any()).optional(), 
  comments: z.array(z.any()).optional(),
  assignee: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  hexColor: z.string().optional(),
  priority: z.enum(['Baixa', 'Média', 'Alta']).optional(),
});

// Schemas auxiliares
const createCardBodySchema = z.object({ columnId: z.string().uuid(), title: z.string().min(1) });
const moveCardParamsSchema = z.object({ cardId: z.string().uuid() });
const moveCardBodySchema = z.object({ newColumnId: z.string().uuid(), newRankPosition: z.number() });
const deleteCardParamsSchema = z.object({ cardId: z.string().uuid() });

const cardsRoutes: FastifyPluginAsync = async (app) => {

  // --- EDITAR CARD (PUT) ---
  app.put('/:cardId', { onRequest: [app.authenticate] }, async (request, reply) => {
    const params = updateCardParamsSchema.parse(request.params);
    const body = updateCardBodySchema.parse(request.body);

    console.log(">>> RECEBENDO UPDATE:", { id: params.cardId, body });

    try {
        // 1. Validar e pegar boardId
        const findRes = await pool.query(
            `SELECT c.board_id FROM cards k JOIN columns c ON k.column_id = c.id WHERE k.id = $1`, 
            [params.cardId]
        );
        
        if (findRes.rowCount === 0) return reply.code(404).send({ error: 'Card não encontrado.' });
        const boardId = findRes.rows[0].board_id;

        // 2. Preparar dados
        const checklistJson = body.checklist ? JSON.stringify(body.checklist) : null;
        const commentsJson = body.comments ? JSON.stringify(body.comments) : null;

        // Lógica de Data: Se for null (remove a data), enviamos a flag. Se for undefined (não muda), enviamos null.
        let sqlDueDate = body.dueDate; 
        if (body.dueDate === null) sqlDueDate = 'NULL_RESET'; 

        // 3. Update Direto
        // CORREÇÃO AQUI: Mudamos "IS 'NULL_RESET'" para "= 'NULL_RESET'"
        const updateSql = `
            UPDATE cards 
            SET 
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                checklist = CASE WHEN $3::text IS NULL THEN checklist ELSE $3::jsonb END,
                comments = CASE WHEN $4::text IS NULL THEN comments ELSE $4::jsonb END,
                assignee = COALESCE($5, assignee),
                due_date = CASE WHEN $6::text = 'NULL_RESET' THEN NULL ELSE COALESCE($6::timestamp, due_date) END,
                hex_color = COALESCE($7, hex_color),
                priority = COALESCE($8, priority),
                updated_at = NOW()
            WHERE id = $9
            RETURNING *;
        `;
        const values = [
            body.title, 
            body.description, 
            checklistJson,
            commentsJson,
            body.assignee,
            sqlDueDate, 
            body.hexColor,
            body.priority,
            params.cardId
        ];
        console.log(">>> VALORES ENVIADOS AO BANCO:", values);


        const cardRes = await pool.query(updateSql, values);
        const raw = cardRes.rows[0];

        // 4. Formatar retorno
        const updatedCard = {
            id: raw.id,
            columnId: raw.column_id,
            title: raw.title,
            description: raw.description,
            checklist: raw.checklist || [],
            comments: raw.comments || [],
            priority: raw.priority,
            hexColor: raw.hex_color,
            dueDate: raw.due_date,
            assignee: raw.assignee,
            order: raw.rank_position
        };

        getIO().to(boardId).emit('card_updated', updatedCard);
        console.log(">>> SUCESSO UPDATE:", updatedCard.id);
        
        return reply.code(200).send(updatedCard);

    } catch (error: any) {
        console.error("❌ ERRO NO UPDATE CARD:", error);
        return reply.code(500).send({ 
            error: 'Erro interno ao salvar.', 
            details: error.message 
        });
    }
  });

  // --- CREATE ---
  app.post('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    try {
        const body = createCardBodySchema.parse(req.body);
        const userId = req.user.id;
        
        const colRes = await pool.query('SELECT board_id FROM columns WHERE id = $1', [body.columnId]);
        if (colRes.rowCount === 0) return reply.code(400).send({ error: 'Coluna 404' });
        const boardId = colRes.rows[0].board_id;

        const rankRes = await pool.query('SELECT MAX(rank_position) as m FROM cards WHERE column_id=$1', [body.columnId]);
        const newRank = (rankRes.rows[0].m || 0) + 1000;

        const res = await pool.query(
            `INSERT INTO cards (column_id, title, description, rank_position, created_by) VALUES ($1, $2, '', $3, $4) RETURNING *`,
            [body.columnId, body.title, newRank, userId]
        );
        
        const newCard = { ...res.rows[0], checklist: [], comments: [], priority: 'Média', hexColor: '#2C2C2C' };
        getIO().to(boardId).emit('card_created', newCard);
        return reply.code(201).send(newCard);
    } catch (e) { console.error(e); return reply.code(500).send(e); }
  });

  // --- MOVE ---
  app.patch('/:cardId/move', { onRequest: [app.authenticate] }, async (req, reply) => {
    try {
        const p = moveCardParamsSchema.parse(req.params);
        const b = moveCardBodySchema.parse(req.body);
        
        const colRes = await pool.query('SELECT board_id FROM columns WHERE id=$1', [b.newColumnId]);
        const boardId = colRes.rows[0].board_id;

        const res = await pool.query(
            `UPDATE cards SET column_id=$1, rank_position=$2 WHERE id=$3 RETURNING *`,
            [b.newColumnId, b.newRankPosition, p.cardId]
        );
        
        const moved = { ...res.rows[0], columnId: res.rows[0].column_id, hexColor: '#2C2C2C' };
        getIO().to(boardId).emit('card_moved', { cardId: p.cardId, newColumnId: b.newColumnId, newRankPosition: b.newRankPosition });
        return reply.code(200).send(moved);
    } catch (e) { console.error(e); return reply.code(500).send(e); }
  });

  // --- DELETE ---
  app.delete('/:cardId', { onRequest: [app.authenticate] }, async (req, reply) => {
    try {
        const p = deleteCardParamsSchema.parse(req.params);
        const find = await pool.query(`SELECT c.board_id FROM cards k JOIN columns c ON k.column_id=c.id WHERE k.id=$1`, [p.cardId]);
        if(find.rowCount===0) return reply.code(404).send();
        
        await pool.query('DELETE FROM cards WHERE id=$1', [p.cardId]);
        getIO().to(find.rows[0].board_id).emit('card_deleted', { cardId: p.cardId });
        return reply.code(204).send();
    } catch (e) { console.error(e); return reply.code(500).send(e); }
  });
};

export default cardsRoutes;