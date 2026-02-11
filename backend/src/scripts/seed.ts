import pool from '../database/connection';

async function seed() {
  console.log('🌱 Iniciando Seed de Recuperação (Fixing Error 500)...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Usuário Admin (Idempotente)
    const userEmail = 'demo@lignum.com';
    let userId: string;

    await client.query(`
      INSERT INTO users (name, email, role, password_hash) 
      VALUES ('Demo User', $1, 'ADMIN', 'hash_dummy')
      ON CONFLICT (email) DO NOTHING;
    `, [userEmail]);

    const userRes = await client.query('SELECT id FROM users WHERE email = $1', [userEmail]);
    userId = userRes.rows[0].id;

    // 2. Board com ID FIXO (Obrigatório para o Frontend)
    const targetBoardId = '8634798a-89ae-4600-837f-8a90404d0b27';

    await client.query(`
      INSERT INTO boards (id, title, created_by)
      VALUES ($1, 'Projeto Lignum (Demo)', $2)
      ON CONFLICT (id) DO NOTHING;
    `, [targetBoardId, userId]);
    
    console.log(`📋 Board Confirmado: ${targetBoardId}`);

    // 3. Colunas e Cards
    const columnsCheck = await client.query('SELECT id FROM columns WHERE board_id = $1', [targetBoardId]);
    
    if (columnsCheck.rowCount === 0) {
      console.log('🏗️  Criando estrutura Kanban...');
      
      const columnsData = [
        { title: 'A Fazer', color: '#64748B', order: 1 },       
        { title: 'Em Progresso', color: '#0EA5E9', order: 2 }, 
        { title: 'Concluído', color: '#22C55E', order: 3 }         
      ];

      for (const col of columnsData) {
        // Cria Coluna
        const colRes = await client.query(`
          INSERT INTO columns (board_id, title, hex_color, order_index)
          VALUES ($1, $2, $3, $4)
          RETURNING id;
        `, [targetBoardId, col.title, col.color, col.order]);

        // Cria Cards de Exemplo (Apenas na primeira coluna)
        if (col.order === 1) {
            const colId = colRes.rows[0].id;
            // Ajustado para o Schema correto: description, rank_position
            await client.query(`
                INSERT INTO cards (column_id, title, description, rank_position, created_by)
                VALUES 
                ($1, 'Configurar Ambiente', 'Rodar o seed para corrigir o erro 500', 1000, $2),
                ($1, 'Testar Frontend', 'Verificar se o board carrega com cards', 2000, $2);
            `, [colId, userId]);
        }
      }
    } else {
      console.log('⚠️  Colunas já existem. Mantendo dados atuais.');
    }

    await client.query('COMMIT');
    console.log('✅ Seed aplicado com sucesso!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro Crítico no Seed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();