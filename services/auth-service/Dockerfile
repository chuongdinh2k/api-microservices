FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/auth-service ./services/auth-service
RUN npm install
RUN npm run build --workspace=@ecommerce/shared
RUN npm run build --workspace=auth-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/services/auth-service/dist ./services/auth-service/dist
ENV NODE_PATH=/app/node_modules
CMD ["node", "services/auth-service/dist/main.js"]
