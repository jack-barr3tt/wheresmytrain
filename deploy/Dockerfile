FROM node:22-alpine AS build

WORKDIR /app
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN yarn build && yarn install --frozen-lockfile --production && yarn cache clean

FROM alpine:3.24

RUN apk add --no-cache libstdc++

COPY --from=build /usr/local/bin/node /usr/local/bin/node

WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "."]
