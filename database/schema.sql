-- 1. Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Criar Tipos (Enums)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'MEMBER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabela de Usuários (A que está faltando!)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- O código espera este nome exato
    role user_role DEFAULT 'MEMBER',
    avatar TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Tabela de Quadros
CREATE TABLE IF NOT EXISTS boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    background_color VARCHAR(20) DEFAULT '#1E1E1E',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Membros do Quadro
CREATE TABLE IF NOT EXISTS board_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'editor',
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(board_id, user_id)
);

-- 6. Colunas
CREATE TABLE IF NOT EXISTS columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    title VARCHAR(50) NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Cartões (Cards)
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    column_id UUID REFERENCES columns(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'Média',
    due_date TIMESTAMP,
    rank_position FLOAT DEFAULT 0,
    checklist JSONB DEFAULT '[]',
    comments JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. Chat
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Notificações
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    resource_link VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);