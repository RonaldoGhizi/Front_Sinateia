# Compila o front e serve com o Caddy, que cuida do HTTPS e repassa /api para a API.
FROM node:22-alpine AS compilacao
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=compilacao /app/dist /srv
