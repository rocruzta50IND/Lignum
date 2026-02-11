import { Server } from 'socket.io';

let io: Server;

export const initSocket = (httpServer: any) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // Em produção, restrinja isso
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);

    // Entrar na sala do board
    socket.on('join_board', (boardId) => {
      socket.join(boardId);
      console.log(`👤 Socket ${socket.id} entrou no board ${boardId}`);
    });

    // Sair da sala
    socket.on('leave_board', (boardId) => {
      socket.leave(boardId);
    });

    socket.on('disconnect', () => {
      console.log('❌ Cliente desconectado');
    });
  });

  return io;
};

// Função para pegar a instância do IO em outros arquivos
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io não inicializado!");
  }
  return io;
};