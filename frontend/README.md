# Namma Karnataka — Frontend Application

React Single Page Application (SPA) built with Vite, TypeScript, and Tailwind CSS for **Namma Karnataka**.

---

## Prerequisites

- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **Package Manager:** `npm` (uses `package-lock.json` for reproducible CI builds)

---

## Available Scripts

| Command | Purpose |
|---|---|
| `npm install` | Install all required dependencies |
| `npm run dev` | Start local Vite development server on `http://localhost:5173` |
| `npm run build` | Compile TypeScript (`tsc -b`) and build production bundle with Vite into `dist/` |
| `npm run lint` | Run ESLint across all TypeScript and React files |
| `npm run test` | Run Vitest unit tests in jsdom environment |
| `npm run preview` | Locally preview the production build in `dist/` |

---

## Central API Client

All frontend-to-backend communication is channeled through [`src/lib/api.ts`](./src/lib/api.ts):
- Reads the backend API URL from `import.meta.env.VITE_API_BASE_URL`.
- Defaults to `http://localhost:8000/api/v1`.
- Standardizes timeout management via `AbortController`.
- Normalizes HTTP errors into typed `ApiClientError` objects with `code`, `message`, `status`, and `requestId`.
- Provides pre-typed `checkHealth()` and `checkReadiness()` methods.

---

## Environment Configuration

Configure environment variables via `.env` (copy from [`.env.example`](./.env.example)):
```dotenv
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=placeholder_public_anon_key
VITE_DEFAULT_LANGUAGE=en
```

### Security Warning
- Variables prefixed with `VITE_` are embedded directly into client JavaScript bundles and are publicly visible in browser inspector tools.
- **NEVER** place server-side secrets (such as `GROQ_API_KEY`, `GEMINI_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY`) in frontend `.env` files.
