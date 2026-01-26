# RSS Feed Manager

<div align="center">

![RSS Feed Manager](logos/pwa-192.png)

A modern, self-hosted RSS/Atom feed reader with AI-powered features.

[![Go Version](https://img.shields.io/badge/Go-1.23+-00ADD8?style=flat&logo=go)](https://go.dev/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3-06B6D4?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Features](#features) • [Quick Start](#quick-start) • [Configuration](#configuration) • [Tech Stack](#tech-stack) • [Contributing](#contributing)

</div>

---

## Overview

RSS Feed Manager is a self-hosted RSS/Atom reader that brings together a clean, modern UI with powerful features like AI-powered article summaries, reader view, and personalized top news rankings. Take control of your content consumption without relying on third-party services.

## Features

### Core Features
- **📰 Feed Management** - Organize feeds into folders, subscribe via URL or discover from curated categories
- **📖 Reader View** - Clean, distraction-free reading experience extracted from original articles
- **🔖 Bookmarks** - Save articles for later reading
- **🔍 Search** - Full-text search across all your articles
- **📱 PWA Support** - Install as a native app on desktop and mobile

### AI-Powered Features (Optional)
- **🤖 AI Summaries** - Get key points extracted from articles using Google Gemini
- **📊 Smart Top News** - AI-ranked articles based on importance and relevance
- **📧 Email Digests** - Scheduled email summaries of your feeds (configurable)

### User Experience
- **🎨 Multiple Themes** - Light, Dark, Aurora, Sunset, Midnight, Everforest variants
- **🎯 Accent Colors** - Customize with 8 accent color options
- **⚡ Fast & Responsive** - Optimized performance with React Query caching
- **🔐 Passwordless Auth** - Secure email-based OTP authentication

## Screenshots

<details>
<summary>Click to view screenshots</summary>

| Light Theme | Dark Theme |
|-------------|------------|
| ![Light](https://via.placeholder.com/400x300?text=Light+Theme) | ![Dark](https://via.placeholder.com/400x300?text=Dark+Theme) |

| Reader View | Discover Page |
|-------------|---------------|
| ![Reader](https://via.placeholder.com/400x300?text=Reader+View) | ![Discover](https://via.placeholder.com/400x300?text=Discover) |

</details>

## Quick Start

### Prerequisites

- **Go** 1.23 or higher (with CGO enabled for SQLite)
- **Node.js** 18 or higher
- **npm** 9 or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/rss-feed-manager.git
   cd rss-feed-manager
   ```

2. **Backend Setup**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   go mod tidy
   go run ./cmd/server
   ```

3. **Frontend Setup** (in a new terminal)
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev
   ```

4. **Access the app**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8080

### First Time Setup

1. Open http://localhost:5173 in your browser
2. Enter your email address to receive a sign-in code
3. Create your first folder and start adding feeds!
4. Visit the **Discover** tab to explore curated feeds across 40+ categories

## Configuration

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `DB_PATH` | SQLite database path | `./data/rss.db` |
| `POLL_INTERVAL` | Feed refresh interval | `1h` |
| `FRONTEND_ORIGIN` | CORS allowed origin | `http://localhost:5173` |
| `READER_RATE_PER_MINUTE` | Rate limit for reader view | `20` |
| `READER_USER_AGENT` | User agent for fetching | `RSSFeedManager/0.1` |

#### Email Digest (Optional)
| Variable | Description | Default |
|----------|-------------|---------|
| `DIGEST_ENABLED` | Enable email digests | `false` |
| `DIGEST_INTERVAL` | Digest send interval | `6h` |
| `SMTP_HOST` | SMTP server host | - |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USERNAME` | SMTP username | - |
| `SMTP_PASSWORD` | SMTP password | - |
| `SMTP_FROM` | From email address | - |
| `DEV_MAILER` | Log emails instead of sending | `true` |

#### AI Features (Optional)
| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | - |
| `GEMINI_MODEL` | Gemini model to use | `gemini-1.5-flash` |

### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE` | Backend API URL | `http://localhost:8080` |

## Tech Stack

### Backend
- **[Go](https://go.dev/)** - Fast, compiled language
- **[Chi](https://github.com/go-chi/chi)** - Lightweight HTTP router
- **[SQLite](https://www.sqlite.org/)** - Embedded database
- **[gofeed](https://github.com/mmcdole/gofeed)** - RSS/Atom parser
- **[go-readability](https://github.com/go-shiori/go-readability)** - Article extraction

### Frontend
- **[React 18](https://reactjs.org/)** - UI framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Vite](https://vitejs.dev/)** - Build tool
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS
- **[TanStack Query](https://tanstack.com/query)** - Data fetching & caching
- **[React Router](https://reactrouter.com/)** - Client-side routing

## Project Structure

```
rss-feed-manager/
├── backend/                    # Go backend
│   ├── cmd/server/            # Application entrypoint
│   ├── internal/
│   │   ├── db/                # Database & migrations
│   │   ├── feeds/             # Feed fetching logic
│   │   ├── handlers/          # HTTP handlers & routing
│   │   ├── mailer/            # Email service
│   │   ├── models/            # Data models
│   │   ├── reader/            # Reader view extraction
│   │   ├── scheduler/         # Background jobs
│   │   └── services/          # Business logic
│   ├── data/                  # SQLite database (gitignored)
│   └── .env.example           # Environment template
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── api/               # API client & types
│   │   ├── components/        # Reusable components
│   │   │   └── ui/            # UI component library
│   │   ├── context/           # React contexts
│   │   ├── hooks/             # Custom hooks
│   │   ├── layout/            # Layout components
│   │   ├── modals/            # Modal components
│   │   ├── pages/             # Page components
│   │   ├── services/          # Frontend services
│   │   └── utils/             # Utility functions
│   └── .env.example           # Environment template
│
├── logos/                      # App icons & logos
├── .gitignore                 # Git ignore rules
├── LICENSE                    # MIT License
└── README.md                  # This file
```

## Development

### Running Tests

```bash
# Backend tests
cd backend
go test ./...

# Frontend linting
cd frontend
npm run lint
```

### Building for Production

```bash
# Backend
cd backend
go build -o bin/server ./cmd/server

# Frontend
cd frontend
npm run build
# Output in frontend/dist/
```

### Database

The application uses SQLite with automatic migrations. The database is created at the path specified in `DB_PATH` on first run.

To reset the database, simply delete the `.db`, `.db-shm`, and `.db-wal` files in the `data/` directory.

## Deployment

### Docker (Coming Soon)

Docker support is planned for easier deployment.

### Manual Deployment

1. Build both frontend and backend for production
2. Serve the frontend `dist/` folder with any static file server (nginx, caddy, etc.)
3. Run the backend binary with appropriate environment variables
4. Configure a reverse proxy to route API requests

## API Documentation

The backend exposes a REST API at `http://localhost:8080`. Key endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/send-otp` | Send OTP to email |
| `POST` | `/auth/verify` | Verify OTP and get token |
| `GET` | `/folders` | List all folders with feeds |
| `POST` | `/folders` | Create a new folder |
| `POST` | `/feeds` | Add a feed to a folder |
| `GET` | `/items` | Get articles (with pagination) |
| `GET` | `/reader` | Get reader view for URL |
| `GET` | `/summary/:id` | Get AI summary for article |
| `GET` | `/topnews` | Get AI-ranked top news |

## Roadmap

- [ ] Docker & Docker Compose setup
- [ ] OPML import/export
- [ ] Full-text search improvements
- [ ] Keyboard shortcuts
- [ ] Feed health monitoring
- [ ] Multiple user support
- [ ] Mobile apps (React Native)

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [gofeed](https://github.com/mmcdole/gofeed) - Excellent RSS/Atom parsing library
- [go-readability](https://github.com/go-shiori/go-readability) - Reader view extraction
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Unsplash](https://unsplash.com/) - Beautiful category images
- [awesome-rss-feeds](https://github.com/plenaryapp/awesome-rss-feeds) - Curated feed collection

---

<div align="center">

Made with ❤️ for RSS enthusiasts

[⬆ Back to top](#rss-feed-manager)

</div>
