# Revisão do projeto `shared-resources`

> Revisão feita em 22/10/2026 sobre o commit `57eaa65` (branch `main`).
> Nenhum arquivo de código foi alterado. Este documento é o único arquivo novo.

---

## 1. O que é o projeto

Um **sistema de reserva de recursos compartilhados** (salas e equipamentos). Pelo schema do banco, a ideia é:

- **Usuários** se cadastram e ficam com status `pending` até um **admin** aprovar (`approved`) ou reprovar (`reproved`).
- Existe um **usuário root** (admin) criado a partir de variáveis de ambiente.
- **Recursos** (`room` | `equipment`) têm quantidade e localização.
- **Reservas** ligam um usuário a um recurso num intervalo de tempo (`start_time`/`end_time`), com quantidade e uma `idempotency_key`, que evita reserva duplicada quando o cliente reenvia a requisição.
- **Refresh tokens** (com hash) indicam que a autenticação planejada é JWT com access token e refresh token.

## 2. Stacks

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | React 19, Vite 8, TypeScript 6, ESLint | Ainda é **o template padrão do Vite**, sem nada implementado |
| Backend | Node 20, **Fastify 5**, TypeScript (ts-node + nodemon) | |
| Validação | **Zod 4** + `fastify-type-provider-zod` | |
| ORM / DB | **Prisma 7.9** + **PostgreSQL 15** (schema `booking`) | |
| Segurança | bcrypt, `@fastify/rate-limit`, `@fastify/cors` | jsonwebtoken instalado mas não usado |
| Infra | Docker + Docker Compose (client, server, database) | |

## 3. Estrutura e onde o código parou

```
shared-resources/
├── docker-compose.yml          # 3 serviços: client(5173), server(5000), database(5432)
├── package.json                # ⚠️ package.json "solto" na raiz (ver §4.6)
├── client/                     # template do Vite, intocado
└── server/
    ├── server.ts               # entrypoint: valida env com Zod e faz listen
    ├── prisma.config.ts        # config do Prisma 7 (URL do banco vem daqui)
    ├── prisma/schema.prisma    # modelos users, resources, reservations, refresh_tokens
    ├── prisma/migrations/      # 1 migration (init_schema), DESATUALIZADA
    └── src/
        ├── app.ts              # ⚠️ cria DUAS instâncias do Fastify (ver §4.1)
        ├── config/cors.ts
        ├── errors/             # AppError, NotFound, Unauthorized, Forbidden, Conflict + handler global
        ├── plugins/prisma.plugin.ts
        ├── utils/hash.ts       # bcrypt
        ├── utils/pagination.util.ts   # ⚠️ INCOMPLETO, não compila
        └── modules/
            ├── users/          # criar usuário + criar root
            └── acessRequest/   # pedidos de acesso (cadastro pendente / aprovação)
```

**Onde parou:** o último commit começou uma paginação por cursor (`paginateWithCursor`) e a parou no meio (`const queryArgs` sem valor). O módulo `acessRequest` já tem o service com `create`, `findMany`, `findById`, `update`, `updateAcessRequest` e `delete`, mas o controller só expõe `create` e `findMany`, e **nenhuma rota está registrada no app**.

Na prática, **o backend sobe, mas não tem nenhuma rota funcionando**. Nem o `/health` responde (ver §4.1).

---

## 4. Problemas encontrados

Legenda: 🔴 impede o funcionamento · 🟠 bug de lógica ou segurança · 🟡 configuração ou qualidade

### 4.1 🔴 `app.ts`: o servidor que sobe é a instância errada
`src/app.ts` cria duas instâncias:
- `const fastify = Fastify()` (linha 16): só tem CORS e **é a que é exportada por padrão**.
- `buildApp()` (linha 21): tem error handler, Prisma, rate limit, compiladores Zod e `/health`, mas **nunca é chamada**.

`server.ts` importa o default e faz `listen`. Resultado: o servidor sobe sem Prisma, sem error handler, sem rate limit, sem logger e sem rotas. Além disso, `usersRoutes` e `acessRequestRoutes` **nunca recebem `register`**.

