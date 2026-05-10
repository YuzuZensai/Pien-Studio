FROM oven/bun:1.3 AS deps
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.base.json bunfig.toml ./
COPY apps ./apps
COPY packages ./packages
RUN bun install --frozen-lockfile

FROM deps AS builder
WORKDIR /app/apps/api
RUN bun run build

FROM oven/bun:1.3 AS runner
WORKDIR /app/apps/api
ENV NODE_ENV=production

COPY --from=deps /app/node_modules /app/node_modules
COPY --from=builder /app/apps/api/dist /app/apps/api/dist
COPY --from=builder /app/apps/api/package.json /app/apps/api/package.json

EXPOSE 4000
CMD ["bun", "run", "dist/index.js"]
