import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer | null = null;

export const initSocket = (server: HttpServer) => {
  console.log('🔌 Inicializando Socket.io...');
  
  io = new SocketIOServer(server, {
    cors: {
      origin: true, // Em produção: process.env.FRONTEND_URL
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Cliente conectado: ${socket.id}`);

    // Cliente entra na sala do Board
    socket.on('join_board', (boardId: string) => {
      console.log(`👤 Socket ${socket.id} entrou na sala: ${boardId}`);
      socket.join(boardId);
    });

    socket.on('disconnect', () => {
      // console.log(`❌ Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.io não foi inicializado! Chame initSocket no server.ts primeiro.");
  }
  return io;
};