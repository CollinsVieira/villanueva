FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY frontend/ .

ARG VITE_API_BASE_URL=
ARG VITE_IMAGE_IP=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_IMAGE_IP=$VITE_IMAGE_IP
ENV NODE_ENV=production

RUN pnpm run build

FROM nginx:alpine

COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

EXPOSE 80
