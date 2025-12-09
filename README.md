# LinkLite — URL Shortener + Analytics

LinkLite is a lightweight URL Shortener built with Next.js.  
It lets you turn long, messy URLs into clean short links and track basic click analytics.  
The app is intentionally simple on “business logic” so you can focus on ops/infrastructure.

---

## Features

- **Create short links**
    - Auto-generated codes or **custom aliases**
    - Optional **expiry date**
    - Public / Private visibility
    - Optional tags

- **Fast redirects**
    - `/[code]` redirects instantly to the original URL
    - Handles not found / expired links gracefully

- **Dashboard**
    - List and manage your links
    - Total clicks per link
    - Quick actions: copy / view analytics / delete

- **Analytics (MVP)**
    - Total clicks
    - Clicks over time (optional extension)
    - Basic referrer/device/country breakdown (optional extension)

---

## Tech Stack

- **Next.js 16.x.x (App Router)**
- **TypeScript**
- **UI:** Tailwind / Shadcn-UI 
- **Database: **Postgres (RDS/Neon) + Prisma ORM**
- **CI:** GitHub Actions

> The project is structured so the storage layer can be swapped without rewriting core logic.

---

[//]: # (## Project Structure &#40;high level&#41;)

---

## Getting Started (locally)

### 1) Install dependencies

```bash
npm install
```

### 2) Run the dev server

```bash
npm run dev
```

## Scripts

[//]: # (npm test           # Tests &#40;if configured&#41;)

```
npm run dev        # Start Next.js in dev mode
npm run build      # Production build
npm run start      # Run production server locally
npm run lint       # ESLint
npm run typecheck  # TypeScript checks
```

[//]: # (### Deployment &#40;AWS&#41;)

