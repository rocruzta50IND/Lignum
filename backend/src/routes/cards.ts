import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import pool from '../database/connection'; 
import { getIO } from '../lib/socket';

// --- SCHEMAS ---
const createCardBodySchema = z.object({ 
    columnId: z.string().uuid(), 
    title: z.string().min(1) 
});

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
    columnId: z.string().uuid().optional()      
});

const moveCardParamsSchema = z.object({ cardId: z.string().uuid() });
const moveCardBodySchema = z.object({ 
    newColumnId: z.string().uuid(), 
    newRankPosition: z.number() 
});

const deleteCardParamsSchema = z.object({ cardId: z.string().uuid() });

const cardsRoutes: FastifyPluginAsync = async (app) => {

  // 1. CRIAR CARTÃO
  app.post('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    try {
        const body = createCardBodySchema.parse(req.body);
        const userId = (req.user as any).id; // Tipagem forçada para evitar erro
        
        // 1. Descobrir Board ID
        const colRes = await pool.query('SELECT board_id FROM columns WHERE id = $1', [body.columnId]);
        if (colRes.rowCount === 0) return reply.code(404).send({ error: 'Coluna não encontrada' });
        const boardId = colRes.rows[0].board_id;

        // 2. Calcular Posição (Rank)
        const rankRes = await pool.query('SELECT MAX(rank_position) as m FROM cards WHERE column_id=$1', [body.columnId]);
        const newRank = (rankRes.rows[0].m || 0) + 10000; 

        // 3. Inserir (🔥 CORREÇÃO: Usando criador_id)
        const res = await pool.query(
            `INSERT INTO cards (column_id, title, description, rank_position, criador_id, hex_color, priority, checklist, comments) 
             VALUES ($1, $2, '', $3, $4, '#2C2C2C', 'Média', '[]'::jsonb, '[]'::jsonb) 
             RETURNING *`,
            [body.columnId, body.title, newRank, userId]
        );
        
        // 4. Mapear retorno para CamelCase (Frontend)
        const raw = res.rows[0];
        const newCard = { 
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
            createdBy: raw.criador_id, // 🔥 VITAL: Envia o criador para o filtro funcionar na hora
            order: raw.rank_position
        };

        // Emitir evento
        getIO().to(boardId).emit('card_created', newCard);
        
        return reply.code(201).send(newCard);

    } catch (e: any) { 
        console.error("❌ ERRO CREATE CARD:", e); 
        return reply.code(500).send({ error: 'Erro ao criar card' }); 
    }
  });

  // 2. EDITAR CARTÃO (PUT)
  app.put('/:cardId', { onRequest: [app.authenticate] }, async (request, reply) => {
    const params = updateCardParamsSchema.parse(request.params);
    const body = updateCardBodySchema.parse(request.body);

    try {
        const findRes = await pool.query(
            `SELECT c.board_id FROM cards k JOIN columns c ON k.column_id = c.id WHERE k.id = $1`, 
            [params.cardId]
        );
        if (findRes.rowCount === 0) return reply.code(404).send({ error: 'Card não encontrado.' });
        const boardId = findRes.rows[0].board_id;

        const fields: string[] = [];
        const values: any[] = [];
        let idx = 1;

        if (body.title !== undefined) { fields.push(`title = $${idx++}`); values.push(body.title); }
        if (body.description !== undefined) { fields.push(`description = $${idx++}`); values.push(body.description); }
        if (body.priority !== undefined) { fields.push(`priority = $${idx++}`); values.push(body.priority); }
        if (body.hexColor !== undefined) { fields.push(`hex_color = $${idx++}`); values.push(body.hexColor); }
        if (body.dueDate !== undefined) { fields.push(`due_date = $${idx++}`); values.push(body.dueDate); }
        if (body.assignee !== undefined) { fields.push(`assignee = $${idx++}`); values.push(body.assignee); }
        if (body.columnId !== undefined) { fields.push(`column_id = $${idx++}`); values.push(body.columnId); }

        if (body.checklist !== undefined) { 
            fields.push(`checklist = $${idx++}::jsonb`); 
            values.push(JSON.stringify(body.checklist)); 
        }
        if (body.comments !== undefined) { 
            fields.push(`comments = $${idx++}::jsonb`); 
            values.push(JSON.stringify(body.comments)); 
        }

        if (fields.length === 0) {
            const current = await pool.query('SELECT * FROM cards WHERE id = $1', [params.cardId]);
            return reply.send(current.rows[0]);
        }

        fields.push(`updated_at = NOW()`);
        values.push(params.cardId);
        const query = `UPDATE cards SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;

        const res = await pool.query(query, values);
        const raw = res.rows[0];

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
            createdBy: raw.criador_id, // 🔥 Mantém o criador na resposta
            order: raw.rank_position
        };

        getIO().to(boardId).emit('card_updated', updatedCard);
        return reply.code(200).send(updatedCard);

    } catch (error: any) {
        console.error("❌ ERRO NO UPDATE CARD:", error);
        return reply.code(500).send({ error: 'Erro interno ao salvar.' });
    }
  });

  // 3. MOVER CARTÃO (PATCH)
  app.patch('/:cardId/move', { onRequest: [app.authenticate] }, async (req, reply) => {
    try {
        const p = moveCardParamsSchema.parse(req.params);
        const b = moveCardBodySchema.parse(req.body);
        
        const colRes = await pool.query('SELECT board_id FROM columns WHERE id=$1', [b.newColumnId]);
        if (colRes.rowCount === 0) return reply.code(404).send();
        
        const boardId = colRes.rows[0].board_id;

        const res = await pool.query(
            `UPDATE cards SET column_id=$1, rank_position=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
            [b.newColumnId, b.newRankPosition, p.cardId]
        );
        
        const raw = res.rows[0];
        const moved = { 
            id: raw.id,
            columnId: raw.column_id,
            title: raw.title,
            description: raw.description,
            checklist: raw.checklist,
            comments: raw.comments,
            priority: raw.priority,
            hexColor: raw.hex_color,
            dueDate: raw.due_date,
            assignee: raw.assignee,
            createdBy: raw.criador_id, // 🔥 Mantém consistência
            order: raw.rank_position
        };

        getIO().to(boardId).emit('card_moved', { 
            cardId: p.cardId, 
            newColumnId: b.newColumnId, 
            newRankPosition: b.newRankPosition 
        });
        
        return reply.code(200).send(moved);
    } catch (e) { 
        console.error(e); 
        return reply.code(500).send(e); 
    }
  });

  // 4. DELETAR CARTÃO
  app.delete('/:cardId', { onRequest: [app.authenticate] }, async (req, reply) => {
    try {
        const p = deleteCardParamsSchema.parse(req.params);
        const find = await pool.query(`SELECT c.board_id FROM cards k JOIN columns c ON k.column_id=c.id WHERE k.id=$1`, [p.cardId]);
        
        if(find.rowCount > 0) {
            const boardId = find.rows[0].board_id;
            await pool.query('DELETE FROM cards WHERE id=$1', [p.cardId]);
            getIO().to(boardId).emit('card_deleted', { cardId: p.cardId });
        }
        
        return reply.code(204).send();
    } catch (e) { 
        console.error(e); 
        return reply.code(500).send(e); 
    }
  });
};

export default cardsRoutes;