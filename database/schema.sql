--
-- PostgreSQL database dump
--

\restrict LrCl7tJRQ9bM5PfYRt05KkuOroFF9SgMu2vc4snG2w2w9aLM3kwnozJxKa5te6x

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: audit_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.audit_action AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'MOVE'
);


--
-- Name: entity_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.entity_type AS ENUM (
    'BOARD',
    'COLUMN',
    'CARD'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'ADMIN',
    'MEMBER'
);


--
-- Name: func_audit_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.func_audit_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    audit_action TEXT;
    audit_changes JSONB;
    current_user_id UUID;
BEGIN
    -- Define a ação básica
    IF (TG_OP = 'INSERT') THEN
        audit_action := 'CREATE';
        audit_changes := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        audit_action := 'UPDATE';
        audit_changes := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    ELSIF (TG_OP = 'DELETE') THEN
        audit_action := 'DELETE';
        audit_changes := to_jsonb(OLD);
    END IF;

    -- Tenta pegar o usuário da sessão
    BEGIN
        current_user_id := current_setting('lignum.current_user_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    -- Lógica de Movimento (Específico para Cards)
    IF (TG_TABLE_NAME = 'cards' AND TG_OP = 'UPDATE') THEN
        IF (NEW.column_id IS DISTINCT FROM OLD.column_id OR NEW.rank_position IS DISTINCT FROM OLD.rank_position) THEN
             audit_action := 'MOVE';
        END IF;
    END IF;

    -- Insere no log
    INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, changes)
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        audit_action, 
        current_user_id,
        audit_changes
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    action text NOT NULL,
    actor_id uuid,
    changes jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: board_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.board_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    board_id uuid,
    user_id uuid,
    role character varying(20) DEFAULT 'editor'::character varying,
    added_at timestamp without time zone DEFAULT now()
);


--
-- Name: boards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.boards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(100) NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    background_color character varying(20) DEFAULT '#1E1E1E'::character varying
);


--
-- Name: cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    column_id uuid NOT NULL,
    created_by uuid,
    title character varying(255) NOT NULL,
    description text,
    rank_position double precision DEFAULT 0 NOT NULL,
    color_theme character varying(50) DEFAULT 'default'::character varying,
    checklist jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    priority character varying(20) DEFAULT 'Média'::character varying,
    hex_color character varying(7),
    comments jsonb DEFAULT '[]'::jsonb,
    assignee character varying(100),
    due_date timestamp with time zone
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    board_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    is_pinned boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: columns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.columns (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    board_id uuid NOT NULL,
    title character varying(50) NOT NULL,
    hex_color character varying(7) DEFAULT '#E0E0E0'::character varying,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    "order" double precision DEFAULT 0,
    order_position integer DEFAULT 0
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    board_id uuid,
    user_id uuid,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    type character varying(50) NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    resource_link character varying(255),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role public.user_role DEFAULT 'MEMBER'::public.user_role,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    avatar text
);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: board_members board_members_board_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_members
    ADD CONSTRAINT board_members_board_id_user_id_key UNIQUE (board_id, user_id);


--
-- Name: board_members board_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_members
    ADD CONSTRAINT board_members_pkey PRIMARY KEY (id);


--
-- Name: boards boards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT boards_pkey PRIMARY KEY (id);


--
-- Name: cards cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: columns columns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.columns
    ADD CONSTRAINT columns_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_entity ON public.audit_logs USING btree (entity_id);


--
-- Name: idx_cards_column_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cards_column_rank ON public.cards USING btree (column_id, rank_position);


--
-- Name: idx_chat_retention_policy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_retention_policy ON public.chat_messages USING btree (created_at) WHERE (is_pinned = false);


--
-- Name: idx_messages_board_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_board_created ON public.messages USING btree (board_id, created_at DESC);


--
-- Name: cards trg_audit_cards; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_cards AFTER INSERT OR DELETE OR UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.func_audit_trigger();


--
-- Name: columns trg_audit_columns; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_columns AFTER INSERT OR DELETE OR UPDATE ON public.columns FOR EACH ROW EXECUTE FUNCTION public.func_audit_trigger();


--
-- Name: board_members board_members_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_members
    ADD CONSTRAINT board_members_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;


--
-- Name: board_members board_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_members
    ADD CONSTRAINT board_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: boards boards_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT boards_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cards cards_column_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_column_id_fkey FOREIGN KEY (column_id) REFERENCES public.columns(id) ON DELETE CASCADE;


--
-- Name: cards cards_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: chat_messages chat_messages_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: columns columns_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.columns
    ADD CONSTRAINT columns_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;


--
-- Name: columns fk_columns_boards; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.columns
    ADD CONSTRAINT fk_columns_boards FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;


--
-- Name: messages messages_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;


--
-- Name: messages messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict LrCl7tJRQ9bM5PfYRt05KkuOroFF9SgMu2vc4snG2w2w9aLM3kwnozJxKa5te6x

