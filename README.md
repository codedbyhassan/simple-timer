# Ascend HMS

Hospital management system by Ascend Technologies. Single hospital, React (JavaScript and JSX), Supabase backend, ready for Netlify, Vercel and Electron.

> Status: M2 complete (design system, auth, shell, workspaces) and M3 in progress (database core: 7 migrations and 80 passing database checks). This README is completed at the final milestone with full documentation and all screenshots.

## Quick start

```bash
npm install
cp .env.example .env      # add your Supabase URL and anon key
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Web development server |
| `npm run build` | Production web build into `dist/` (Netlify and Vercel use this) |
| `npm run build:electron` | Desktop build with relative paths |
| `npm run electron:dev` | Run the desktop app against the dev server |
| `npm run electron:start` | Build and open the desktop app |
| `npm run electron:pack` | Package an installer into `release/` |
| `npm run lint` | ESLint |

## Layout

See `docs/ARCHITECTURE_DECISIONS.md` for the decisions and `docs/VERIFY.md` for what must be confirmed outside the sandbox.
