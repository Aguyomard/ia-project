FROM node:18-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Expose port
EXPOSE 5173

# Install deps at startup (so they're visible on host via volume)
# Then start dev server
CMD ["sh", "-c", "pnpm install && pnpm dev"]
