-- =============================================================================
-- ARQUITETURA LIGNUM V1.0 - DATABASE INITIALIZATION SCRIPT (CORRIGIDO)
-- Autor: Gem 3 (DBA Specialist)
-- =============================================================================

-- 1. LIMPEZA (GARANTE QUE O SCRIPT POSSA SER RODADO MÚLTIPLAS VEZES)
DROP TRIGGER IF EXISTS trg_audit_cards ON cards;
DROP TRIGGER IF EXISTS trg_audit_columns ON columns;
DROP FUNCTION IF EXISTS func_audit_trigger;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS columns CASCADE;
DROP TABLE IF EXISTS boards CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS entity_type CASCADE;
DROP TYPE IF EXISTS audit_action CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- 2. EXTENSÕES
-- Ponto e vírgula crucial aqui
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. ENUMS (TIPOS PERSONALIZADOS)
CREATE TYPE user_role AS ENUM ('ADMIN', 'MEMBER');
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'MOVE');
CREATE TYPE entity_type AS ENUM ('BOARD', 'COLUMN', 'CARD');

-- =============================================================================
-- 4. TABELAS CORE
-- =============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'MEMBER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title VARCHAR(50) NOT NULL,
    hex_color VARCHAR(7) DEFAULT '#E0E0E0',
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    -- LexoRank / Indexação Fracionária
    rank_position DOUBLE PRECISION NOT NULL DEFAULT 0,
    color_theme VARCHAR(50) DEFAULT 'default',
    -- Checklist: Array de objetos JSON [{"text": "...", "isChecked": true}]
    checklist JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para performance de ordenação na coluna
CREATE INDEX idx_cards_column_rank ON cards (column_id, rank_position);

-- =============================================================================
-- 5. CHAT EFÊMERO E RETENÇÃO
-- =============================================================================

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice Parcial para o Garbage Collector (Cron Job de 72h)
CREATE INDEX idx_chat_retention_policy 
ON chat_messages (created_at) 
WHERE is_pinned = FALSE;

-- =============================================================================
-- 6. AUDITORIA (SOURCE OF TRUTH)
-- =============================================================================

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action audit_action NOT NULL,
    actor_id UUID, -- Pode ser NULL se for ação de sistema
    changes JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs (entity_id);

-- =============================================================================
-- 7. TRIGGER FUNCTION (LÓGICA AUTOMÁTICA)
-- =============================================================================

CREATE OR REPLACE FUNCTION func_audit_trigger() RETURNS TRIGGER AS $$
DECLARE
    audit_diff JSONB := '{}'::JSONB;
    r RECORD;
    col_name TEXT;
    current_actor UUID;
    op_action audit_action;
BEGIN
    -- Recupera ID do usuário da sessão (setado pelo Backend)
    BEGIN
        current_actor := current_setting('lignum.current_user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_actor := NULL;
    END;

    IF (TG_OP = 'UPDATE') THEN
        -- Detecta se foi apenas um movimento (Drag & Drop)
        IF (TG_TABLE_NAME = 'cards' AND 
           (NEW.column_id IS DISTINCT FROM OLD.column_id OR NEW.rank_position IS DISTINCT FROM OLD.rank_position)) THEN
            op_action := 'MOVE';
        ELSE
            op_action := 'UPDATE';
        END IF;

        -- Compara colunas para gerar o Delta (JSON)
        FOR r IN SELECT * FROM jsonb_each(to_jsonb(OLD)) LOOP
            col_name := r.key;
            IF col_name NOT IN ('updated_at', 'created_at') THEN
                IF (to_jsonb(NEW) -> col_name) IS DISTINCT FROM (to_jsonb(OLD) -> col_name) THEN
                    audit_diff := audit_diff || 
                        jsonb_build_object(
                            col_name, 
                            jsonb_build_object('old', to_jsonb(OLD) -> col_name, 'new', to_jsonb(NEW) -> col_name)
                        );
                END IF;
            END IF;
        END LOOP;
        
        IF audit_diff = '{}'::JSONB THEN
            RETURN NEW;
        END IF;

        INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, changes)
        VALUES (TG_TABLE_NAME, NEW.id, op_action, current_actor, audit_diff);
        
        RETURN NEW;

    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, changes)
        VALUES (TG_TABLE_NAME, NEW.id, 'CREATE', current_actor, to_jsonb(NEW));
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, changes)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', current_actor, to_jsonb(OLD));
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. APLICAÇÃO DOS TRIGGERS
CREATE TRIGGER trg_audit_cards
AFTER INSERT OR UPDATE OR DELETE ON cards
FOR EACH ROW EXECUTE FUNCTION func_audit_trigger();

CREATE TRIGGER trg_audit_columns
AFTER INSERT OR UPDATE OR DELETE ON columns
FOR EACH ROW EXECUTE FUNCTION func_audit_trigger();