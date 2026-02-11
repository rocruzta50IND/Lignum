import fs from 'fs';
import path from 'path';
import pool from '../database/connection';

async function setupDatabase() {
  console.log('🔄 Iniciando configuração do Banco de Dados...');

  const client = await pool.connect();

  try {
    // Localiza o arquivo init.sql baseado na estrutura de pastas:
    // src/scripts/setup-db.ts -> sobe um nível -> entra em database/init.sql
    const initSqlPath = path.resolve(__dirname, '../database/init.sql');
    
    console.log(`📂 Lendo arquivo SQL em: ${initSqlPath}`);
    
    if (!fs.existsSync(initSqlPath)) {
      throw new Error(`Arquivo init.sql não encontrado no caminho: ${initSqlPath}`);
    }

    const sqlContent = fs.readFileSync(initSqlPath, 'utf-8');

    console.log('⚡ Executando queries...');
    
    await client.query('BEGIN');
    
    // Executa todo o conteúdo do arquivo SQL
    await client.query(sqlContent);
    
    await client.query('COMMIT');
    console.log('✅ Banco de dados configurado com sucesso! Tabelas criadas.');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro crítico ao configurar banco de dados:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end(); // Encerra a conexão para o script terminar
  }
}

setupDatabase();