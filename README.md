# 🎬 Catálogo de Filmes — Tom Hanks (Microsserviços Desacoplados)

> Atividade Prática 3 da disciplina **ISW055 - Introdução à Computação em Nuvem**  
> Professor: **Allan Siriani** ([@siriani](https://github.com/siriani))

---

## 📌 Visão Geral da Atividade 3

Nesta atividade, a arquitetura da **Atividade 2 (monólito)** foi evoluída para uma **arquitetura de microsserviços desacoplados**. Toda a lógica de gestão de usuários e autenticação (**login, cadastro, emissão de JWT, papéis de usuário `role` e recuperação de senha**) foi isolada no microsserviço independente (**`auth-service`**), que opera exclusivamente na rede interna do Docker **sem qualquer porta publicada para o host**.

O container do **`catálogo`** atua como único ponto de entrada público para o usuário final, consumindo a API do TMDB e delegando a autenticação e recuperação de senha internamente para o `auth-service`.

```
               ┌─────────────────────────────────────────────────────────────┐
               │              Rede Docker Interna (app-network)              │
               │                                                             │
┌─────────────┐│   ┌───────────────────────┐     ┌───────────────────────┐   │
│  Navegador  ││   │  Catálogo + Backend   │     │     auth-service      │   │
│ (Usuário)   │┼──>│ (Ponto Único Público) │────>│ (Auth, Roles, Senha)  │   │
│             ││   │     Porta :3000       │HTTP │ (SEM PORTA NO HOST)   │   │
└─────────────┘│   └───────────────────────┘     │     Porta :4000       │   │
               │               │                 └───────────────────────┘   │
               └───────────────┼─────────────────────────────┼───────────────┘
                               │                             │
                               ▼                             ▼
                     ┌───────────────────────────────────────────────┐
                     │                    MariaDB                    │
                     │  (usuarios, reset_tokens, favoritos, coment.) │
                     └───────────────────────────────────────────────┘
                                                             │
                                                             ▼
                                                 ┌───────────────────────┐
                                                 │     SMTP Externo      │
                                                 │         Brevo         │
                                                 └───────────────────────┘
```

---

## 🐳 Docker Compose: Dois Serviços e Rede Compartilhada

O arquivo [`docker-compose.yml`](docker-compose.yml) orquestra os **dois serviços desacoplados** da aplicação conectados através da rede compartilhada `app-network`:

```yaml
version: '3.8'

# ==============================================================================
# ISW055 - Atividade 3: Microsserviço de Autenticação (Serviços Desacoplados)
# Arquitetura: 2 containers em rede interna isolada
# Autenticação e Usuários: Gerenciados pelo Microsserviço auth-service (Login, Cadastro, Roles, SMTP/Tokens)
# Catálogo & TMDB: Gerenciados pelo container catalogo (Backend + Frontend)
# Ponto de entrada público: APENAS o container do catálogo (porta 3000)
# ==============================================================================

services:
  # 1. Container do Catálogo (Frontend SPA + Backend TMDB/Favoritos/Comentários) - Único com porta pública
  catalogo:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - PORT=3000
      - AUTH_SERVICE_URL=http://auth-service:4000
      - DB_HOST=${DB_HOST:-mariadb}
      - DB_PORT=${DB_PORT:-3306}
      - DB_USER=${DB_USER:-aluno}
      - DB_PASSWORD=${DB_PASSWORD:-alunosenha}
      - DB_NAME=${DB_NAME:-catalogo_filmes}
      - TMDB_API_KEY=${TMDB_API_KEY}
      - JWT_SECRET=${JWT_SECRET:-chave_jwt_secreta_local_dev}
    depends_on:
      - auth-service
    networks:
      - app-network
    restart: unless-stopped

  # 2. Microsserviço de Troca de Senha (Geração de Tokens, Envio de E-mail SMTP e Redefinição)
  # ATENÇÃO: Sem 'ports' publicado pro host - acessível APENAS via rede Docker interna
  auth-service:
    build:
      context: ./auth-service
      dockerfile: Dockerfile
    expose:
      - "4000"
    environment:
      - PORT=4000
      - DB_HOST=${DB_HOST:-mariadb}
      - DB_PORT=${DB_PORT:-3306}
      - DB_USER=${DB_USER:-aluno}
      - DB_PASSWORD=${DB_PASSWORD:-alunosenha}
      - DB_NAME=${DB_NAME:-catalogo_filmes}
      - JWT_SECRET=${JWT_SECRET:-chave_jwt_secreta_local_dev}
      - APP_URL=${APP_URL:-http://localhost:3000}
      - SMTP_HOST=${SMTP_HOST:-smtp-relay.brevo.com}
      - SMTP_PORT=${SMTP_PORT:-587}
      - SMTP_USER=${SMTP_USER:-}
      - SMTP_PASS=${SMTP_PASS:-}
      - SMTP_FROM=${SMTP_FROM:-Catálogo Filmes <noreply@catalogofilmes.com>}
      - BREVO_API_KEY=${BREVO_API_KEY:-}
    networks:
      - app-network
    restart: unless-stopped

networks:
  app-network:
    driver: bridge
```

---

## 🔒 Confirmação de Isolamento: Serviço de Autenticação Sem Porta no Host

> [!IMPORTANT]
> **Confirmação de Segurança e Desacoplamento:**
> - O container **`auth-service` NÃO possui a diretiva `ports:` configurada**.
> - Ele utiliza exclusivamente **`expose: ["4000"]`**, o que significa que a porta 4000 **NÃO é publicada/mapeada para a máquina host nem para a internet**.
> - O acesso ao `auth-service` ocorre **estritamente de forma interna** pelo container `catalogo` via DNS interno do Docker: `http://auth-service:4000`.
> - O único container com porta aberta para o host é o **`catalogo`** (`ports: - "${PORT:-3000}:3000"`), garantindo que todo o tráfego externo passe pelo ponto de entrada controlado.

### 📋 Tabela Comparativa de Exposição de Portas

| Serviço | Porta Interna | Publicada no Host (`ports`)? | Acessível Externamente? | Comunicação Permitida |
|---|---|---|---|---|
| **`catalogo`** | `3000` | **Sim** (`${PORT:-3000}:3000`) | **Sim** (Navegador / Portainer) | Usuário final ↔ Aplicação |
| **`auth-service`** | `4000` | **NÃO** (apenas `expose: 4000`) | **NÃO** (Bloqueada pro host) | Apenas interna via `app-network` (`http://auth-service:4000`) |

---

## 📸 Demonstração Prática dos Fluxos

### 1. Fluxo Completo de Esqueci a Senha (Pedido → E-mail Brevo → Link Usado → Senha Trocada)

O fluxo de recuperação de senha segue um ciclo completo e seguro:
1. **Pedido**: O usuário acessa a aba *"Recuperar Senha"* no Catálogo e informa seu e-mail cadastrado (`ftanaka91@gmail.com`).
2. **Geração Segura**: O `auth-service` gera um token criptográfico aleatório de 32 bytes (64 caracteres hexadecimais), grava na tabela `reset_tokens` com validade estrita de 30 minutos (`DATE_ADD(NOW(), INTERVAL 30 MINUTE)`) e status `usado = FALSE`.
3. **E-mail Recebido (Brevo)**: O e-mail transacional é enviado via Brevo (SMTP ou API REST) para o e-mail real do usuário contendo o botão estilizado *"Redefinir Minha Senha"* apontando para o link único `/#reset-token=<token>`.
4. **Link Usado e Validado**: Ao abrir o link, o frontend consulta o `auth-service` (`GET /api/auth/verify-reset-token/:token`), que confirma que o token é válido, pertence ao usuário e ainda não expirou, exibindo a mensagem: *"Link verificado com sucesso! Digite sua nova senha abaixo."*
5. **Senha Trocada**: O usuário digita a nova senha, que é criptografada com `bcrypt` (10 rounds de salt) no MariaDB, o token é marcado como `usado = TRUE` para prevenir reutilização e o acesso é liberado com sucesso.

![Fluxo Completo de Recuperação de Senha: E-mail e Redefinição no Catálogo](docs/Group%203.png)

---

### 2. Tentativas Recusadas: Link Expirado (> 30 Minutos) e Token Já Utilizado / Inválido

O `auth-service` implementa uma **validação rigorosa em 3 etapas** antes de autorizar qualquer troca de senha:

```
Requisição de Troca ──> 1. Token existe no banco? ──Não──> ❌ Erro: Token inválido ou inexistente
                                │ Sim
                                ▼
                        2. Token já foi usado?   ──Sim──> ❌ Erro: Link já utilizado
                                │ Não (usado = false)
                                ▼
                        3. Token expirou (>30m)? ──Sim──> ❌ Erro: Link expirou (30 min)
                                │ Não (agora <= expira_em)
                                ▼
                        ✅ Permite redefinir a nova senha
```

#### Evidências Visuais das Recusas:

1. **Tentativa com Link Já Utilizado (Superior)**:
   - Ao tentar reutilizar um link cujo token já teve `usado = TRUE` registrado no banco, a aplicação recusa a operação:
   > **`"Este link de recuperação já foi utilizado. Solicite um novo link."`**

2. **Tentativa Após 30 Minutos / Expirado (Inferior)**:
   - Se o usuário tentar abrir o link após a janela de 30 minutos (`NOW() > expira_em`), a validação rejeita o acesso:
   > **`"Este link de recuperação expirou (validade de 30 minutos). Solicite um novo link."`**

![Tentativas Recusadas: Token Já Utilizado e Token Expirado após 30 Minutos](docs/Group%202.png)

---

## 🗄️ Modelo do Banco de Dados

### 1. Tabela `usuarios` (Autenticação e Perfis)
```sql
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'usuario', -- Papéis: 'usuario' ou 'admin'
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2. Tabela `reset_tokens` (Gerenciada pelo `auth-service` com Expiração de 30 Min)
```sql
CREATE TABLE IF NOT EXISTS reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,       -- Hash criptográfico de 32 bytes (64 caracteres)
  usuario_id INT NOT NULL,                  -- Chave estrangeira para usuarios(id)
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expira_em TIMESTAMP NOT NULL,             -- criado_em + 30 minutos
  usado BOOLEAN DEFAULT FALSE,              -- Previne reutilização do mesmo link
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3. Tabelas de Domínio do Catálogo (`favoritos` e `comentarios`)
```sql
CREATE TABLE IF NOT EXISTS favoritos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tmdb_movie_id INT NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  poster_path VARCHAR(255),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  UNIQUE KEY uq_usuario_filme (usuario_id, tmdb_movie_id)
);

CREATE TABLE IF NOT EXISTS comentarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tmdb_movie_id INT NOT NULL,
  texto TEXT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
```

---

## 📂 Estrutura do Projeto

```
.
├── auth-service/                     # 🔑 Microsserviço de Autenticação e Troca de Senha
│   ├── Dockerfile                    # Container isolado (SEM porta pública pro host)
│   ├── package.json                  # Dependências: express, mysql2, bcryptjs, nodemailer
│   └── src/
│       ├── config/db.js              # Pool MariaDB e criação da tabela reset_tokens
│       ├── controllers/authController.js # Lógica de login, cadastro, roles e recuperação
│       ├── middleware/auth.js        # Geração e validação de tokens JWT
│       ├── routes/authRoutes.js      # Endpoints /forgot-password, /verify-reset-token, etc.
│       ├── services/emailService.js  # Envio de e-mail via Brevo (SMTP / REST API)
│       └── index.js                  # Inicialização do auth-service (porta 4000 interna)
│
├── backend/                          # 🎬 Backend do Catálogo (Proxy, TMDB, Favoritos, Comentários)
│   ├── package.json
│   └── src/
│       ├── config/db.js              # Pool MariaDB e tabelas usuarios, favoritos e comentarios
│       ├── controllers/              # authController, movieController, favoriteController, commentController
│       ├── middleware/auth.js        # Middleware de proteção JWT e verificação de roles
│       ├── routes/                   # authRoutes, movieRoutes, favoriteRoutes, commentRoutes
│       ├── services/tmdbService.js   # Integração com API TMDB (filmografia Tom Hanks)
│       └── index.js                  # Servidor Express principal (porta 3000 pública)
│
├── frontend/                         # 🖥️ Interface SPA (React 19, Vite, Context API, Tema Dark)
│   ├── src/
│   │   ├── components/auth/          # LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm
│   │   ├── components/catalog/       # MovieCard, MovieGrid, MovieModal, SearchBar
│   │   ├── context/AuthContext.jsx   # Gestão de estado de autenticação e papéis
│   │   └── services/api.js           # Cliente Axios para a API
│   └── index.html
│
├── docs/                             # 📸 Evidências Visuais e Capturas de Tela
│   ├── Group 2.png                   # Print: Tentativas recusadas (Token expirado e Token já usado)
│   └── Group 3.png                   # Print: Fluxo completo (E-mail de Recuperação e Senha redefinida)
│
├── Dockerfile                        # Build do container do Catálogo
├── docker-compose.yml                # Orquestração dos 2 microsserviços na rede app-network
├── .env.example                      # Modelo de variáveis de ambiente com Brevo
└── README.md                         # Documentação completa
```

---

## ⚙️ Variáveis de Ambiente

Crie seu arquivo `.env` baseado no `.env.example`:

| Variável | Descrição | Exemplo |
|---|---|---|
| `PORT` | Porta pública do catálogo no host / Portainer | `3000` |
| `APP_URL` | URL pública da aplicação usada nos links de e-mail | `http://localhost:3000` ou subdomínio Portainer |
| `AUTH_SERVICE_URL` | URL interna do microsserviço de autenticação | `http://auth-service:4000` |
| `TMDB_API_KEY` | Chave de desenvolvedor da API TMDB | `sua_chave_tmdb` |
| `DB_HOST` | Host do banco de dados MariaDB | `mariadb` ou `localhost` |
| `DB_PORT` | Porta do banco MariaDB | `3306` |
| `DB_USER` | Usuário do MariaDB | `aluno` |
| `DB_PASSWORD` | Senha do MariaDB | `alunosenha` |
| `DB_NAME` | Nome da base de dados | `catalogo_filmes` |
| `JWT_SECRET` | Chave secreta de assinatura dos tokens JWT | `chave_jwt_secreta_local_dev` |
| `SMTP_HOST` | Host do serviço SMTP da **Brevo** | `smtp-relay.brevo.com` |
| `SMTP_PORT` | Porta SMTP da Brevo (STARTTLS) | `587` |
| `SMTP_USER` | Login SMTP / E-mail da conta Brevo | `seu_email_brevo` |
| `SMTP_PASS` | Chave SMTP da Brevo (`xsmtpsib-...`) | `sua_chave_smtp_brevo` |
| `SMTP_FROM` | Remetente validado na conta Brevo | `Catálogo Filmes <seu_email_verificado@dominio.com>` |
| `BREVO_API_KEY` | *(Opcional)* Chave de API REST da Brevo | `xkeysib-...` |

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Docker e Docker Compose instalados
- Uma conta gratuita na [Brevo](https://www.brevo.com) (para envio real de e-mails transacionais via SMTP ou API)
- Uma chave gratuita de API no [TMDB](https://www.themoviedb.org/settings/api)

### Passo a Passo

1. **Configurar as Variáveis de Ambiente**:
   ```bash
   cp .env.example .env
   ```
   Edite o arquivo `.env` e preencha `TMDB_API_KEY`, `SMTP_USER` e `SMTP_PASS` (ou `BREVO_API_KEY`).

2. **Subir os Microsserviços**:
   ```bash
   docker compose up --build
   ```

3. **Acessar a Aplicação**:
   Abra no seu navegador: `http://localhost:3000`

---

## 🛡️ Atividade 4 — Controle de Acesso por Papel (RBAC)

> Implementação de **Role-Based Access Control (RBAC)** conforme as diretrizes da **Atividade 4** da disciplina **ISW055** (Professor Allan Siriani).

### 📋 Requisito 1 — Matriz de Permissões por Papel

A aplicação implementa dois papéis fundamentais de usuário:
- **`usuario`**: Usuário comum da plataforma (criado por padrão no cadastro).
- **`admin`**: Administrador da plataforma com privilégios de moderação e auditoria.

| Recurso / Entidade | Ação HTTP | Rota da API | Papel `usuario` | Papel `admin` | Regra de Negócio |
|---|---|---|:---:|:---:|---|
| **Catálogo de Filmes** | `GET` | `/api/movies` | ✅ Permitido | ✅ Permitido | Todos os usuários autenticados podem navegar pelo catálogo. |
| **Detalhes do Filme** | `GET` | `/api/movies/:id` | ✅ Permitido | ✅ Permitido | Todos os usuários autenticados podem ver sinopse e detalhes. |
| **Comentários do Filme** | `GET` | `/api/movies/:id/comments` | ✅ Permitido | ✅ Permitido | **Visibilidade pública:** Todos os usuários podem ler todos os comentários de todos os usuários. |
| **Novo Comentário** | `POST` | `/api/movies/:id/comments` | ✅ Permitido | ✅ Permitido | Qualquer usuário autenticado pode postar um comentário. |
| **Excluir Próprio Comentário** | `DELETE` | `/api/comments/:id` | ✅ Permitido | ✅ Permitido | O autor original do comentário tem permissão para apagá-lo. |
| **Excluir Comentário Alheio (Moderação)** | `DELETE` | `/api/comments/:id` | ❌ **Negado (403)** | ✅ **Permitido** | **Ação exclusiva de Admin:** Apenas moderadores podem remover comentários de outros usuários. |
| **Lista de Favoritos** | `GET` | `/api/favorites` | ✅ Apenas próprios | ✅ Apenas próprios | Cada usuário acessa apenas seus filmes favoritados. |
| **Adicionar Favorito** | `POST` | `/api/favorites` | ✅ Apenas próprios | ✅ Apenas próprios | Adiciona filme à lista pessoal de favoritos. |
| **Remover Favorito** | `DELETE` | `/api/favorites/:id` | ✅ Apenas próprios | ✅ Apenas próprios | Remove filme da lista pessoal de favoritos. |
| **Perfil / Consulta /me** | `GET` | `/api/auth/me` | ✅ Apenas próprio | ✅ Apenas próprio | Retorna dados cadastrais e o papel (`role`) do usuário. |
| **Autorização Centralizada** | `POST` | `/api/auth/authorize` | ✅ Permitido | ✅ Permitido | Endpoint de enforcement do RBAC consultado entre microsserviços. |

> 🔒 **Segurança no Cadastro (Proteção contra Mass Assignment):**  
> O registro público (`POST /api/auth/register`) define **sempre e obrigatoriamente** o papel `usuario` para novos cadastros. O sistema não aceita atribuição arbitrária de `admin` via payload do cliente. A promoção para administrador é realizada de forma controlada no MariaDB:
> ```sql
> UPDATE usuarios SET role = 'admin' WHERE email = 'seu_email@exemplo.com';
> ```

---

### 👑 Requisito 2 — Ação Exclusiva de Administrador

* **Funcionalidade Escolhida:** **Moderação Global de Comentários** (Exclusão de comentários de outros usuários).
* **Regra de Negócio:**
  1. Todos os usuários têm o direito de ler todos os comentários deixados por qualquer membro da comunidade em qualquer filme do catálogo.
  2. Qualquer usuário autenticado pode criar seus próprios comentários e excluí-los quando desejar.
  3. No entanto, se um comentário contiver conteúdo impróprio, spam ou violação das regras, **apenas o usuário com papel `admin`** possui a autoridade para apagá-lo.
  4. Usuários com papel `usuario` não podem remover comentários feitos por terceiros sob nenhuma hipótese.

---

### 🔒 Requisito 3 — Validação no Backend (HTTP 403 Forbidden)

A validação de segurança é estritamente **aplicada no servidor (backend)** no controller [`backend/src/controllers/commentController.js`](backend/src/controllers/commentController.js), garantindo que mesmo requisições diretas via `curl`, Postman ou scripts automatizados sejam bloqueadas:

1. Ao receber a requisição `DELETE /api/comments/:id`, o backend obtém o comentário no banco de dados e verifica o `usuario_id` do autor.
2. Se `comment.usuario_id === req.user.id`: a requisição é aceita e o comentário é removido com `HTTP 200 OK`.
3. Se `comment.usuario_id !== req.user.id`:
   * O backend aciona o microsserviço de autenticação (`auth-service`) via chamada interna para verificar se o requisitante é `admin`.
   * Se o papel for diferente de `admin`, a requisição é **imediatamente rejeitada com `HTTP 403 Forbidden`**:
     ```json
     {
       "error": "Acesso proibido. Apenas administradores têm permissão para excluir comentários de outros usuários.",
       "code": "FORBIDDEN_NOT_ADMIN"
     }
     ```
   * Se o papel for `admin`, a moderação é autorizada e executada com sucesso (`HTTP 200 OK`).

#### Exemplo de Teste no Backend (cURL):

* **Tentativa não autorizada por usuário comum (HTTP 403):**
  ```bash
  curl -X DELETE http://localhost:3000/api/comments/1 \
    -H "Authorization: Bearer <TOKEN_DE_USUARIO_COMUM>"
  ```
  **Resposta:**
  ```http
  HTTP/1.1 403 Forbidden
  Content-Type: application/json

  {
    "error": "Acesso proibido. Apenas administradores têm permissão para excluir comentários de outros usuários.",
    "code": "FORBIDDEN_NOT_ADMIN"
  }
  ```

* **Exclusão administrativa por Admin (HTTP 200):**
  ```bash
  curl -X DELETE http://localhost:3000/api/comments/1 \
    -H "Authorization: Bearer <TOKEN_DE_ADMIN>"
  ```
  **Resposta:**
  ```http
  HTTP/1.1 200 OK
  Content-Type: application/json

  {
    "success": true,
    "message": "Comentário de outro usuário removido com sucesso por moderação de administrador."
  }
  ```

---

### 💻 Requisito 4 — Interface Reflete as Permissões

A interface React ([`CommentsModal.jsx`](frontend/src/components/catalog/CommentsModal.jsx)) adapta-se dinamicamente conforme o papel (`role`) e a autoria dos comentários:

1. **Visibilidade Comunitária:** Todos os comentários exibem o nome do autor (`👤 Nome do Usuário`), a badge de papel (`admin` em dourado ou `usuario` em azul) e a data de criação.
2. **Indicação de Autoria:** Comentários do próprio usuário logado recebem a tag azul `Você`.
3. **Botão de Exclusão do Próprio Autor:** Usuários comuns visualizam o botão de lixeira **apenas nos seus próprios comentários**. Comentários de outros usuários são exibidos sem o botão de exclusão.
4. **Botão de Moderação de Administrador:** Quando um usuário com papel `admin` abre o modal, o botão de exclusão é exibido em **todos os comentários**. Para comentários de outros usuários, o botão possui estilização distinta (borda e ícone em amarelo/âmbar) e tooltip explicativo: *"Moderação de Administrador: Excluir comentário de outro usuário"*, além de caixa de diálogo de confirmação específica de moderação.
5. **Tratamento de Erros:** Caso ocorra qualquer resposta `403 Forbidden` (ex: tentativa manipulada ou perda de privilégio), uma notificação toast de erro é apresentada ao usuário.

---

### 💡 Requisito 5 — Pergunta Conceitual: Padrão A vs Padrão B

#### **Qual padrão foi adotado no sistema?**
O sistema adotou prioritariamente o **Padrão A (Enforcement Centralizado)**, com suporte a fallback das claims do token. Quando uma ação restrita é requisitada (como a exclusão de comentários de terceiros), o serviço de **Catálogo** realiza uma consulta HTTP síncrona diretamente ao microsserviço **`auth-service`** (`GET /users/:id/role` ou `POST /authorize`) para obter o papel atual do usuário no banco de dados em tempo real.

#### **Comparativo: Padrão A vs Padrão B**

| Aspecto | Padrão A (Enforcement Centralizado) | Padrão B (Claims no Token JWT) |
|---|---|---|
| **Mecanismo** | O catálogo consulta o `auth-service` via HTTP a cada ação sensível. | O catálogo decodifica a claim `role` diretamente do payload do JWT localmente. |
| **Tempo de Resposta / Latência** | **Maior**, pois adiciona uma requisição de rede interna entre containers a cada validação. | **Mínimo / Instantâneo**, pois a validação é executada em memória localmente sem I/O de rede. |
| **Propagação de Mudança de Papel** | **Instantânea**: se um administrador alterar o papel de um usuário no banco, o efeito é imediato na requisição seguinte. | **Diferida**: a alteração só terá efeito quando o token JWT expirar e um novo for emitido pelo usuário. |
| **Acoplamento / Resiliência** | **Alto acoplamento em tempo de execução**: se o `auth-service` estiver fora do ar, ações sensíveis ficam indisponíveis. | **Desacoplado**: o catálogo continua validando permissões mesmo se o `auth-service` estiver temporariamente indisponível. |
| **Sobrecarga no Microsserviço de Auth** | **Alta**: o `auth-service` recebe tráfego proporcional a todas as ações sensíveis do catálogo. | **Baixa**: o `auth-service` só é acionado nos momentos de login e redefinição de credenciais. |

#### **O que mudaria ao migrar para o Padrão B?**
1. **No `auth-service`:**
   * O payload do JWT gerado em `authController.js` já inclui `{ id, nome, email, role }`. Nenhuma alteração estrutural na emissão do token seria necessária.
2. **No `catálogo` (backend):**
   * Em vez de fazer uma chamada HTTP interna (`await callAuthService(...)`), o controller de comentários validaria o papel diretamente a partir de `req.user.role`, que já foi verificado e decodificado pelo middleware JWT [`middleware/auth.js`](backend/src/middleware/auth.js).
3. **Trade-offs da migração:**
   * **Vantagens ganhas:** Redução drástica da latência de rede nas operações de moderação, eliminação do acoplamento síncrono com o `auth-service` e maior escalabilidade dos serviços.
   * **Desvantagens introduzidas:** Se um usuário for rebaixado de `admin` para `usuario` ou revogado, ele ainda reteria os privilégios de moderação até que seu token JWT expirasse (a menos que fosse implementada uma lista de revogação/blacklist ou tokens de vida útil muito curta com refresh tokens).


