# ---- 1. Install all dependencies (cached while package*.json is unchanged) ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- 2. Compile TypeScript, then drop dev dependencies ----
FROM deps AS build
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- 3. Small runtime image: compiled JS + production node_modules only ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

# Apply pending migrations, then start the API.
CMD ["sh", "-c", "npm run migration:run:prod && node dist/main.js"]
