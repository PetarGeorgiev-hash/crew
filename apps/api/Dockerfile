FROM node:26-alpine AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
ENV NODE_ENV=production
RUN npm install -g pnpm@12.4.1

FROM base AS prepare
RUN pnpm add -g turbo
COPY . .
RUN turbo prune @crew/api --docker

FROM base AS builder
COPY --from=prepare /app/out/json/ .
RUN pnpm install --frozen-lockfile
# Build the project
COPY --from=prepare /app/out/full/ .
# Uncomment and use build args to enable remote caching
# ARG TURBO_TEAM
# ENV TURBO_TEAM=$TURBO_TEAM
# ARG TURBO_TOKEN
# ENV TURBO_TOKEN=$TURBO_TOKEN
RUN pnpm turbo build
RUN pnpm deploy --filter=@crew/api --prod /app/deploy
RUN cp -r apps/api/dist /app/deploy/dist

FROM base AS runner
WORKDIR /app

COPY --from=builder /app/deploy ./
CMD ["node", "dist/main.js"]