import { Pool, PoolClient, QueryResult } from 'pg';
import { env } from '../config/env';

// Configuração do Pool baseada em variáveis de ambiente
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20, // Limite de conexões simultâneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Eventos de monitoramento do pool
pool.on('error', (err) => {
  console.error('❌ Erro inesperado no cliente inativo do PostgreSQL', err);
  process.exit(-1);
});

/**
 * Executa uma query simples usando o pool.
 */
export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  return pool.query(text, params);
};

/**
 * Wrapper para Transações Atômicas.
 * Essencial para operações que envolvem Auditoria e Consistência (RNF04).
 * @param callback Função que recebe o cliente da transação
 * @param userId Opcional: ID do usuário para contexto de auditoria (RFO5)
 */
export const runTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>,
  userId?: string
): Promise<T> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Contexto de Auditoria: Seta a variável de sessão que a Trigger do banco lerá
    if (userId) {
      // Importante: set_config com is_local=true dura apenas até o fim da transação
      await client.query("SELECT set_config('lignum.current_user_id', $1, true)", [userId]);
    }

    const result = await callback(client);
    
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export default pool;