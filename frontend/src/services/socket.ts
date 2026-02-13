import { io } from 'socket.io-client';

// ATENÇÃO: Use o SEU IP AQUI (O mesmo do api.ts)
const SOCKET_URL = 'http://192.168.0.4:3000';

export const socket = io(SOCKET_URL, {
  transports: ['websocket'], // Força websocket para ser mais rápido
  autoConnect: true,
});