# server/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

# Run the TypeScript server with ts-node
CMD ["yarn", "dev"] 