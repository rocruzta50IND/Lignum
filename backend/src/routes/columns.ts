import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
// CORREÇÃO CRÍTICA: Sem chaves { } porque é export default
import pool from '../database/connection'; 

const getColumnsQuerySchema = z.object({
  boardId: z.string().uuid().optional(),
});

const createColumnBodySchema = z.object({
  title: z.string().min(1),
  boardId: z.string().uuid(),
});

const deleteColumnParamsSchema = z.object({
  columnId: z.string().uuid(),
});

const columnsRoutes: FastifyPluginAsync = async (app) => {
  
  // --- LISTAR COLUNAS E CARDS ---
  app.get('/', { onRequest: [app.authenticate] }, async (request, reply) => {
    // Validação segura
    const queryResult = getColumnsQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
        return reply.status(400).send({ error: 'Parâmetros inválidos' });
    }

    let { boardId } = queryResult.data;
    const userId = request.user.id;

    try {
      // 1. AUTO-DISCOVERY (Simplificado)
      // Se não veio boardId, pega o primeiro board que encontrar (ou cria)
      if (!boardId) {
          // Tenta achar qualquer board (removi created_by para evitar erros de schema antigo)
          const boardsRes = await pool.query('SELECT id FROM boards LIMIT 1');

          if (boardsRes.rowCount > 0) {
              boardId = boardsRes.rows[0].id;
          } else {
              // Se não existe nenhum, cria o "Meu Quadro"
              const newBoard = await pool.query(
                  'INSERT INTO boards (title, created_by) VALUES ($1, $2) RETURNING id',
                  ['Meu Quadro', userId]
              );
              boardId = newBoard.rows[0].id;
              
              // Cria as colunas padrão
              await pool.query(`
                  INSERT INTO columns (title, board_id, order_position) VALUES 
                  ('A Fazer', $1, 0),
                  ('Em Progresso', $1, 1),
                  ('Concluído', $1, 2)
              `, [boardId]);
          }
      }

      // 2. Busca as Colunas
      const columnsRes = await pool.query(
        'SELECT id, title, board_id, order_position as "order" FROM columns WHERE board_id = $1 ORDER BY order_position ASC',
        [boardId]
      );

      // 3. Busca os Cards (Query Completa - Não corte essa parte!)
      const cardsRes = await pool.query(`
        SELECT 
            k.id, k.title, k.description, k.column_id, k.rank_position,
            k.priority, k.hex_color, k.due_date, k.assignee, k.checklist, k.comments
        FROM cards k
        JOIN columns c ON k.column_id = c.id
        WHERE c.board_id = $1
        ORDER BY k.rank_position ASC
      `, [boardId]);

      // 4. Monta a resposta (Mapper)
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
            checklist: c.checklist || [],
            comments: c.comments || []
        }));

        return {
            ...col,
            cards: formattedCards,
            board_id: col.board_id 
        };
      });

      return reply.send(columns);

    } catch (error: any) {
      request.log.error(error);
      // Retorna o erro real para o navegador para facilitar o debug
      return reply.code(500).send({ 
          error: 'Erro interno no servidor', 
          details: error.message || error 
      });
    }
  });

  // --- CRIAR COLUNA ---
  app.post('/', { onRequest: [app.authenticate] }, async (request, reply) => {
    const body = createColumnBodySchema.parse(request.body);
    try {
      const countRes = await pool.query('SELECT COUNT(*) FROM columns WHERE board_id = $1', [body.boardId]);
      const nextOrder = parseInt(countRes.rows[0].count) + 1;
      const result = await pool.query(
        'INSERT INTO columns (title, board_id, order_position) VALUES ($1, $2, $3) RETURNING *',
        [body.title, body.boardId, nextOrder]
      );
      return reply.status(201).send({ ...result.rows[0], cards: [] });
    } catch (error) { return reply.status(500).send(error); }
  });

  // --- DELETAR COLUNA ---
  app.delete('/:columnId', { onRequest: [app.authenticate] }, async (request, reply) => {
    const params = deleteColumnParamsSchema.parse(request.params);
    try {
      await pool.query('DELETE FROM columns WHERE id = $1', [params.columnId]);
      return reply.status(204).send();
    } catch (error) { return reply.status(500).send(error); }
  });
};

export default columnsRoutes;