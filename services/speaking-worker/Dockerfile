FROM node:24-bookworm-slim
WORKDIR /app/services/speaking-worker
COPY services/speaking-worker/package*.json ./
RUN npm ci --omit=dev
WORKDIR /app
COPY tsconfig.json ./
COPY src/lib ./src/lib
COPY services/speaking-worker ./services/speaking-worker
RUN cd services/speaking-worker && npm run build
ENV NODE_ENV=production
WORKDIR /app/services/speaking-worker
EXPOSE 10000
CMD ["node","dist/worker.cjs"]