**Correção:** manter só `buildApp()`, registrar CORS e as rotas dentro dela (`app.register(usersRoutes, { prefix: '/users' })` etc.) e, no `server.ts`, fazer `const app = buildApp()`.

### 4.2 🔴 Prisma 7 sem driver adapter
A partir do Prisma 7, o `PrismaClient` **exige um driver adapter**. O próprio client gerado em `node_modules/.prisma/client/index.d.ts` diz: *"A driver adapter is required"*. Em `prisma.plugin.ts`, o código faz `new PrismaClient({ log: [...] })` sem adapter, então a criação do client vai falhar em runtime.

**Correção:**
```bash
npm i @prisma/adapter-pg pg
```
```ts
import { PrismaPg } from '@prisma/adapter-pg';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
```
Outros pontos do Prisma:
- `generator client { provider = "prisma-client-js" }` é o gerador legado. No Prisma 7 o recomendado é `provider = "prisma-client"` com `output = "../src/generated/prisma"`. O `server/.gitignore` já ignora essa pasta, o que sugere que essa era a intenção.
- `previewFeatures = ["multiSchema"]` não é mais necessário, porque o recurso já é estável.
- `@prisma/client` está em `devDependencies`, mas deveria estar em `dependencies`.
- O padrão `globalForPrisma` (cache no `globalThis`) é coisa de Next.js e aqui é desnecessário. O log `'query'` sempre ligado gera muito ruído.

### 4.3 🔴 A migration não bate com o `schema.prisma` (drift)
A única migration (`20260806144648_init_schema`) é anterior aos commits que mudaram o schema (`user status column add` etc.). O `docker-compose` roda `prisma migrate deploy`, que **só aplica migrations existentes**, então o banco fica diferente do código:

| Item | Migration (banco real) | schema.prisma (código) |
|---|---|---|
| Enum `user_status` | `('active','inactive')` | `pending, approved, reproved` |
| Enum `user_is_active` | **não existe** | `active, inactive` |
| Coluna `users.status` | **não existe** | `UserStatus @default(pending)` |
| Coluna `users.isactive` | tipo `user_status` | tipo `user_is_active` |
| Schema dos enums | criados em `public` (sem prefixo) | `@@schema("booking")` |
| `role`, `type`, `status` | nullable | NOT NULL |

Consequência: qualquer `prisma.users.create` com `status` quebra com erro de coluna inexistente.

**Correção:** como o projeto está no início, o mais simples é apagar a pasta `migrations/` e rodar `npx prisma migrate dev --name init` com o banco zerado (`docker compose down -v`). Se não quiser perder dados, use `npx prisma migrate dev --name add_user_status` para gerar a diferença.

Outros pontos do schema:
- `@@index([token_hash])` é redundante com `@unique`, que já cria um índice.
- Os comentários `/// This table contains check constraints` vieram de um `db pull`, mas **não existe nenhum CHECK** na migration. Faltam `end_time > start_time`, `quantity > 0` e `quantity_reserved > 0`.
- `updated_at` usa `@default(now())` e não `@updatedAt`, então **nunca é atualizado**.
- `reservations.user_id`, `resource_id` e `quantity_reserved` são opcionais, mas uma reserva sem usuário ou sem recurso não faz sentido. Deveriam ser obrigatórios.
- `created_at` é opcional (`DateTime?`) sem necessidade.
- Não há nenhuma proteção contra **reservas sobrepostas** (ver §6, fase 4).

### 4.4 🟠 Controllers não fazem `await` no service
`users.controller.ts:41` e `acessRequest.controller.ts:17`:
```ts
const newUser = usersService.create(data, prisma);   // falta await
```
- A resposta retorna `201` com `user: {}`, porque uma Promise vira objeto vazio no JSON.
- Se o e-mail já existe, o `ConflictError` vira uma **rejeição não tratada**, e o cliente recebe `201` mesmo assim.

