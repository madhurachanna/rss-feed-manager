# Stage 1: Build the Frontend
FROM node:18-alpine AS builder-node
WORKDIR /app
COPY logos ./logos

WORKDIR /app/frontend
# Copy package files first for better caching
COPY frontend/package*.json ./
RUN npm ci
# Copy the rest of the frontend source
COPY frontend/ ./
# Build the production assets
RUN npm run build

# Stage 2: Build the Backend
FROM golang:1.23-alpine AS builder-go
WORKDIR /app/backend
# Install build dependencies if needed (e.g. gcc for CGO)
RUN apk add --no-cache gcc musl-dev
# Copy go module files
COPY backend/go.mod backend/go.sum ./
RUN go mod download
# Copy the rest of the backend source
COPY backend/ ./
# Build the binary. CGO_ENABLED=1 is needed for go-sqlite3
RUN CGO_ENABLED=1 GOOS=linux go build -o main ./cmd/server

# Stage 3: Final Image
FROM alpine:latest
WORKDIR /app

# Install runtime dependencies (sqlite needs libc)
RUN apk add --no-cache ca-certificates sqlite-libs

# Copy the binary from the backend builder
COPY --from=builder-go /app/backend/main .

# Copy the frontend build artifacts to the 'dist' folder the backend expects
COPY --from=builder-node /app/frontend/dist ./dist

# Create a data directory for the SQLite database
RUN mkdir -p ./data

# Expose port and set entrypoint
EXPOSE 8080
CMD ["./main"]
