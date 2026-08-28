# ==============================================================================
# Dockerfile para Catálogo de Filmes Tom Hanks (React SPA + Express Backend)
# Compatível com Portainer e Docker Compose
# ==============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências e compila o frontend React
COPY frontend/package*.json ./frontend/
RUN npm --prefix frontend install
COPY frontend/ ./frontend/
RUN npm --prefix frontend run build

FROM node:20-alpine

WORKDIR /app

# Copia manifestos e instala dependências de produção do backend
COPY backend/package*.json ./backend/
RUN npm --prefix backend install --omit=dev

# Copia o código fonte do backend
COPY backend/ ./backend/

# Copia o build compilado do frontend React
COPY --from=builder /app/frontend/dist ./frontend/dist

# Define variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Porta do container
EXPOSE 3000

# Diretório de execução
WORKDIR /app/backend

# Inicia a aplicação
CMD ["node", "src/index.js"]
