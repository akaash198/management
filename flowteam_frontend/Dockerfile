# Frontend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (for caching)
COPY package.json package-lock.json ./
RUN npm install

# Copy project
COPY . .

# Set env vars for dev
ENV NEXT_PUBLIC_API_URL=http://localhost:8000/api
ENV NEXT_PUBLIC_WS_URL=ws://localhost:8000

EXPOSE 3000

CMD ["npm", "run", "dev"]
