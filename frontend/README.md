# Frontend (React + Vite + TypeScript)

The RSS Feed Manager frontend is a modern React application built with Vite, TypeScript, and Tailwind CSS.

## Tech Stack

- **React 18** - UI framework
- **TypeScript 5** - Type safety
- **Vite 5** - Build tool & dev server
- **Tailwind CSS 3** - Utility-first CSS
- **TanStack Query** - Data fetching & caching
- **React Router 6** - Client-side routing
- **Axios** - HTTP client

## Prerequisites

- Node.js 18 or higher
- npm 9 or higher

## Setup

1. **Copy environment file**
   ```bash
   cp .env.example .env
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5173`.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE` | Backend API URL | `http://localhost:8080` |

## Project Structure

```
frontend/
├── src/
│   ├── api/                  # API client & types
│   │   ├── client.ts         # Axios instance
│   │   ├── index.ts          # API functions
│   │   └── types.ts          # API response types
│   │
│   ├── components/           # Reusable components
│   │   ├── ui/               # UI component library
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   └── ...
│   │   ├── Discover.tsx      # Feed discovery
│   │   ├── FeedTree.tsx      # Sidebar feed tree
│   │   ├── ItemList.tsx      # Article list
│   │   └── ...
│   │
│   ├── constants/            # Application constants
│   │   └── index.ts
│   │
│   ├── context/              # React contexts
│   │   └── AuthContext.tsx   # Authentication state
│   │
│   ├── hooks/                # Custom React hooks
│   │   ├── useLog.tsx        # Logging hook
│   │   └── useTheme.tsx      # Theme management
│   │
│   ├── layout/               # Layout components
│   │   ├── AppHeader.tsx     # Top navigation
│   │   ├── AppShell.tsx      # Main layout wrapper
│   │   └── types.ts
│   │
│   ├── modals/               # Modal components
│   │   ├── ArticleModal.tsx  # Article reader
│   │   ├── BaseModal.tsx     # Base modal wrapper
│   │   └── SettingsModal.tsx # Settings panel
│   │
│   ├── pages/                # Page components
│   │   ├── LoginPage.tsx     # Authentication
│   │   └── VerifyPage.tsx    # OTP verification
│   │
│   ├── services/             # Frontend services
│   │   └── LogService.ts     # Logging service
│   │
│   ├── types/                # TypeScript types
│   │   └── index.ts
│   │
│   ├── utils/                # Utility functions
│   │   ├── format.ts         # Date/text formatting
│   │   └── itemMedia.ts      # Media extraction
│   │
│   ├── App.tsx               # Root component
│   ├── main.tsx              # Application entry
│   └── index.css             # Global styles
│
├── public/                   # Static assets
├── .env.example              # Environment template
├── package.json              # Dependencies & scripts
├── tailwind.config.ts        # Tailwind configuration
├── tsconfig.json             # TypeScript config
└── vite.config.ts            # Vite configuration
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## UI Components

The project includes a reusable UI component library at `src/components/ui/`:

### Form Components
- **Button** - Primary, secondary, ghost, outline, danger variants
- **Input** - Text input with icons and error states
- **Select** - Styled dropdown select
- **Textarea** - Multi-line text input
- **Checkbox** - Checkbox with label
- **Radio** - Radio button with label
- **FormGroup** - Form field wrapper with label/error

### Display Components
- **Badge** - Status indicators
- **Divider** - Horizontal separator
- **IconButton** - Icon-only buttons

### Usage Example

```tsx
import { Button, Input, FormGroup } from "./components/ui";

function MyForm() {
  return (
    <form>
      <FormGroup label="Email" required>
        <Input type="email" placeholder="you@example.com" />
      </FormGroup>
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

## Theming

The app supports multiple themes and accent colors:

### Themes
- Light, Dark, Aurora, Sunset, Midnight, Everforest (light/dark)

### Accent Colors
- Indigo, Teal, Rose, Amber, Violet, Emerald, Everforest

### CSS Variables

All theme colors use CSS variables for easy customization:

```css
:root {
  --accent: #6366f1;
  --accent-hover: #4f46e5;
  --accent-soft: #e0e7ff;
  --surface: #ffffff;
  --surface-border: #e2e8f0;
  --surface-muted: #f1f5f9;
}
```

## PWA Support

The app is configured as a Progressive Web App (PWA) using `vite-plugin-pwa`:

- Installable on desktop and mobile
- Offline support (service worker)
- App-like experience

## Development Notes

### State Management

- **TanStack Query** handles server state (feeds, items, etc.)
- **React Context** handles client state (auth, theme)
- **Local Storage** persists user preferences

### Code Style

- Functional components with hooks
- TypeScript for all components
- Tailwind for styling (no CSS modules)
- Named exports preferred

### Building for Production

```bash
npm run build
```

Output is generated in the `dist/` folder, ready for deployment to any static hosting service.
