import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      // PERIGO/SOLUÇÃO: O '*' permite que qualquer IP (192.168...) conecte.
      // Essencial para funcionar na rede local.
      origin: "*", 
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Cliente conectado: ${socket.id}`);

    // Entrar na sala do Board
    socket.on('join_board', (boardId: string) => {
      socket.join(boardId);
      console.log(`➡️ Socket ${socket.id} entrou na sala ${boardId}`);
    });

    // Sair da sala
    socket.on('leave_board', (boardId: string) => {
      socket.leave(boardId);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io não inicializado!");
  }
  return io;
};