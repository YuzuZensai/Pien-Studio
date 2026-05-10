FROM oven/bun:1.3 AS deps
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.base.json bunfig.toml ./
COPY apps ./apps
COPY packages ./packages
RUN bun install --frozen-lockfile
RUN bun install --cwd /app/apps/web --frozen-lockfile

FROM deps AS builder
WORKDIR /app/apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

FROM oven/bun:1.3 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PATH=/app/apps/web/node_modules/.bin:/app/node_modules/.bin:$PATH

COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/web/node_modules /app/apps/web/node_modules
COPY --from=builder /app/apps/web/.next /app/apps/web/.next
COPY --from=builder /app/apps/web/package.json /app/apps/web/package.json
COPY --from=builder /app/apps/web/next.config.mjs /app/apps/web/next.config.mjs

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["bun", "run", "--cwd", "/app/apps/web", "start"]
