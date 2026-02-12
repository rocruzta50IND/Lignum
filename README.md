🌲 Lignum - Project Management Tool

O Lignum é uma plataforma moderna de gerenciamento de projetos inspirada no método Kanban.
Permite organizar tarefas em quadros, colaborar em tempo real via chat, gerenciar membros, notificações e manter auditoria de ações.

Sistema desenvolvido com foco em performance, escalabilidade e arquitetura moderna.

🚀 Tecnologias
🔹 Backend

Node.js com Fastify

TypeScript

PostgreSQL

Socket.io

Zod

JWT

🔹 Frontend

React (Vite)

TypeScript

Tailwind CSS

Socket.io Client

React Router DOM

🛠️ Pré-requisitos

Antes de começar, você precisa ter instalado:

Node.js (v18+)

NPM ou Yarn

PostgreSQL

Git

📦 Clonar o Projeto
git clone https://github.com/rocruzta50IND/Lignum
cd Lignum

🗄️ Configuração do Banco de Dados

O projeto inclui o arquivo database/schema.sql, que contém toda a estrutura do banco.

Ele cria automaticamente:

Extensão uuid-ossp

Tipos ENUM personalizados

Todas as tabelas do sistema

Relações (Foreign Keys)

Índices e constraints

O banco será criado vazio, mas totalmente funcional.

▶️ Inicializar Banco via PowerShell (Recomendado)
1️⃣ Criar banco
createdb -U postgres lignum

2️⃣ Importar estrutura

Estando na raiz do projeto:

psql -U postgres -d lignum -f .\database\schema.sql


Pronto.
Banco configurado.

🖥️ Alternativa via pgAdmin

Criar banco lignum

Abrir Tools → Query Tool

Abrir database/schema.sql

Executar

⚠ Se usar Query Tool, remova estas linhas antes de executar:

\restrict ...
\unrestrict ...

🔐 Configuração do Backend
📄 Criar arquivo .env

Dentro da pasta backend, crie:

# Configuração do Servidor
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
DATABASE_URL="postgres://postgres:admin123@localhost:5432/lignum"
JWT_SECRET="segredo_super_seguro_para_desenvolvimento_lignum_v1_2026"

📦 Instalar Dependências
Backend
cd backend
npm install

Frontend
cd ../frontend
npm install

▶️ Executar Projeto
Iniciar Backend
cd backend
npm run dev
para redes externas usar:
npm run dev -- --host 0.0.0.0


Servidor disponível em:

http://localhost:5173

Iniciar Frontend

Em outro terminal:

cd frontend
npm run dev



Aplicação disponível em:

http://localhost:5173

🔌 Comunicação em Tempo Real

O sistema utiliza Socket.io para:

Chat em tempo real

Atualização automática de boards

Notificações instantâneas

📁 Estrutura do Projeto
Lignum/
├ backend/
├ frontend/
├ database/
│   └ schema.sql
└ README.md

✅ Resultado Esperado

Após seguir os passos:

✔ Banco criado
✔ Estrutura aplicada
✔ Backend rodando
✔ Frontend funcionando
✔ Sistema pronto para uso

🔒 Segurança

Autenticação JWT

Validação com Zod

Cookies HTTPOnly

Controle de permissões

Auditoria de ações