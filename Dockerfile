FROM node:16-slim

RUN useradd --create-home -s /bin/bash app
WORKDIR /home/app

COPY package.json .
COPY package-lock.json .
RUN npm install

COPY --chown=app:app . .
RUN npm install --production

USER app
CMD [ "node", "./bin/www" ]
