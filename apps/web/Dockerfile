FROM node:24-alpine AS build
WORKDIR /build
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci
COPY apps/web ./apps/web
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
