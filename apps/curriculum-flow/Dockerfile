# Curriculum Flow Frontend - Cloud Run Production Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json tsconfig.json vite.flow.config.ts ./
COPY packages ./packages
COPY apps/curriculum-flow ./apps/curriculum-flow
COPY src ./src

RUN npm install
RUN npm run build:flow

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json ./
RUN npm install --production

COPY --from=builder /app/dist/flow-app ./dist/flow-app
COPY --from=builder /app/apps/curriculum-flow/server.ts ./apps/curriculum-flow/server.ts

EXPOSE 8080

CMD ["npx", "tsx", "apps/curriculum-flow/server.ts"]
