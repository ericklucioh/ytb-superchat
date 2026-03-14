# Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm install

# Monta o código do host no container para hot reload
COPY . .

# Expõe a porta do Next
EXPOSE 3000

# Rodar em modo desenvolvimento (hot reload)
CMD ["npm", "run", "dev"]