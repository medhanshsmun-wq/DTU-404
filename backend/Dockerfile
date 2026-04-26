FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Expose the API port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
