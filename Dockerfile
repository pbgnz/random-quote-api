FROM node:24.14.1-slim
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 8000
CMD ["node", "src/start.js"]