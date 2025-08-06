# alpine image
FROM node:20.11.1-alpine3.19

# maintainer
LABEL maintainer Dave Bullough <hello@pacosystems.com>

# install bash, jq, and curl for convenience and debugging
RUN apk --no-cache add bash jq curl

RUN mkdir -p /application

WORKDIR /application
# 
COPY package.json package.json
RUN npm install --production

COPY files files/
COPY lib lib/
COPY app.js app.js

CMD ["node", "app.js"]
