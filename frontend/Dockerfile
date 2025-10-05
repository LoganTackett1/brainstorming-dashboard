FROM node:18-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM alpine:3.18
RUN mkdir -p /usr/share/nginx/html
COPY --from=builder /app/dist /usr/share/nginx/html
VOLUME ["/usr/share/nginx/html"]
