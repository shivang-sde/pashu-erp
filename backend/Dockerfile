FROM node:20-alpine AS builder

WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN find . -maxdepth 2 -type f -name '*.log' -delete
RUN chown -R node:node /usr/src/app

FROM node:20-alpine AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PORT=5000

COPY --from=builder /usr/src/app ./

EXPOSE 5000
USER node
CMD ["node", "src/server.js"]
