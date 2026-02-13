import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import path from 'path';
import { env } from './config/env';
import { query } from './database/connection';
import { initSocket } from './lib/socket';

// --- IMPORTAÇÃO DAS ROTAS ---
import authRoutes from './routes/auth';
import columnsRoutes from './routes/columns';
import cardsRoutes from './routes/cards';
import chatRoutes from './routes/chat';
import usersRoutes from './routes/users';
import notificationsRoutes from './routes/notifications';
import boardsRoutes from './routes/boards';
import labelsRoutes from './routes/labels';
import attachmentsRoutes from './routes/attachments'; // <--- A rota crítica

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport: {
      target: 'pino-pretty'
    }
  }
});

// --- PLUGINS EXTERNOS (Usando require para garantir compatibilidade) ---
// Isso resolve o erro "Plugin must be a function" sem precisar de hacks
const multipart = require('@fastify/multipart');
const fastifyStatic = require('@fastify/static');

const start = async () => {
  try {
    // 1. Configuração do CORS
    await app.register(cors, { 
      origin: true, 
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    });

    // 2. Configuração do JWT
    await app.register(jwt, {
      secret: env.JWT_SECRET || 'supersecret'
    });

    // 3. UPLOAD DE ARQUIVOS (Registra o plugin carregado via require)
    await app.register(multipart);

    // 4. ARQUIVOS ESTÁTICOS (Para acessar as imagens depois)
    await app.register(fastifyStatic, {
      root: path.join(__dirname, '../uploads'),
      prefix: '/uploads/',
    });

    // 5. Decorator de Autenticação
    app.decorate("authenticate", async function (request: any, reply: any) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    });

    // --- REGISTRO DAS ROTAS (Direto e sem wrappers) ---
    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(columnsRoutes, { prefix: '/columns' });
    await app.register(cardsRoutes, { prefix: '/cards' });
    await app.register(chatRoutes, { prefix: '/chat' });
    await app.register(boardsRoutes, { prefix: '/boards' });
    await app.register(usersRoutes, { prefix: '/users' });
    await app.register(notificationsRoutes, { prefix: '/notifications' });
    await app.register(labelsRoutes, { prefix: '/labels' });
    
    // AQUI: Se essa importação falhar, o servidor vai avisar no erro abaixo
    await app.register(attachmentsRoutes, { prefix: '/attachments' });

    // Rotas de Sistema
    app.get('/', async () => ({ status: 'online', service: 'Lignum API' }));
    app.get('/health', async () => ({ status: 'ok', database: 'connected' }));

    // --- INICIALIZAÇÃO ---
    await app.ready();
    
    initSocket(app.server); 

    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    
    console.log(`🚀 Servidor Lignum rodando em http://localhost:${env.PORT}`);
    console.log(`📂 Uploads acessíveis em http://localhost:${env.PORT}/uploads/`);
    console.log(`🔌 WebSocket Ativo`);
    
  } catch (err) {
    console.error("❌ ERRO FATAL AO INICIAR O SERVIDOR:", err);
    process.exit(1);
  }
};

start();