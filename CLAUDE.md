# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Style

- Use comments sparingly. Only comment complex, non-obvious code.

## Commands

```bash
# Initial setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development server (Turbopack, http://localhost:3000)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest src/lib/__tests__/file-system.test.ts

# Reset database
npm run db:reset

# Background dev server (logs to logs.txt)
npm run dev:daemon
```

## Environment

Copy `.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=your-api-key-here
```

Without an API key, the app runs with a `MockLanguageModel` (`src/lib/provider.ts`) that returns hardcoded sample components. The mock simulates multi-step streaming with delays.

## Architecture

UIGen is an AI-powered React component generator. Users describe components in a chat interface; Claude generates JSX files into a virtual (in-memory) file system, which renders in a live preview iframe.

### Data Flow

1. User sends message → `ChatProvider` calls `POST /api/chat`
2. API route reconstructs `VirtualFileSystem` from serialized JSON sent in the request
3. LLM streams a response with tool calls (`str_replace_editor`, `file_manager`)
4. Tool calls are executed against the virtual FS as they stream in
5. Final virtual FS state is serialized and persisted to the DB (for authenticated users)
6. `PreviewFrame` transforms JSX → executable JS via Babel, renders in sandboxed iframe

### Key Contexts

- **`FileSystemProvider`** (`src/lib/contexts/file-system-context.tsx`): Manages in-memory virtual FS state, exposes CRUD methods, handles tool-call side effects
- **`ChatProvider`** (`src/lib/contexts/chat-context.tsx`): Wraps Vercel AI SDK's `useChat`, serializes FS into each request body, dispatches tool results back to FS context

### Virtual File System

`src/lib/file-system.ts` — An in-memory tree with no disk I/O. The entire FS is serialized to JSON and included in every API request so the stateless API route can reconstruct it.

### LLM Tools

Two tools the model can call:

| Tool | File | Commands |
|------|------|----------|
| `str_replace_editor` | `src/lib/tools/str-replace.ts` | `create`, `str_replace`, `insert` |
| `file_manager` | `src/lib/tools/file-manager.ts` | `rename`, `delete` |

The system prompt (`src/lib/prompts/generation.tsx`) instructs Claude to always create `/App.jsx` as the entry point and use Tailwind CSS for styling.

### Preview Rendering

`PreviewFrame` (`src/components/preview/`) runs in an isolated iframe. It uses `@babel/standalone` to transpile JSX at runtime. Import maps point `react` and `react-dom` to CDN-hosted UMD bundles so components can import them normally.

### Auth & Persistence

- JWT sessions (7-day, HTTP-only cookies) via `jose`
- Passwords hashed with `bcrypt`
- Server actions in `src/actions/index.ts` for signUp/signIn/signOut
- Prisma + SQLite (`prisma/dev.db`); schema in `prisma/schema.prisma` — reference this file to understand the structure of data stored in the database
- Projects store `messages` and `data` (serialized FS) as JSON columns

### Component Organization

```
src/
  app/              # Next.js App Router: pages, layouts, API routes
  components/
    ui/             # shadcn/ui primitives
    chat/           # ChatInterface, MessageList, MessageInput
    editor/         # FileTree, CodeEditor (Monaco)
    preview/        # PreviewFrame (iframe renderer)
    auth/           # AuthDialog, SignUpForm, SignInForm
  lib/
    contexts/       # ChatProvider, FileSystemProvider
    tools/          # LLM tool definitions
    prompts/        # System prompt
    file-system.ts  # VirtualFileSystem class
    provider.ts     # MockLanguageModel fallback
  actions/          # Next.js server actions
  hooks/            # Custom React hooks
```

### Testing

Tests live alongside source files in `__tests__/` directories. The main test suite (`src/lib/__tests__/file-system.test.ts`) covers `VirtualFileSystem` extensively. Uses Vitest + jsdom + React Testing Library.
