FROM node:20

WORKDIR app
COPY . .
RUN yarn install
CMD [ "node", "server.js" ]