### 4.5 🟠 Classes de erro não estendem `Error` nem `AppError`
`appError.ts` define 5 classes independentes, nenhuma com `extends Error`. Isso causa vários problemas:
- Sem stack trace.
- Nos controllers, `catch (error) { if (error instanceof AppError) ... }` **não captura `ConflictError`**, porque ele não é subclasse de `AppError`.
- `acessRequest.service.ts` usa `new AppError('Usuário não encontrado', 404)` em vez de `NotFoundError`.
- No `errorHandler`, o fallback final sempre devolve **500**. Isso também transforma o **429 do rate limit em 500**, porque o objeto que o `errorResponseBuilder` gera passa pelo error handler. O correto é usar `error.statusCode ?? 500`.
- `error instanceof ZodError` não pega erros de validação do `fastify-type-provider-zod`, que chegam como `FastifyError` com `error.validation`. Hoje isso não importa porque as rotas não declaram `schema`, mas vai importar.
- `error.format()` está depreciado no Zod 4. Use `z.treeifyError(error)`.

**Sugestão:**
```ts
export class AppError extends Error {
  constructor(message: string, public readonly statusCode = 400, public readonly code = 'APP_ERROR') { super(message); this.name = new.target.name; }
}
export class NotFoundError extends AppError { constructor(m: string) { super(m, 404, 'NOT_FOUND_ERROR'); } }
// ...
```
Depois disso, os `try/catch` dos controllers podem ser removidos. Basta deixar o erro subir para o handler global.

### 4.6 🟠 Módulo `acessRequest`: bugs de lógica
- **`findMany` vaza `password_hash`**: `prisma.users.findMany()` sem `select` devolve todos os campos, incluindo o hash da senha. Também não filtra por `status: 'pending'` e não tem paginação.
- **`findMany` no controller engole erros**: no `catch`, se o erro não for `AppError`, não retorna nada nem relança, e a requisição fica sem resposta.
- **Enum com grafia diferente**: o Zod aceita `"repproved"`, mas o Prisma e o banco usam `"reproved"`. Aprovar com `repproved` causa erro do Prisma.
- **`update()` está quebrado**: `data: { data, status: data.status = "pending" }` passa um campo `data` dentro de `data`, o que é argumento inválido para o Prisma. Além disso, força o status para `pending` em qualquer edição e recebe o DTO de criação (que inclui a senha em texto).
- **`status: data.status = "pending"`** (em `create` também) é uma *atribuição* que muta o objeto de entrada. Funciona por acaso. O correto é `status: "pending"`.
- **O schema exige que o cliente envie `role` e `status`**, que depois são ignorados. Isso confunde quem consome a API, e o campo `role` no cadastro público é perigoso se um dia for usado. Remova os dois do schema de cadastro.
- O campo se chama `password_hash`, mas recebe a **senha em texto**. Use `password`, como no módulo users.
- `name`: `.min(1)` com mensagem "mínimo 3 caracteres", e `.max(200)`, mas a coluna é `VARCHAR(100)`. Um nome entre 101 e 200 caracteres passa no Zod e quebra no banco.
- `findById` não retorna `status`.
- `delete` faz hard delete, mas `refresh_tokens` e `reservations` têm FK `NO ACTION`, então dá erro se o usuário tiver reservas. Já existe o enum `isActive` (`active/inactive`): use **soft delete**.
- Rota `GET /root` para listar pedidos é um nome confuso. Algo como `GET /access-requests?status=pending` é mais claro.
- Imports não usados: `PrismaClient` no controller, `FastifyBaseLogger` e `UserStatus` no service.

### 4.7 🟠 Módulo `users`: bugs de lógica e segurança
- **`POST /users/root` é público**: qualquer pessoa pode disparar a criação do root. Isso deveria rodar **no boot** (hook `onReady`) ou num **seed** (`prisma db seed`), não numa rota.
- **O root é criado com status `pending`** (o default), então o admin nasce não aprovado. É preciso passar `status: "approved"`.
- `logger.info("Usuário root criado com sucesso")` vem **depois do `return`** e nunca executa.
- O `catch (error: any)` só loga, e o controller responde "verificado com sucesso" mesmo quando falhou.
- `createUserSchema` exige `role`, mas o service ignora. Se a intenção é o admin escolher o cargo, o valor tem que ser repassado.
- `users.create` e `acessRequest.create` são **praticamente iguais**. Defina responsabilidades: `access-requests` para o cadastro público (pending) e `users` para o admin gerenciar usuários (já aprovados, escolhe o role).
- O padrão "`findUnique` e depois `create`" tem **condição de corrida**. O certo é deixar o `@unique` do e-mail agir e capturar o erro `P2002` do Prisma, convertendo em `ConflictError`.

