# Namma Karnataka — Frontend Application

React Single Page Application (SPA) built with Vite, TypeScript, and Tailwind CSS for **Namma Karnataka**.

---

## Technology Stack

- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives)
- **Routing:** React Router v6
- **Localization:** `react-i18next` (English `en` & Kannada `kn`)
- **Maps:** Leaflet & `react-leaflet`
- **Server State:** TanStack Query

---

## Getting Started

1. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
5. Run linting checks:
   ```bash
   npm run lint
   ```

---

## Security Guidelines

- **Never place server credentials in frontend files or `.env`:** Variables prefixed with `VITE_` are embedded into the client JavaScript bundle and are publicly visible to anyone inspecting the browser.
- Only public URLs (`VITE_API_BASE_URL`, `VITE_SUPABASE_URL`) and anonymous public keys (`VITE_SUPABASE_ANON_KEY`) belong here.
