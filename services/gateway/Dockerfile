FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/gateway ./services/gateway
RUN npm ci
RUN npm run build --workspace=@ecommerce/shared
RUN npm run build --workspace=gateway

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/services/gateway/dist ./services/gateway/dist
COPY --from=builder /app/services/gateway/node_modules ./services/gateway/node_modules
ENV NODE_PATH=/app/node_modules:/app/services/gateway/node_modules
CMD ["node", "services/gateway/dist/main.js"]