### 4.8 🟡 `server.ts` e variáveis de ambiente
- O `dotenv` é carregado 3 vezes (`server.ts`, `app.ts`, `prisma.config.ts`). Em `server.ts`, o `dotenv.config()` roda **depois** do `import` do app, porque imports são içados. Centralize num `src/config/env.ts` que valida e exporta `env`, e importe esse arquivo primeiro.
- O `envSchema` não valida `ROOT_USER_EMAIL` e `ROOT_USER_PASSWORD`, nem as futuras `JWT_SECRET` e `JWT_REFRESH_SECRET`.
- `z.string().url()` está depreciado no Zod 4 (use `z.url()`).
- `console.log` em vez de `app.log.info`.
- `cors.ts` lê `NODE_ENV` mas não usa. `productionOrigins` está vazio e não é usado. `origin: "*"` é aceitável só em dev.
- **Não existe `.env.example`.** Quem clonar o repo não sabe quais variáveis criar, e o `docker compose up` falha porque `env_file` aponta para arquivos inexistentes. O `.gitignore` já tem a exceção `!.env.example`.

### 4.9 🟡 Dependências
- **Faltam no `server/package.json`**: `zod` e `fastify-plugin`. Hoje funcionam só porque vieram como dependência transitiva. Se a árvore mudar, o projeto quebra.
- **Instaladas e não usadas** (algumas são do Express, não do Fastify): `cors` e `@types/cors` (já existe `@fastify/cors`), `helmet` (o equivalente é `@fastify/helmet`), `multer` (o equivalente é `@fastify/multipart`), `winston` (o Fastify já usa pino), `axios` (o backend não chama API externa).
- `jsonwebtoken`: para o Fastify, considere `@fastify/jwt`.
- O `node_modules` local tem **TypeScript 7.0.2**, mas o `package-lock.json` fixa `5.9.3`. O `node_modules` está fora de sincronia. Rode `npm ci`.
- Falta o script `build`/`start` de produção. Hoje só existe `dev` com ts-node.
- **`package.json` e `package-lock.json` na raiz** têm `@fastify/cors`, `@fastify/rate-limit` (v10, enquanto o server usa v11) e `vite`. Parecem ter sido instalados por engano na pasta errada. Se a ideia não for um monorepo com *npm workspaces*, apague os dois.

### 4.10 🟡 `docker-compose.yml` e Dockerfiles
1. **`command: ... npm run dev -- --host` no server** (e o mesmo no `CMD` do `server/Dockerfile`): `--host` é flag do **Vite**, não do nodemon/ts-node. Ela é repassada para o `server.ts` e não faz nada. O `listen` já usa `0.0.0.0`. Remova.
2. **O client não tem `.dockerignore`**: o `COPY . .` copia o `node_modules` do Windows para a imagem Linux, por cima do que o `npm install` instalou. Binários nativos (rolldown/esbuild do Vite 8) quebram. Em dev o volume anônimo `/app/node_modules` esconde o problema, mas a imagem em si fica inválida.
3. **O `.env` não está no `.dockerignore`** (nem no server, nem no client), então as credenciais vão para dentro da imagem.
4. **Hot reload no Windows**: bind mounts (`./server:/app`) não propagam eventos de arquivo no Docker Desktop/Windows. O nodemon precisa de `--legacy-watch` (ou `-L`) e o Vite precisa de `server.watch.usePolling: true`. Sem isso, salvar o arquivo não reinicia nada.
5. **Volume anônimo `/app/node_modules`**: quando o `package.json` mudar, o volume antigo continua lá. Use `docker compose up --build -V` (`--renew-anon-volumes`).
6. **Node 20 chegou ao fim do suporte (EOL) em abril de 2026.** Use `node:22-alpine` ou `node:24-alpine`. Prisma 7 e Vite 8 já exigem Node ≥ 20.19.
7. **As variáveis do banco estão duplicadas** no `.env` da raiz (usado pela interpolação do compose e pelo serviço `database`) e no `server/.env`. É fácil uma divergir da outra. O `DATABASE_URL` do `environment` sobrescreve o do `server/.env` (que aponta para `localhost`, correto só fora do Docker). Isso funciona, mas documente.
8. O `prisma generate` em todo start do container deixa o boot lento. O ideal é rodar no build da imagem (`RUN npx prisma generate`).
9. O server não tem `healthcheck`, então o `depends_on` do client só garante ordem, não disponibilidade. Depois de corrigir o `/health` (§4.1), dá para usá-lo no healthcheck.
10. `restart: always` (db) e `unless-stopped` (client/server) são inconsistentes. Detalhe pequeno.
11. Esse compose é **só para desenvolvimento**. Para produção, você vai precisar de Dockerfile multi-stage (build TS → `node dist/server.js`), client buildado e servido por nginx, e sem bind mounts.

