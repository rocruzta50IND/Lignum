import { FastifyPluginAsync } from 'fastify';
import pool from '../database/connection';
import { getIO } from '../lib/socket';

const membersRoutes: FastifyPluginAsync = async (app) => {
  // ROTA: REMOVER MEMBRO
  app.delete('/:userId', { onRequest: [app.authenticate] }, async (req, reply) => {
    try {
        const { boardId, userId } = req.params as { boardId: string, userId: string };
        const requesterId = (req.user as any).id;

        // 1. Validar se o solicitante é o Dono (Pilar de Segurança)
        const board = await pool.query('SELECT owner_id FROM boards WHERE id = $1', [boardId]);
        
        if (!board.rows[0]) {
            return reply.status(404).send({ error: 'Quadro não encontrado.' });
        }

        // Se não for o dono e estiver tentando remover outra pessoa, bloqueia
        if (board.rows[0].owner_id !== requesterId && requesterId !== userId) {
            return reply.status(403).send({ error: 'Ação não permitida.' });
        }

        // 2. Remover do Banco de Dados (Fonte da Verdade)
        await pool.query('DELETE FROM board_members WHERE board_id = $1 AND user_id = $2', [boardId, userId]);

        // 3. ⚡ COMUNICAÇÃO EM TEMPO REAL (Pilar 2)
        const io = getIO();

        // Notifica todos no quadro para remover o avatar da UI instantaneamente
        io.to(boardId).emit('member_removed', { userId });

        // Notifica especificamente o usuário expulso para disparar o Pop-up no Board.tsx
        io.to(userId).emit('kicked_from_board', { boardId });

        /** * SEGURANÇA SOCKET: Encontra a conexão do usuário removido e o remove da sala.
         * Isso impede que ele receba novos eventos (mensagens, movimentação de cards) via stream.
         */
        const sockets = await io.in(boardId).fetchSockets();
        for (const socket of sockets) {
            // Se o socket pertencer ao usuário removido (supondo que salvamos userId no socket)
            if ((socket as any).userId === userId) {
                socket.leave(boardId);
            }
        }

        return reply.status(204).send();
    } catch (error) {
        console.error("Erro ao remover membro:", error);
        return reply.status(500).send({ error: 'Erro interno no servidor.' });
    }
  });
};

export default membersRoutes;