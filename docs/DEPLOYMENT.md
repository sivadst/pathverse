# Deployment Guide

## Local

```bash
npm install
cp .env.example .env.local
npm run db:generate
npm run dev
```

## Validation

```bash
npm run typecheck
npm run test
npm run build
```

## Vercel

1. Import the repository into Vercel.
2. Add `DATABASE_URL` and `NEXT_PUBLIC_APP_URL`.
3. Use the included `vercel.json` defaults.
4. Run `npm run db:generate` during setup if Prisma generation is not cached.

## Docker

```bash
docker build -t pathverse-ai .
docker run -p 3000:3000 --env-file .env.local pathverse-ai
```

The Docker build validates typecheck, tests, and production build before producing the runtime image.
