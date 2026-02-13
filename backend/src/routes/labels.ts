import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import pool from '../database/connection';
import { getIO } from '../lib/socket';

const labelsRoutes: FastifyPluginAsync = async (app) => {
  
  // 1. CRIAR ETIQUETA NO QUADRO
  app.post('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const schema = z.object({
      boardId: z.string().uuid(),
      title: z.string().max(50).optional(),
      color: z.string().min(1)
    });
    
    const body = schema.parse(req.body);

    const res = await pool.query(
      `INSERT INTO labels (board_id, title, color) VALUES ($1, $2, $3) RETURNING *`,
      [body.boardId, body.title || '', body.color]
    );
    const newLabel = res.rows[0];

    // Avisa socket (para mostrar a nova etiqueta no modal de seleção)
    getIO().to(body.boardId).emit('label_created', newLabel);

    return reply.status(201).send(newLabel);
  });

  // 2. ALTERAR VÍNCULO (Adicionar/Remover etiqueta de um card)
  app.post('/toggle', { onRequest: [app.authenticate] }, async (req, reply) => {
    const schema = z.object({
      cardId: z.string().uuid(),
      labelId: z.string().uuid(),
      boardId: z.string().uuid() // Necessário para o socket saber onde gritar
    });

    const { cardId, labelId, boardId } = schema.parse(req.body);

    // Verifica se já existe
    const check = await pool.query('SELECT * FROM card_labels WHERE card_id=$1 AND label_id=$2', [cardId, labelId]);

    if (check.rowCount && check.rowCount > 0) {
        // Remove
        await pool.query('DELETE FROM card_labels WHERE card_id=$1 AND label_id=$2', [cardId, labelId]);
        getIO().to(boardId).emit('card_label_removed', { cardId, labelId });
        return reply.send({ action: 'removed' });
    } else {
        // Adiciona
        await pool.query('INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2)', [cardId, labelId]);
        
        // Buscamos a label completa para o frontend desenhar a bolinha colorida
        const labelRes = await pool.query('SELECT * FROM labels WHERE id=$1', [labelId]);
        getIO().to(boardId).emit('card_label_added', { cardId, label: labelRes.rows[0] });
        return reply.send({ action: 'added', label: labelRes.rows[0] });
    }
  });

  // 3. DELETAR ETIQUETA
  app.delete('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    
    // Pega boardId antes de deletar
    const check = await pool.query('SELECT board_id FROM labels WHERE id=$1', [id]);
    if (check.rowCount === 0) return reply.send();
    const boardId = check.rows[0].board_id;

    await pool.query('DELETE FROM labels WHERE id=$1', [id]);
    getIO().to(boardId).emit('label_deleted', { labelId: id });

    return reply.send({ success: true });
  });
};

export default labelsRoutes;