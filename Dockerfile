FROM node:22-alpine AS web-build

WORKDIR /app

COPY web/ ./web/
COPY scripts/build-web.mjs ./scripts/build-web.mjs

ARG UMAMI_SCRIPT_URL
ARG UMAMI_WEBSITE_ID
ARG UMAMI_DOMAINS

RUN node scripts/build-web.mjs /app/dist

FROM nginx:1.27-alpine

COPY --from=web-build /app/dist/ /usr/share/nginx/html/
COPY deploy/nginx.conf /etc/nginx/nginx.conf
