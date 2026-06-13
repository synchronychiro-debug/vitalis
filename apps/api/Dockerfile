FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/core/package.json packages/core/
COPY packages/api-client/package.json packages/api-client/
COPY packages/ui/package.json packages/ui/

RUN npm install

COPY . .

RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build --workspace=packages/types
RUN npm run build --workspace=packages/core

EXPOSE 3000

CMD ["npx", "tsx", "apps/api/src/index.ts"]
