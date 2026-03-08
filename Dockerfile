# Build stage
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
COPY bin/ ./bin/

RUN npx tsc

# Production stage
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/*.js ./
COPY --from=build /app/src/*.js ./src/
COPY --from=build /app/src/db/*.js ./src/db/

EXPOSE 3000

CMD ["node", "src/index.js"]
