# 🎬 Catálogo de Filmes — Tom Hanks (Microsserviços Desacoplados)

> Atividade Prática 3 da disciplina **ISW055 - Introdução à Computação em Nuvem**  
> Professor: **Allan Siriani** ([@siriani](https://github.com/siriani))

---

## 📌 Visão Geral da Atividade 3

Nesta atividade, a arquitetura da **Atividade 2 (monólito)** foi evoluída para uma **arquitetura de microsserviços desacoplados**. Toda a lógica de gestão de usuários e autenticação (**login, cadastro, emissão de JWT, papéis de usuário `role` e recuperação de senha**) foi extraída para um microsserviço independente (**`auth-service`**), isolado na rede interna do Docker e sem porta exposta para a internet. O container do **`catálogo`** atua como único ponto de entrada público e consome a API do TMDB e as tabelas de favoritos e comentários.

### ✨ Principais Mudanças e Divisão de Responsabilidades

1. **Microsserviço de Autenticação (`auth-service`)**:
   - Serviço isolado na rede interna Docker (**sem porta publicada pro host**).
   - Gerenciamento completo de usuários: cadastro (`/register`), login (`/login`), perfil (`/me`) e verificação de papéis (`/users/:id/role`).
   - Suporte nativo a papéis de usuário diferenciados (`usuario` e `admin`).
   - Fluxo de recuperação de senha com tokens criptográficos aleatórios de 32 bytes (64 caracteres hex).
   - Tabela `reset_tokens` com expiração estrita de **30 minutos** (`expira_em`) e flag de uso único (`usado`).
   - Envio de e-mail transacional real via **Mailtrap** (desenvolvimento) e suporte a **Brevo** (produção).
   - Validação e redefinição segura de senha com hash `bcrypt`.

2. **Catálogo de Filmes (`catalogo` - Frontend SPA + Backend)**:
   - **Único ponto de entrada público** (porta reservada no host / Portainer).
   - Integração com a API do TMDB: busca em tempo real da filmografia de Tom Hanks (pôsteres, títulos e sinopses).
   - Gestão de favoritos e anotações/comentários gravados no MariaDB com isolamento estrito por `usuario_id = ?`.
   - Delega requisições de autenticação e recuperação de senha diretamente ao `auth-service` via chamadas HTTP internas na rede Docker (`http://auth-service:4000`).

3. **Validação Rigorosa em 3 Etapas (Recuperação de Senha)**:
   - **Regra 1**: O token existe no banco de dados?
   - **Regra 2**: Ainda não foi utilizado (`usado = false`)?
   - **Regra 3**: Ainda não expirou (`agora <= expira_em`, validade de 30 min)?

---

## 🏛️ Arquitetura de Referência (Dois Containers, Uma Rede)

```
                       +-------------------------------------------------------------+
                       |                     Rede Docker Interna                     |
                       |                        (app-network)                        |
                       |                                                             |
+-----------------+    |   +-----------------------+     +-----------------------+   |
| Navegador Web   |    |   |  Catálogo + Backend   |     |     auth-service      |   |
| (Usuário Final) |=======>| (Ponto Único Público) |====>| (Auth, Roles, Senha)  |   |
|                 |HTTPS   |     (Porta 3000)      |     |  (Sem Porta Exposta)  |   |
|                 |        |                       |     |     (Porta 4000)      |   |
+-----------------+    |   +-----------------------+     +-----------------------+   |
        ^              |               |                             |               |
        |              +---------------|-----------------------------|---------------+
        |                              |                             |
        |                              v                             v
        |                    +-----------------------------------------------+
        |                    |                    MariaDB                    |
        |                    |  (usuarios, reset_tokens, favoritos, coment.) |
        |                    +-----------------------------------------------+
        |                                                            |
        |                                                            v
        |                                                +-----------------------+
        |                                                |     SMTP Externo      |
        |                                                |   Mailtrap / Brevo    |
        |                                                +-----------------------+
        |                                                            |
        +----------------------- E-mail com Link --------------------+
```

### 📋 Comparativo: Atividade 2 (Monólito) vs Atividade 3 (Desacoplado)

| Característica | Atividade 2 (Monólito) | Atividade 3 (Desacoplado) |
|---|---|---|
| **Containers** | 1 container de aplicação + MariaDB | **2 containers de aplicação** (`catalogo` e `auth-service`) + MariaDB |
| **Ponto de Entrada** | Porta pública para toda a aplicação | **Apenas o Catálogo** expõe porta pública |
| **Autenticação e Usuários** | Código acoplado no mesmo backend | **Microsserviço independente** (`auth-service`) |
| **Troca de Senha** | Não implementado | **Microsserviço independente** com SMTP e tokens temporizados (30 min) |
| **Papéis de Usuário** | Não diferenciados | **`usuario` e `admin`** |
| **Comunicação Interna** | Chamadas locais diretas | **Chamadas HTTP internas** via rede Docker (`http://auth-service:4000`) |

---

## 📂 Estrutura de Diretórios do Repositório

```
.
├── auth-service/                     # 🔑 Microsserviço de Troca de Senha
│   ├── Dockerfile                    # Container isolado (sem porta pública pro host)
│   ├── package.json                  # Dependências: express, mysql2, bcryptjs, nodemailer
│   └── src/
│       ├── config/
│       │   └── db.js                 # Pool MariaDB e criação da tabela reset_tokens
│       ├── controllers/
│       │   └── authController.js     # Lógica de Troca de Senha (forgot, verify, reset)
│       ├── routes/
│       │   └── authRoutes.js         # Rotas /forgot-password, /verify-reset-token, /reset-password
│       ├── services/
│       │   └── emailService.js       # Envio de e-mail transacional via Nodemailer (Mailtrap/Brevo)
│       └── index.js                  # Ponto de entrada do auth-service (porta 4000 interna)
│
├── backend/                          # 🎬 Backend do Catálogo (Autenticação, Proxy Troca de Senha, Filmes, Favoritos, Comentários)
│   ├── package.json
│   └── src/
│       ├── config/
│       │   └── db.js                 # Pool MariaDB e tabelas usuarios, favoritos e comentarios
│       ├── controllers/
│       │   ├── authController.js     # Autenticação direta (login/register/me) e delegação de troca de senha
│       │   ├── commentController.js  # Anotações e comentários
│       │   ├── favoriteController.js # Filmes favoritos
│       │   └── movieController.js    # Consumo e cache TMDB
│       ├── middleware/
│       │   └── auth.js               # Assinatura e verificação JWT, verificação de papéis (roles)
│       ├── routes/                   # authRoutes, movieRoutes, favoriteRoutes, commentRoutes
│       ├── services/
│       │   └── tmdbService.js        # Integração TMDB
│       └── index.js                  # Servidor Express principal (porta 3000 pública)
│
├── frontend/                         # 🖥️ Interface SPA (HTML5, CSS3 Cinema Dark, JS Vanilla)
│   ├── index.html                    # Telas de Login, Registro, Recuperação de Senha e Catálogo
│   ├── css/
│   │   └── styles.css                # Estilização moderna, tema escuro e badges de role
│   └── js/
│       ├── api.js                    # Cliente HTTP integrado com endpoints do catálogo e auth
│       ├── auth.js                   # Fluxos de Login, Cadastro, Mailtrap e Validação de Link
│       └── app.js                    # Catálogo TMDB, anotações e favoritos
│
├── Dockerfile                        # Build do container do Catálogo
├── docker-compose.yml                # Orquestração dos 2 microsserviços + MariaDB
├── .env.example                      # Exemplo de variáveis de ambiente com Mailtrap
└── README.md                         # Documentação completa
```

---

## 🐳 Docker Compose: Rede Compartilhada e Isolamento de Portas

Conforme exigido nos requisitos da atividade, o `auth-service` utiliza `expose: ["4000"]` e **NÃO** publica porta pro host (`ports:`), garantindo que ele seja invisível para a internet e acessível apenas internamente pelo Catálogo:

```yaml
version: '3.8'

services:
  # Container público do Catálogo (Porta mapeada no host)
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
      - mariadb
      - auth-service
    networks:
      - app-network
    restart: unless-stopped

  # Microsserviço de Autenticação (ISOLADO - Sem ports mapeado pro host)
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
      - SMTP_HOST=${SMTP_HOST:-sandbox.smtp.mailtrap.io}
      - SMTP_PORT=${SMTP_PORT:-2525}
      - SMTP_USER=${SMTP_USER:-}
      - SMTP_PASS=${SMTP_PASS:-}
      - SMTP_FROM=${SMTP_FROM:-Catálogo Filmes <noreply@catalogofilmes.local>}
    depends_on:
      - mariadb
    networks:
      - app-network
    restart: unless-stopped

  # Banco de Dados MariaDB
  mariadb:
    image: mariadb:10.11
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=${DB_NAME:-catalogo_filmes}
      - MYSQL_USER=${DB_USER:-aluno}
      - MYSQL_PASSWORD=${DB_PASSWORD:-alunosenha}
    expose:
      - "3306"
    volumes:
      - mariadb_data:/var/lib/mysql
    networks:
      - app-network
    restart: unless-stopped

networks:
  app-network:
    driver: bridge

volumes:
  mariadb_data:
```

---

## 🗄️ Modelo do Banco de Dados

### 1. Tabela `usuarios` (Gerenciada pelo Backend / Catálogo)
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

### 2. Tabela `reset_tokens` (Gerenciada pelo `auth-service`)
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
| `SMTP_HOST` | Host do serviço SMTP (**Mailtrap** em dev) | `sandbox.smtp.mailtrap.io` |
| `SMTP_PORT` | Porta SMTP do Mailtrap | `2525` ou `587` |
| `SMTP_USER` | Usuário do Mailtrap Sandbox | `seu_usuario_mailtrap` |
| `SMTP_PASS` | Senha do Mailtrap Sandbox | `sua_senha_mailtrap` |
| `SMTP_FROM` | Remetente do e-mail de recuperação | `Catálogo Filmes <noreply@catalogofilmes.local>` |

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Docker e Docker Compose instalados
- Uma conta gratuita no [Mailtrap.io](https://mailtrap.io) (para testar o recebimento dos e-mails na sandbox)
- Uma chave gratuita de API no [TMDB](https://www.themoviedb.org/settings/api)

### Passo a Passo

1. **Configurar as Variáveis de Ambiente**:
   ```bash
   cp .env.example .env
   ```
   Edite o arquivo `.env` e preencha:
   - `TMDB_API_KEY`: sua chave TMDB
   - `SMTP_USER` e `SMTP_PASS`: suas credenciais da Inbox do Mailtrap

2. **Subir os Microsserviços e o Banco**:
   ```bash
   docker compose up --build
   ```

3. **Acessar a Aplicação**:
   Abra no seu navegador: `http://localhost:3000`

---

## 🧪 Demonstração dos Fluxos de Teste

### 1. Fluxo de Cadastro e Consulta de Papéis (`role`)
1. Acesse a tela inicial e selecione a aba **Criar Conta**.
2. Preencha seu nome, e-mail, senha e escolha o papel (**Usuário Comum** ou **Administrador**).
3. Ao entrar no catálogo, o badge de perfil no canto superior direito exibirá o papel correspondente (`usuario` ou `admin`).
4. O backend responde às consultas e valida permissões pelo token JWT e endpoint `GET /api/auth/users/:id/role`.

---

### 2. Fluxo Completo de Esqueci Minha Senha (Link Válido)
1. Na tela de login, clique em **"Esqueci minha senha"**.
2. Digite o e-mail cadastrado e clique em **"Enviar Link de Recuperação"**.
3. Acesse a sua caixa de entrada no [Mailtrap](https://mailtrap.io):
   - O e-mail formatado em HTML moderno com tema de cinema é entregue instantaneamente.
   - O e-mail contém um botão **"Redefinir Minha Senha"** apontando para `http://localhost:3000/#reset-token=...`.
4. Clique no link no Mailtrap:
   - A página do catálogo abre diretamente no formulário **Redefinir Senha**.
   - O frontend valida o token junto ao `auth-service` via backend do catálogo.
5. Digite a nova senha e clique em **"Salvar Nova Senha"**.
6. A senha é criptografada com `bcrypt`, o token é marcado como `usado = true` e o usuário é redirecionado para o login.
7. Faça login com a nova senha com sucesso!

---

### 3. Demonstração de Recusa: Token Expirado (> 30 Minutos) ou Já Usado
1. **Tentativa de Reutilização**:
   - Clique novamente no mesmo link de redefinição no Mailtrap que já foi utilizado.
   - O `auth-service` detecta `usado = 1` e rejeita a operação com o erro:
     `"Este link de recuperação já foi utilizado. Solicite um novo link."`
2. **Tentativa de Token Expirado**:
   - Caso um token seja acessado após decorridos 30 minutos de `expira_em` (`agora > expira_em`), a operação é recusada com:
     `"Este link de recuperação expirou (validade de 30 minutos). Solicite um novo link."`
3. **Tentativa com Token Forjado / Inválido**:
   - Se o parâmetro do token for alterado para um hash inexistente, a aplicação recusa com:
     `"Token de recuperação inválido ou inexistente."`

---

## 🚢 Deploy no Portainer (Instruções da Atividade)

1. No **Portainer**, crie ou atualize a Stack apontando para este repositório do GitHub.
2. Em **Environment variables**, configure:
   - `PORT`: Porta reservada do aluno
   - `APP_URL`: Subdomínio público da sua stack
   - `TMDB_API_KEY`: Sua chave TMDB
   - `DB_HOST`: Host do MariaDB da infraestrutura da disciplina
   - `DB_PORT`: `3306`
   - `DB_USER`: Seu usuário MariaDB
   - `DB_PASSWORD`: Sua senha MariaDB
   - `DB_NAME`: Sua base de dados
   - `JWT_SECRET`: Chave secreta aleatória
   - `SMTP_HOST`: `sandbox.smtp.mailtrap.io` (dev) ou host do Brevo (prod)
   - `SMTP_PORT`: `2525` ou `587`
   - `SMTP_USER` / `SMTP_PASS`: Credenciais SMTP
3. Realize o deploy da Stack.
4. Confirme que apenas a porta do catálogo foi publicada e teste o fluxo completo.
