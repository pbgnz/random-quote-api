FROM node:24.14.1-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Create non-root user for security (CIS Docker Benchmark compliance)
RUN groupadd -r app && useradd -r -g app app

# Set ownership of app directory to non-root user
RUN chown -R app:app /usr/src/app

# Switch to non-root user
USER app

EXPOSE 8000

CMD ["node", "src/server.js"]