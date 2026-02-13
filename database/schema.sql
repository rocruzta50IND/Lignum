-- ========================================================
-- 🌲 LIGNUM - BANCO DE DADOS DEFINITIVO
-- ========================================================

-- 1. LIMPEZA TOTAL (Remove tabelas antigas para evitar conflitos)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS columns CASCADE;
DROP TABLE IF EXISTS board_members CASCADE;
DROP TABLE IF EXISTS boards CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- 2. CONFIGURAÇÕES INICIAIS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. CRIAÇÃO DE TIPOS (ENUMS)
CREATE TYPE user_role AS ENUM ('ADMIN', 'MEMBER');

-- ========================================================
-- 4. CRIAÇÃO DAS TABELAS
-- ========================================================

-- Tabela de Usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- O código Backend espera este nome
    avatar TEXT,                         -- URL da imagem ou Base64
    role user_role DEFAULT 'MEMBER',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Quadros (Boards)
CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    background_color VARCHAR(20) DEFAULT '#1E1E1E',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Dono do quadro
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Membros do Quadro (Quem pode ver/editar)
CREATE TABLE board_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'editor', -- 'owner', 'editor', 'viewer'
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(board_id, user_id) -- Impede duplicidade de membro no mesmo quadro
);

-- Tabela de Colunas do Kanban
CREATE TABLE columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    title VARCHAR(50) NOT NULL,
    order_index INTEGER DEFAULT 0, -- O código usa isso para ordenar (0, 1, 2...)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Cartões (Cards)
-- Esta tabela foi reforçada com todos os campos que seu código backend usa
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    column_id UUID REFERENCES columns(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Quem criou (CRÍTICO)
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Drag & Drop
    rank_position FLOAT DEFAULT 0, -- Usamos Float para facilitar reordenação
    
    -- Detalhes Visuais
    priority VARCHAR(20) DEFAULT 'Média',
    hex_color VARCHAR(7) DEFAULT '#2C2C2C',
    
    -- Funcionalidades Extras (JSONB é mais rápido e flexível)
    checklist JSONB DEFAULT '[]'::jsonb, 
    comments JSONB DEFAULT '[]'::jsonb,
    
    -- Atribuição e Prazos
    assignee VARCHAR(100), -- Pode guardar o ID do usuário ou Nome
    due_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Chat (Mensagens)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Notificações
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'invite', 'mention', 'system'
    content TEXT NOT NULL,
    resource_link VARCHAR(255), -- Link para onde ir ao clicar (ex: /board/ID)
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================================
-- 5. ÍNDICES PARA PERFORMANCE (Opcional mas recomendado)
-- ========================================================
CREATE INDEX idx_cards_column ON cards(column_id);
CREATE INDEX idx_messages_board ON messages(board_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- Tabela de Etiquetas do Quadro
CREATE TABLE labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  title VARCHAR(50), -- Pode ser vazio (só a cor)
  color VARCHAR(20) NOT NULL, -- Hex code ou nome da cor
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Relacionamento (Muitos-para-Muitos: Card <-> Label)
CREATE TABLE card_labels (
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  label_id UUID REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);


CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL, -- Nome original do arquivo
  file_path VARCHAR(255) NOT NULL, -- Nome salvo no disco (único)
  file_type VARCHAR(50), -- image/png, application/pdf, etc.
  created_at TIMESTAMP DEFAULT NOW()
);


ALTER TABLE boards ADD COLUMN IF NOT EXISTS owner_id UUID;

-- 1. Cria a coluna de criador (se não existir)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS criador_id UUID REFERENCES users(id);

-- Define o criador como NULL para todos os cards que NÃO começam com "ROD"
-- Assim, eles sumirão do seu filtro "Meus Cards"
UPDATE cards 
SET criador_id = NULL 
WHERE title NOT LIKE 'ROD%';

