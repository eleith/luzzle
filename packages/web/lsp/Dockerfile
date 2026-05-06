FROM node:22-slim
WORKDIR /app

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm install -g @luzzle/lsp@0.0.1 yaml-language-server \
    && npm cache clean --force

RUN mkdir -p /app/archive && \
    chgrp 0 /app /app/archive && \
    chmod g+w /app /app/archive

COPY --chown=:0 ./server.js /app/server.js
COPY --chown=:0 ./luzzle-lsp.js /app/luzzle-lsp.js
COPY --chown=:0 ./markdownlint-lsp.js /app/markdownlint-lsp.js
COPY --chown=:0 ./package.json /app/package.json

RUN cd /app && npm install --omit=dev && npm cache clean --force

RUN chmod g+w /app/server.js /app/luzzle-lsp.js /app/markdownlint-lsp.js

EXPOSE 9001

CMD ["node", "/app/server.js"]
