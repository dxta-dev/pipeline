# syntax=docker/dockerfile:1

FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/orchestrator/package.json ./apps/orchestrator/
COPY apps/workflows/package.json ./apps/workflows/
COPY packages/schemas/crawl/package.json ./packages/schemas/crawl/
COPY packages/schemas/extract/package.json ./packages/schemas/extract/
COPY packages/schemas/super/package.json ./packages/schemas/super/
COPY packages/schemas/tenant/package.json ./packages/schemas/tenant/
COPY packages/schemas/transform/package.json ./packages/schemas/transform/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps ./apps
COPY --from=build /app/packages ./packages
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-workspace.yaml ./
EXPOSE 3000
CMD ["node", "apps/orchestrator/dist/index.js"]
