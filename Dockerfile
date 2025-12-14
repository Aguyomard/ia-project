FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

COPY package*.json ./

RUN pnpm install && npm install -g nodemon tsx  

COPY . .

EXPOSE 3000
