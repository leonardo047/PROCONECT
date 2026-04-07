# ConectPro

Plataforma que conecta clientes a profissionais de construção e serviços.

## Tecnologias

- **Frontend**: React 18, Vite, TailwindCSS, Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Pagamentos**: Stripe

## Configuração

### 1. Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure as variáveis:

```bash
cp .env.example .env
```

Variáveis necessárias:
- `VITE_SUPABASE_URL` - URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY` - Chave pública (anon) do Supabase

### 2. Instalação

```bash
npm install
```

### 3. Desenvolvimento

```bash
npm run dev
```

### 4. Build

```bash
npm run build
```

## Estrutura do Projeto

```
src/
├── API/                    # Cliente de compatibilidade com API
├── componentes/            # Componentes React reutilizáveis
│   ├── agendamentos/      # Componentes de agendamento
│   ├── avaliações/        # Componentes de avaliação
│   ├── bater papo/        # Componentes de chat
│   ├── citações/          # Componentes de orçamentos
│   ├── interface do usuário/  # Componentes UI base
│   ├── notificações/      # Componentes de notificação
│   ├── procurar/          # Componentes de busca
│   └── profissional/      # Componentes de perfil profissional
├── lib/                    # Bibliotecas e contextos
│   ├── supabase.js        # Cliente Supabase
│   ├── entities.js        # Serviços de entidades
│   ├── storage.js         # Upload de arquivos
│   └── AuthContext.jsx    # Contexto de autenticação
├── pages/                  # Páginas da aplicação
└── utils/                  # Funções utilitárias
```

## Banco de Dados

### Tabelas Principais

- `profiles` - Perfis de usuários (extende auth.users)
- `professionals` - Profissionais cadastrados
- `categories` - Categorias de serviços
- `quote_requests` - Solicitações de orçamento
- `quote_responses` - Respostas de orçamento
- `appointments` - Agendamentos
- `reviews` - Avaliações
- `notifications` - Notificações
- `messages` - Mensagens de chat
- `availability` - Disponibilidade semanal
- `daily_availability` - Disponibilidade diária

## Autenticação

A autenticação é gerenciada pelo Supabase Auth. Suporta:
- Email/Senha
- Google OAuth
- Reset de senha

## Storage

Upload de arquivos via Supabase Storage:
- `photos` - Fotos de trabalhos (público)
- `avatars` - Fotos de perfil (público)
- `documents` - Documentos (privado)

## Scripts

- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build de produção
- `npm run lint` - Verificação de linting
- `npm run preview` - Preview do build
