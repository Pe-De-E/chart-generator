# Altavio – Chart & Route Visualizer

A full-stack web application for creating publication-quality SVG charts and route visualizations from CSV and GPX data. Charts can be exported as static images or rendered as animated MP4 videos — entirely in the browser.

Built with **Vue 3**, **TypeScript**, **Fastify**, and **PostgreSQL** in a pnpm monorepo.

---

## What it does

### Data Charts (CSV input)

Upload any CSV file and generate styled, scalable SVG charts:

- **Bar, Line, Scatter, Pie, Area** charts with configurable colors, titles, and axes
- **Statistical overlays** — mean, median, trend lines, and confidence bands rendered directly into the SVG
- **Multi-series support** — overlay multiple data series in a single chart
- **Data cleaning workflow** — remove outliers, rename columns, handle nulls before generating

### Route & Elevation Visualizations (GPX input)

Upload a GPX track and generate:

- **Elevation chart** — altitude profile with automatic annotation detection (climbs, descents, peaks), effort zones, animated drawing, and pan/zoom
- **Route map** — SVG map rendered from real geodata: roads, forests, rivers, contour lines, hillshading, vineyards, meadows, and satellite tiles fetched live from Overpass API and Mapbox
- **3D terrain view** — interactive Three.js scene built from elevation tiles

### Export

| Format | Description |
|---|---|
| SVG | Scalable, print-ready vector output |
| PNG | Rasterized frame export |
| MP4 | Animated chart rendered via FFmpeg.wasm — no server upload needed |
| QR Code | Shareable link for the current chart |

### User Accounts

- Register and log in to save charts and configuration presets to the cloud
- Manage personal chart style presets and elevation color themes
- Admin dashboard with request logs and error tracking

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 (Composition API), Vite, Vuetify 3, Pinia, TypeScript |
| Backend | Fastify 5, Prisma ORM, PostgreSQL 16, Zod |
| Auth | JWT with access + refresh token rotation, httpOnly cookies |
| Video export | FFmpeg.wasm (runs in-browser, no server processing) |
| Maps | Overpass API, Mapbox Vector Tiles, D3, Three.js |
| Testing | Vitest (747 unit tests), Playwright (E2E + component tests) |
| Monorepo | pnpm workspaces |

---

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+ — install with `npm install -g pnpm`
- [Docker](https://www.docker.com/) — used to run PostgreSQL locally

---

## Getting Started

### 1. Install dependencies

```bash
git clone <repo-url>
cd chart-generator
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example packages/backend/.env
```

Edit `packages/backend/.env` and set the two JWT secrets to long random strings:

```env
ACCESS_TOKEN_SECRET=change-this-to-a-random-string-at-least-32-characters-long
REFRESH_TOKEN_SECRET=change-this-to-a-different-random-string-at-least-32-chars
```

All other values work out of the box for local development.

### 3. Start the database

```bash
npm run db:start                                       # starts PostgreSQL via Docker on port 5433
pnpm --filter @chart-generator/backend db:migrate      # runs Prisma migrations
```

### 4. Start the application

```bash
npm run dev
```

This starts both frontend and backend concurrently.

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Health check | http://localhost:3000/api/v1/health |

---

## Project Structure

```
packages/
├── frontend/                    # Vue 3 SPA
│   └── src/
│       ├── components/
│       │   └── chartWorkflow/   # Multi-step chart creation UI
│       ├── composables/         # Reusable Vue 3 composition functions
│       ├── stores/              # Pinia state (auth, route map, chart config)
│       ├── utils/
│       │   └── chartGenerators/ # Pure SVG generator functions, one per chart type
│       └── services/            # Axios API client
│
├── backend/                     # Fastify REST API
│   └── src/
│       ├── routes/              # Route registration
│       ├── controllers/         # Request/response handling
│       ├── services/            # Business logic (auth, charts, uploads)
│       ├── middleware/          # Auth, validation, error handling
│       └── validators/          # Zod input schemas
│
└── shared/                      # TypeScript types shared across packages
```

### How the chart pipeline works

1. **Upload** — CSV or GPX is parsed client-side into a typed `DataPoint[]` array
2. **Inspect & Clean** — optional step to remove bad rows, rename columns, handle nulls
3. **Configure** — choose chart type, colors, title, overlays
4. **Generate** — a pure TypeScript function returns an SVG string (no canvas, no third-party chart library)
5. **Export** — download SVG/PNG, or pass frames through FFmpeg.wasm for video

All chart generators are in `packages/frontend/src/utils/chartGenerators/` and are pure functions with no side effects.

---

## Available Scripts

```bash
# Development
npm run dev               # Start frontend + backend together
npm run dev:frontend      # Frontend only (port 5173)
npm run dev:backend       # Backend only (port 3000)

# Testing
npm test                  # All unit tests (747 tests)
npm run test:coverage     # Unit tests with coverage report
npm run test:e2e          # Playwright end-to-end tests
npm run test:ct           # Playwright component tests

# Database
npm run db:start          # Start PostgreSQL container
npm run db:stop           # Stop PostgreSQL container
npm run db:reset          # Reset and re-run all migrations

# Build & type checking
npm run build             # Build all packages
npm run type-check        # TypeScript check across all packages
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/signup` | Register a new user |
| POST | `/api/v1/auth/login` | Log in, receive token pair |
| POST | `/api/v1/auth/logout` | Invalidate refresh token |
| POST | `/api/v1/auth/refresh` | Rotate tokens |

### User
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/users/me` | Get current user profile |
| PATCH | `/api/v1/users/me` | Update profile |
| PATCH | `/api/v1/users/me/password` | Change password |
| DELETE | `/api/v1/users/me` | Delete account |

### Charts & Presets
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/charts` | List saved charts |
| POST | `/api/v1/charts` | Save a chart |
| DELETE | `/api/v1/charts/:id` | Delete a chart |
| GET | `/api/v1/chart-presets` | List style presets |
| POST | `/api/v1/chart-presets` | Create a preset |

---

## Security

- Passwords hashed with **bcrypt** (12 rounds)
- Access tokens expire after **15 minutes**
- Refresh tokens expire after **7 days**, stored server-side with rotation on every use
- Refresh tokens are sent via **httpOnly cookies** — not accessible to JavaScript
- **Rate limiting**: 100 req/15 min globally, 5 req/15 min on auth endpoints
- **CORS**, **Helmet** security headers, and input validation via Zod on all endpoints

---

## License

Copyright (c) 2026 Philipp Demmelmair. All rights reserved. See [LICENSE](./LICENSE) for details.
