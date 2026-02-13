import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import pool from '../database/connection';

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*", 
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket conectado: ${socket.id}`);

    /**
     * 🛡️ JOIN_BOARD (Pilar 3: Segurança e Integridade)
     * Valida em tempo real se o usuário pode ouvir eventos deste quadro.
     */
    socket.on('join_board', async (payload: { boardId: string; userId: string }) => {
      try {
        const { boardId, userId } = payload;

        if (!boardId || !userId) {
            console.warn(`⚠️ Tentativa de conexão WebSocket sem credenciais completas.`);
            return;
        }

        // VERIFICAÇÃO POLIMÓRFICA (Dono ou Membro)
        // Essencial para cumprir o RNF02 (Persistência e Integridade)
        const accessCheck = await pool.query(
            `SELECT 1 FROM boards b
             LEFT JOIN board_members bm ON b.id = bm.board_id
             WHERE b.id = $1 AND (b.owner_id = $2 OR bm.user_id = $2)
             LIMIT 1`,
            [boardId, userId]
        );

        if ((accessCheck.rowCount || 0) === 0) {
            console.log(`⛔ Acesso Real-time NEGADO: Usuário ${userId} no quadro ${boardId}`);
            
            // Notifica o frontend da falha de permissão
            socket.emit('error', { message: 'Acesso negado ao tempo real.' });
            socket.emit('kicked_from_board'); // Dispara o modal de expulsão no Board.tsx
            
            socket.leave(boardId);
            return;
        }

        // Se autorizado, permite a entrada na sala
        socket.join(boardId);
        console.log(`✅ Acesso Real-time AUTORIZADO: Usuário ${userId} no quadro ${boardId}`);

      } catch (error) {
        console.error("❌ Erro crítico no WebSocket join_board:", error);
      }
    });

    socket.on('join_user', (userId) => {
      socket.join(userId);
      console.log(`👤 Sala pessoal ativa: ${userId}`);
    });

    socket.on('leave_board', (boardId) => {
      socket.leave(boardId);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Conexão encerrada: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io não foi inicializado!");
  return io;
};