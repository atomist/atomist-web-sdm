FROM atomist/sdm-base:0.4.1@sha256:555a4f6fb9b0fb9d180e2e9a0bfcd04c44128cb76eca26516ccb7ba7dd304b5c

COPY package.json package-lock.json ./

RUN npm ci \
    && npm cache clean --force

COPY . ./

USER atomist:atomist
