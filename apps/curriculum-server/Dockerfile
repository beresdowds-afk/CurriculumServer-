# Curriculum Server Frontend - Cloud Run Production Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json tsconfig.json vite.server.config.ts ./
COPY packages ./packages
COPY apps/curriculum-server ./apps/curriculum-server
COPY src ./src

RUN npm install
RUN npm run build:server

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json ./
RUN npm install --production

COPY --from=builder /app/dist/server-app ./dist/server-app
COPY --from=builder /app/apps/curriculum-server/server.ts ./apps/curriculum-server/server.ts

EXPOSE 8080

CMD ["npx", "tsx", "apps/curriculum-server/server.ts"]
