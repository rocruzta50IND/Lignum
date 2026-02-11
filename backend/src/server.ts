import Fastify from 'fastify';
import cors from '@fastify/cors'; // ✅ Ajustado para o pacote moderno
import jwt from '@fastify/jwt';
import { env } from './config/env';
import { query } from './database/connection';
import { initSocket } from './lib/socket';

// Importação das rotas
import authRoutes from './routes/auth';
import columnsRoutes from './routes/columns';
import cardsRoutes from './routes/cards';
import chatRoutes from './routes/chat';

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport: {
      target: 'pino-pretty'
    }
  }
});

// 1. Configuração do CORS
app.register(cors, { 
  origin: true, 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

// 2. Configuração do JWT
app.register(jwt, {
  secret: env.JWT_SECRET || 'supersecret'
});

// 3. Decorator de Autenticação
app.decorate("authenticate", async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

// --- ROTAS DE SISTEMA ---

// Rota Raiz
app.get('/', async () => {
  return { status: 'online', service: 'Lignum API', version: '1.0.0' };
});

// Healthcheck
app.get('/health', async (request, reply) => {
  try {
    await query('SELECT NOW()');
    return { status: 'ok', database: 'connected' };
  } catch (error) {
    app.log.error(error);
    return reply.code(500).send({ status: 'error', database: 'disconnected' });
  }
});

// --- ROTAS DE NEGÓCIO ---

app.register(authRoutes, { prefix: '/auth' });
app.register(columnsRoutes, { prefix: '/columns' });
app.register(cardsRoutes, { prefix: '/cards' });
app.register(chatRoutes, { prefix: '/chat' });

// --- INICIALIZAÇÃO ---

const start = async () => {
  try {
    await app.ready();

    // Inicializa Socket.io
    initSocket(app.server); 

    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    
    console.log(`🚀 Servidor Lignum rodando em http://localhost:${env.PORT}`);
    console.log(`🌐 Rota Raiz: http://localhost:${env.PORT}/`);
    console.log(`🔌 WebSocket Ativo`);
    
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();