### 4.11 🟡 Qualidade geral
- **Erro de grafia "acess"** em tudo (pastas, classes, schemas). O correto é **"access"**. Vale renomear agora, enquanto o código é pequeno.
- Classes com nome em minúsculo (`class acessRequestController`).
- `pagination.util.ts` não compila (`tsc` falha). Hoje não quebra o runtime porque ninguém importa o arquivo, mas está no `main`.
- Os métodos do controller são passados sem bind (`app.post('/', controller.createUser)`). Hoje funciona porque não usam `this`, mas vai quebrar no dia em que usarem.
- As rotas não declaram `schema` do Zod. Os controllers fazem `parse` manual, então o `fastify-type-provider-zod` configurado não está sendo aproveitado.
- Não há testes, lint nem formatter no server. `README.md` está vazio. `.vscode/settings.json` está vazio.
- O client é 100% template. `VITE_API_URL` existe mas não é usado.

---

## 5. Resumo das prioridades

| # | O que fazer | Severidade |
|---|---|---|
| 1 | Usar `buildApp()` e registrar as rotas (§4.1) | 🔴 |
| 2 | Adicionar o adapter `@prisma/adapter-pg` (§4.2) | 🔴 |
| 3 | Regerar a migration para alinhar com o schema (§4.3) | 🔴 |
| 4 | Pôr `await` nos controllers (§4.4) | 🟠 |
| 5 | Fazer os erros estenderem `Error`/`AppError` e o fallback usar `statusCode` (§4.5) | 🟠 |
| 6 | Tirar `password_hash` do `findMany` e corrigir `reproved` e `update()` (§4.6) | 🟠 |
| 7 | Root criado no boot com `approved`, sem rota pública (§4.7) | 🟠 |
| 8 | Adicionar `zod` e `fastify-plugin`, remover dependências mortas e o package.json da raiz (§4.9) | 🟡 |
| 9 | Corrigir compose e Dockerfiles: `--host`, `.dockerignore`, polling, Node 22 (§4.10) | 🟡 |
| 10 | Criar `.env.example` e README (§4.8) | 🟡 |

---

## 6. Próximos passos (roadmap)

### Fase 0: Deixar o projeto de pé (itens 1 a 10 da tabela acima)
Meta: `docker compose up --build` sobe tudo, `GET /health` responde `UP` e `tsc --noEmit` passa sem erros.

Checklist:
- [ ] `npm ci` em `server/` e `client/`
- [ ] `.env.example` na raiz, em `server/` e em `client/`
- [ ] `src/config/env.ts` centralizando dotenv e validação Zod
- [ ] `app.ts` com uma só instância, registrando cors, helmet, rate-limit, prisma, errorHandler e rotas com prefixo
- [ ] Prisma 7 com adapter pg, gerador `prisma-client` e migration nova
- [ ] Seed (`prisma/seed.ts`) ou hook `onReady` criando o root `admin`/`approved`
- [ ] Renomear `acess` → `access`
- [ ] Remover ou terminar `pagination.util.ts`

