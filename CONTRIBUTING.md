# Contributing to RSS Feed Manager

Thank you for your interest in contributing to RSS Feed Manager! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

## Getting Started

### Prerequisites

- Go 1.23+ (with CGO enabled)
- Node.js 18+
- npm 9+
- Git

### Setting Up the Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/rss-feed-manager.git
   cd rss-feed-manager
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/rss-feed-manager.git
   ```

4. **Set up the backend**
   ```bash
   cd backend
   cp .env.example .env
   go mod tidy
   ```

5. **Set up the frontend**
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   ```

6. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   cd backend && go run ./cmd/server

   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `develop` - Development branch (if used)
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Creating a New Feature

1. **Sync with upstream**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** and commit regularly

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**

## Coding Standards

### Go (Backend)

- Follow [Effective Go](https://golang.org/doc/effective_go) guidelines
- Use `gofmt` for formatting
- Write tests for new functionality
- Use meaningful variable and function names
- Add comments for exported functions

```go
// FetchFeed retrieves and parses an RSS/Atom feed from the given URL.
// It returns the parsed feed or an error if the fetch fails.
func FetchFeed(url string) (*gofeed.Feed, error) {
    // Implementation
}
```

### TypeScript/React (Frontend)

- Use TypeScript for all new code
- Follow the existing component structure
- Use functional components with hooks
- Keep components small and focused
- Use the UI components from `src/components/ui/`

```typescript
// Good: Typed props with destructuring
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function CustomButton({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <Button onClick={onClick} disabled={disabled}>
      {label}
    </Button>
  );
}
```

### CSS/Styling

- Use Tailwind CSS utility classes
- Use CSS variables for theming (`var(--accent)`, etc.)
- Follow mobile-first responsive design
- Use the existing color palette

### File Organization

```
frontend/src/
├── api/          # API client and types
├── components/   # Reusable components
│   └── ui/       # UI primitives (Button, Input, etc.)
├── constants/    # Application constants
├── context/      # React contexts
├── hooks/        # Custom hooks
├── layout/       # Layout components
├── modals/       # Modal components
├── pages/        # Page components
├── services/     # Frontend services
├── types/        # TypeScript types
└── utils/        # Utility functions
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

### Examples

```bash
feat(feeds): add OPML import functionality

fix(reader): handle empty content gracefully

docs(readme): update installation instructions

refactor(ui): extract Button component to separate file
```

## Pull Request Process

### Before Submitting

1. **Update your branch** with the latest changes from upstream
2. **Run tests** to ensure nothing is broken
3. **Lint your code** (`npm run lint` for frontend)
4. **Test manually** in the browser

### PR Description Template

```markdown
## Summary
Brief description of what this PR does.

## Changes
- Change 1
- Change 2

## Testing
How was this tested?

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Code follows project style guidelines
- [ ] Tests added/updated as needed
- [ ] Documentation updated as needed
- [ ] No console errors or warnings
```

### Review Process

1. At least one maintainer review required
2. All CI checks must pass
3. Resolve all review comments
4. Maintainer will merge once approved

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

- **Description**: Clear description of the bug
- **Steps to Reproduce**: How to trigger the bug
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: Browser, OS, versions
- **Screenshots**: If applicable

### Feature Requests

For feature requests, please include:

- **Problem**: What problem does this solve?
- **Solution**: Your proposed solution
- **Alternatives**: Other solutions considered
- **Additional Context**: Any other relevant information

## Questions?

If you have questions, feel free to:

- Open a GitHub Discussion
- Create an issue with the `question` label

Thank you for contributing! 🎉
