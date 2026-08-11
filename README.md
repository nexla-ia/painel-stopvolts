# StopVolts — Painel Administrativo

Painel de administração do StopVolts: gestão de usuários, códigos promocionais e tarifas de energia, com autenticação restrita a administradores via Supabase.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Supabase (Auth + Postgres)
- React Router

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha com as credenciais do seu projeto Supabase
npm run dev
```

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run typecheck` — checagem de tipos
- `npm run lint` — lint
