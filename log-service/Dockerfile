# ==============================================================================
# Dockerfile para Microsserviço de Observabilidade e Logs de Auditoria (log-service)
# Atividade 5 - Não expõe portas para o host - comunicação apenas interna na rede Docker
# ==============================================================================

FROM node:20-alpine

WORKDIR /app

# Copia manifestos de dependências
COPY package*.json ./

# Instala dependências de produção
RUN npm install --omit=dev

# Copia código-fonte
COPY . .

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=5000

# Porta interna do container (sem mapeamento externo no host)
EXPOSE 5000

# Inicia o serviço
CMD ["node", "src/index.js"]