### Fase 1: Autenticação
- [ ] `POST /auth/login`: valida e-mail e senha (`bcrypt.compare`) e **só deixa logar se `status === 'approved'` e `isActive === 'active'`**
- [ ] Access token JWT de curta duração (~15 min) com `sub`, `role`
- [ ] Refresh token opaco e aleatório, salvo como **hash** em `refresh_tokens`, com rotação a cada uso e revogação no logout
- [ ] `POST /auth/refresh` e `POST /auth/logout`
- [ ] Hooks `authenticate` (verifica o JWT) e `authorize('admin')` (verifica o role)
- [ ] Rate limit mais rígido em `/auth/login` (contra força bruta)

### Fase 2: Usuários e pedidos de acesso
- [ ] `POST /access-requests` (público): cadastro, sempre com `status=pending` e `role=user`
- [ ] `GET /access-requests?status=pending&cursor=...` (admin): paginação por cursor e `select` sem senha
- [ ] `PATCH /access-requests/:id` (admin): `{ status: 'approved' | 'reproved' }`
- [ ] `GET /users`, `GET /users/me`, `PATCH /users/me` (nome, foto, senha com confirmação da senha atual)
- [ ] `PATCH /users/:id` (admin): role e isActive. **Soft delete** em vez de `DELETE`
- [ ] Terminar `paginateWithCursor` (padrão: `take: limit + 1`, `cursor: { id }`, `skip: 1`, `orderBy: { created_at, id }`)

### Fase 3: Recursos (salas e equipamentos)
- [ ] CRUD `/resources` (escrita só para admin, leitura para qualquer autenticado)
- [ ] Filtros por `type`, `status`, `location`
- [ ] CHECK `quantity > 0` (adicione o SQL manualmente na migration)

### Fase 4: Reservas (o núcleo do sistema)
- [ ] `POST /reservations` com header `Idempotency-Key` (já existe a coluna `idempotency_key`)
- [ ] Regras: `end_time > start_time`, não pode reservar no passado, `quantity_reserved ≤ resource.quantity`, recurso ativo, usuário aprovado
- [ ] **Concorrência e sobreposição**: dentro de `prisma.$transaction` com isolamento `Serializable` (ou `SELECT ... FOR UPDATE` no recurso), somar `quantity_reserved` das reservas ativas que se sobrepõem (`start_time < novoFim AND end_time > novoInicio`) e recusar se passar de `quantity`. Para salas com quantidade 1, uma *exclusion constraint* no Postgres (`EXCLUDE USING gist (resource_id WITH =, tstzrange(start_time,end_time) WITH &&) WHERE (status='active')`) resolve no próprio banco.
- [ ] `GET /reservations/me`, `GET /resources/:id/availability?from=&to=`
- [ ] `PATCH /reservations/:id/cancel` (dono ou admin)
- [ ] Tornar `user_id` e `resource_id` obrigatórios e `updated_at` com `@updatedAt`

### Fase 5: Frontend
- [ ] Limpar o template; adicionar React Router, TanStack Query, um cliente HTTP usando `VITE_API_URL`, e uma lib de UI
- [ ] Telas: login, cadastro (pedido de acesso), painel admin (aprovar usuários, CRUD de recursos), lista de recursos e calendário de disponibilidade, minhas reservas
- [ ] Gerenciar o access token em memória e o refresh token em cookie httpOnly (exige ajustar o CORS com `credentials: true` e origins explícitas)

### Fase 6: Qualidade e produção
- [ ] Testes: Vitest + `app.inject()` do Fastify, com banco de teste em container
- [ ] ESLint + Prettier no server; CI no GitHub Actions (lint, tsc, test)
- [ ] Dockerfiles multi-stage de produção e `docker-compose.prod.yml`
- [ ] Documentação da API com `@fastify/swagger` (gerada a partir dos schemas Zod)
- [ ] README com o passo a passo para rodar
