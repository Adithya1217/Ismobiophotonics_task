# Build from repo root: docker build -f apps/api/Dockerfile .
FROM node:20-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN npm ci -w apps/api -w packages/shared && npx prisma generate --schema apps/api/prisma/schema.prisma
ENV NODE_ENV=production PORT=4000
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy --schema apps/api/prisma/schema.prisma && npm start -w apps/api"]
