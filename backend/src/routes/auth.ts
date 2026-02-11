import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query } from '../database/connection';

// --- Schemas de Validação ---
const registerBodySchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Formato de e-mail inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
});

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

type RegisterBody = z.infer<typeof registerBodySchema>;
type LoginBody = z.infer<typeof loginBodySchema>;

const authRoutes: FastifyPluginAsync = async (app) => {

  // ==========================================================================
  // POST /auth/register
  // ==========================================================================
  app.post<{ Body: RegisterBody }>('/register', async (request, reply) => {
    // 1. Validação
    const bodyResult = registerBodySchema.safeParse(request.body);
    
    if (!bodyResult.success) {
      return reply.code(400).send({ 
        error: 'Dados inválidos', 
        details: bodyResult.error.format() 
      });
    }

    const { name, email, password } = bodyResult.data;

    try {
      // 2. Verificar Duplicidade
      const checkUser = await query('SELECT id FROM users WHERE email = $1', [email]);
      
      if (checkUser.rowCount > 0) {
        return reply.code(409).send({ error: 'E-mail já cadastrado.' });
      }

      // 3. Hash da Senha
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // 4. Inserir no Banco (CORREÇÃO FINAL: 'MEMBER')
      // O Enum do banco é {ADMIN, MEMBER}. Usamos MEMBER como padrão.
      const sql = `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, 'MEMBER') 
        RETURNING id, name, email, role;
      `;

      const result = await query(sql, [name, email, passwordHash]);
      const user = result.rows[0];

      // 5. Gerar Token
      const token = app.jwt.sign({ 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      });

      request.log.info(`✅ Novo usuário registrado: ${email} (Role: MEMBER)`);

      return reply.code(201).send({ user, token });

    } catch (error: any) {
      request.log.error(error);
      
      if (error.code === '23505') { 
        return reply.code(409).send({ error: 'E-mail já cadastrado.' });
      }

      // Se falhar agora, é bruxaria (ou conexão de banco), pois o Enum está correto.
      return reply.code(500).send({ error: 'Erro interno ao registrar usuário.' });
    }
  });

  // ==========================================================================
  // POST /auth/login
  // ==========================================================================
  app.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    const bodyResult = loginBodySchema.safeParse(request.body);

    if (!bodyResult.success) {
      return reply.code(400).send({ error: 'Campos inválidos.' });
    }
    const { email, password } = bodyResult.data;

    try {
      const result = await query('SELECT * FROM users WHERE email = $1', [email]);
      
      if (result.rowCount === 0) {
        return reply.code(401).send({ error: 'Credenciais inválidas.' });
      }

      const user = result.rows[0];

      if (!user.password_hash) {
        return reply.code(401).send({ error: 'Usuário sem senha definida.' });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        return reply.code(401).send({ error: 'Credenciais inválidas.' });
      }

      const token = app.jwt.sign({ 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      });

      const { password_hash, ...safeUser } = user;

      return reply.code(200).send({ user: safeUser, token });

    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Erro ao realizar login.' });
    }
  });
};

export default authRoutes;