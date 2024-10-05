FROM node:20.15.0-alpine AS build-stage

WORKDIR /usr/src/source

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:20.15.0-alpine

WORKDIR /usr/src/app

COPY --from=build-stage /usr/src/source/node_modules ./node_modules
COPY --from=build-stage /usr/src/source/build ./build
COPY --from=build-stage /usr/src/source/package.json ./package.json
COPY --from=build-stage /usr/src/source/package-lock.json ./package-lock.json
COPY --from=build-stage /usr/src/source/.env.production ./.env.production
COPY --from=build-stage /usr/src/source/server.js ./server.js

EXPOSE 3000

CMD ["npm", "run", "prod"]
