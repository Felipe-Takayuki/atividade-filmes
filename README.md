# 🎬 Catálogo de Filmes — Tom Hanks (Microsserviços Desacoplados)

> Atividade Prática 3 da disciplina **ISW055 - Introdução à Computação em Nuvem**  
> Professor: **Allan Siriani** ([@siriani](https://github.com/siriani))

---

## 📌 Visão Geral da Atividade 3

Nesta atividade, a arquitetura da **Atividade 2 (monólito)** foi evoluída para uma **arquitetura de microsserviços desacoplados**. Toda a responsabilidade de autenticação e gestão de usuários foi extraída para um serviço independente (`auth-service`), mantendo o catálogo de filmes focado exclusivamente no domínio de filmes, favoritos e comentários.

### ✨ Principais Mudanças e Novas Funcionalidades
1. **Desacoplamento de Autenticação**: Criação do container `auth-service`, isolado na rede interna do Docker.
2. **Segurança de Rede**: O serviço de autenticação **não possui portas publicadas para o host**, sendo acessível unicamente pelo backend do catálogo através da rede interna do Docker.
3. **Papéis de Usuário (Roles)**: Suporte nativo a perfis diferenciados (`usuario` e `admin`), com capacidade do `auth-service` responder a consultas de papel de usuário (`GET /users/:id/role`).
4. **Recuperação de Senha Real (Esqueci Minha Senha)**:
   - Geração de tokens criptográficos aleatórios únicos de 32 bytes (64 caracteres hexadecimais).
   - Registro na tabela `reset_tokens` com controle de expiração estrita de **30 minutos** (`expira_em`) e flag de uso único (`usado`).
   - Envio de e-mail transacional real via **Mailtrap** (ambiente de desenvolvimento) e suporte a **Brevo** (produção).
5. **Validação Rigorosa em 3 Etapas**:
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
| Navegador Web   |    |   |                       |     |                       |   |
| (Usuário Final) |=======>|       Catálogo        |====>|     auth-service      |   |
|                 |HTTPS   | (Único Ponto Público) |     |  (Sem Porta Exposta)  |   |
+-----------------+    |   |     (Porta 3000)      |     |     (Porta 4000)      |   |
        ^              |   +-----------------------+     +-----------------------+   |
        |              |               |                             |               |
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
| **Autenticação** | Código acoplado no mesmo backend | **Microsserviço independente** (`auth-service`) |
| **Comunicação de Auth** | Chamadas diretas de função | **Chamadas HTTP internas** via DNS Docker (`http://auth-service:4000`) |
| **Papéis de Usuário** | Não diferenciados | **`usuario` e `admin`** |
| **Recuperação de Senha** | Não implementado | **Envio real via Mailtrap com link temporizado de 30 min** |

---

## 📂 Estrutura de Diretórios do Repositório

```
.
├── auth-service/                     # 🔐 Microsserviço de Autenticação
│   ├── Dockerfile                    # Container isolado (sem porta pública pro host)
│   ├── package.json                  # Dependências: express, mysql2, bcryptjs, jsonwebtoken, nodemailer
│   └── src/
│       ├── config/
│       │   └── db.js                 # Pool MariaDB e criação de tabelas (usuarios, reset_tokens)
│       ├── controllers/
│       │   └── authController.js     # Lógica de Login, Cadastro, Roles e Esqueci Minha Senha
│       ├── middleware/
│       │   └── auth.js               # Assinatura e validação JWT
│       ├── routes/
│       │   └── authRoutes.js         # Rotas /register, /login, /me, /forgot-password, etc.
│       ├── services/
│       │   └── emailService.js       # Envio de e-mail via Nodemailer (Mailtrap/Brevo)
│       └── index.js                  # Ponto de entrada do auth-service (porta 4000 interna)
│
├── backend/                          # 🎬 Catálogo Backend (Proxy / Filmes / Favoritos / Comentários)
│   ├── package.json
│   └── src/
│       ├── config/
│       │   └── db.js                 # Pool MariaDB para favoritos e comentários
│       ├── controllers/
│       │   ├── authController.js     # Repassa requisições para o auth-service via HTTP interno
│       │   ├── commentController.js  # Anotações e comentários
│       │   ├── favoriteController.js # Filmes favoritos
│       │   └── movieController.js    # Consumo e cache TMDB
│       ├── middleware/
│       │   └── auth.js               # Verificação de sessão e papéis (roles)
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

### 1. Tabela `usuarios` (Gerenciada pelo `auth-service`)
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
4. O microsserviço de autenticação responde a requisições internas em `GET /users/:id/role` informando o papel cadastrado.

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
