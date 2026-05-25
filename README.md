# PathVerse AI Growth OS

PathVerse is a cinematic AI-powered career, learning, and growth ecosystem. It combines a premium SaaS product cockpit with a GPU-accelerated PixiJS/WebGL simulation engine for visualizing paths, learning signals, telemetry, and adaptive intelligence.

The current experience includes:

- Premium dashboard UI inspired by Linear, Vercel, Notion AI, Apple, Framer, and CRED.
- AI Career Mentor with typed deterministic guidance services and API routes.
- AI Skill Gap Analyzer, adaptive roadmap generation, resume analysis, ATS scoring, XP, streaks, achievements, leaderboard, and activity timeline.
- Three.js growth visualization on the product cockpit.
- Preserved PixiJS command center at `/ops` with algorithm battles, telemetry, neural learning, swarm intelligence, and civilization simulation.
- PostgreSQL-ready Prisma schema, Dockerfile, Vercel config, and GitHub Actions CI.

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript strict mode
- TailwindCSS
- Framer Motion
- Shadcn-style UI primitives
- Zustand
- Recharts
- Three.js
- PixiJS/WebGL engine
- Prisma ORM with PostgreSQL schema
- Vitest

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run db:generate
npm run dev
```

Open:

- `http://localhost:3000` for the PathVerse AI growth cockpit.
- `http://localhost:3000/ops` for the GPU command center.

## Validation

```bash
npm run typecheck
npm run test
npm run build
```

## Architecture

```text
app/                     Next.js routes and API handlers
components/platform/     Premium product experience
components/ui/           Reusable shadcn-style primitives
src/services/            AI product intelligence services
src/store/               Zustand product state
src/types/               Strict product contracts
src/engine/              GPU navigation, AI, telemetry, civilization engine
prisma/                  PostgreSQL persistence model
docs/                    Architecture, API, deployment guides
```

More detail:

- [Architecture](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Deployment](docs/DEPLOYMENT.md)

## API Surface

- `POST /api/ai/mentor`
- `POST /api/ai/roadmap`
- `POST /api/resume/analyze`

These currently use a local deterministic intelligence layer so the product works without external keys. The service boundary is ready for hosted model providers.

## Deployment

Vercel is supported through `vercel.json`. Docker is supported through the included multi-stage `Dockerfile`, which validates typecheck, tests, and production build before producing the runtime image.
