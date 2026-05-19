FROM node:20-slim AS builder

WORKDIR /usr/src/app
ARG VITE_API_URL
ARG VITE_API_SECRET
ENV NODE_ENV=production
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_API_SECRET=${VITE_API_SECRET}

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime


RUN mkdir -p /var/cache/nginx/client_temp && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

COPY --from=builder /usr/src/app/dist /usr/share/nginx/html
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80
USER nginx
CMD ["nginx", "-g", "daemon off;"]