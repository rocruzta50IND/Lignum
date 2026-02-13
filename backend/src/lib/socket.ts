import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

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

    // 1. Sala do Quadro (Para Cards e Chat)
    socket.on('join_board', (boardId) => {
      socket.join(boardId);
      console.log(`➡️ ${socket.id} entrou no quadro ${boardId}`);
    });

    // 2. Sala do Usuário (PARA NOTIFICAÇÕES PRIVADAS)
    socket.on('join_user', (userId) => {
      socket.join(userId);
      console.log(`👤 ${socket.id} entrou na sala pessoal ${userId}`);
    });

    // Sair da sala
    socket.on('leave_board', (boardId) => {
      socket.leave(boardId);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket desconectado: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket não iniciado!");
  return io;
};