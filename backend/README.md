# Backend (Go)

The RSS Feed Manager backend is a REST API built with Go and the Chi router, using SQLite for data storage.

## Tech Stack

- **Go 1.23+** - Programming language
- **Chi** - Lightweight HTTP router
- **SQLite** - Embedded database
- **gofeed** - RSS/Atom feed parser
- **go-readability** - Article content extraction

## Prerequisites

- Go 1.23 or higher
- CGO enabled (required for SQLite)

### macOS / Linux
```bash
# Ensure CGO is enabled
export CGO_ENABLED=1
```

### Windows
CGO requires a C compiler. Install [TDM-GCC](https://jmeubank.github.io/tdm-gcc/) or [MinGW-w64](http://mingw-w64.org/).

## Setup

1. **Copy environment file**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env`** with your configuration (see [Configuration](#configuration))

3. **Install dependencies**
   ```bash
   go mod tidy
   ```

4. **Run the server**
   ```bash
   go run ./cmd/server
   ```

The server will:
- Create the database at `data/rss.db` on first run
- Run database migrations automatically
- Start the HTTP server on the configured port
- Begin background feed polling

## Configuration

### Required Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `8080` |
| `DB_PATH` | SQLite database path | `./data/rss.db` |
| `FRONTEND_ORIGIN` | CORS allowed origin | `http://localhost:5173` |

### Feed Polling

| Variable | Description | Default |
|----------|-------------|---------|
| `POLL_INTERVAL` | Feed refresh interval | `1h` |
| `READER_RATE_PER_MINUTE` | Reader view rate limit | `20` |
| `READER_USER_AGENT` | User agent for HTTP requests | `RSSFeedManager/0.1` |

### Email Digests (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `DIGEST_ENABLED` | Enable email digests | `false` |
| `DIGEST_INTERVAL` | How often to send digests | `6h` |
| `SMTP_HOST` | SMTP server hostname | - |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USERNAME` | SMTP authentication username | - |
| `SMTP_PASSWORD` | SMTP authentication password | - |
| `SMTP_FROM` | Sender email address | - |
| `DEV_MAILER` | Log emails instead of sending | `true` |

### AI Features (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | - |
| `GEMINI_MODEL` | Model to use | `gemini-1.5-flash` |

## Project Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go           # Application entrypoint
├── internal/
│   ├── db/
│   │   ├── db.go             # Database connection
│   │   ├── migrations.go     # Schema migrations
│   │   └── seed_starter_pack.go
│   ├── feeds/
│   │   └── fetcher.go        # RSS/Atom feed fetching
│   ├── handlers/
│   │   ├── auth.go           # Authentication endpoints
│   │   └── router.go         # Route definitions
│   ├── mailer/
│   │   └── mailer.go         # Email service
│   ├── models/
│   │   └── models.go         # Data models
│   ├── reader/
│   │   └── reader.go         # Reader view extraction
│   ├── scheduler/
│   │   └── scheduler.go      # Background job scheduler
│   └── services/
│       ├── auth_service.go   # Auth business logic
│       ├── digest_service.go # Email digest logic
│       ├── feed_service.go   # Feed management
│       ├── gemini_helpers.go # Gemini API helpers
│       ├── summary_service.go # AI summaries
│       └── topnews_service.go # Top news ranking
├── data/                      # Database files (gitignored)
├── .env.example              # Environment template
├── go.mod                    # Go module definition
└── go.sum                    # Dependency checksums
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/send-otp` | Send OTP to email |
| `POST` | `/auth/verify` | Verify OTP, get JWT token |
| `GET` | `/me` | Get current user info |

### Folders & Feeds

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/folders` | List all folders with feeds |
| `POST` | `/folders` | Create new folder |
| `PATCH` | `/folders/:id` | Rename folder |
| `DELETE` | `/folders/:id` | Delete folder |
| `POST` | `/feeds` | Add feed to folder |
| `DELETE` | `/feeds/:id` | Remove feed |
| `POST` | `/folders/:id/refresh` | Refresh folder feeds |

### Items

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/items` | List items (paginated) |
| `PATCH` | `/items/:id/state` | Update read/bookmark state |

### Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/reader` | Get reader view for URL |
| `GET` | `/summary/:id` | Get AI summary for item |
| `GET` | `/topnews` | Get AI-ranked top news |
| `GET` | `/discover` | Get discover feed suggestions |
| `POST` | `/discover/resolve` | Resolve URL to feed |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/settings` | Get user settings |
| `PATCH` | `/settings` | Update user settings |

## Development

### Running Tests
```bash
go test ./...
```

### Building for Production
```bash
go build -o bin/server ./cmd/server
```

### Database Reset

To reset the database, delete the files in `data/`:
```bash
rm -f data/rss.db data/rss.db-shm data/rss.db-wal
```

## Notes

- CORS is configured to allow the frontend origin specified in `FRONTEND_ORIGIN`
- Rate limiting is applied to prevent abuse of the reader view endpoint
- Background jobs run for feed polling and optional email digests
- Reader view uses best-effort extraction; failures gracefully fall back to feed content
- Top News ranking uses Gemini if configured; otherwise falls back to latest items
