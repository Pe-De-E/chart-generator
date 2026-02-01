# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack Vue 3 + TypeScript chart generator that creates SVG charts (bar, line, scatter, pie, area, elevation) from CSV/GPX data. Uses a monorepo architecture with pnpm workspaces.

## Development Commands

```bash
# Start both frontend and backend (requires Docker for PostgreSQL)
npm run dev:all           # Sets up DB and starts both servers

# Or start individually
npm run dev:frontend      # Frontend only at http://localhost:5173
npm run dev:backend       # Backend only at http://localhost:3000

# Database
npm run db:start          # Start PostgreSQL container
npm run db:stop           # Stop PostgreSQL container
pnpm --filter @chart-generator/backend db:migrate  # Run migrations
pnpm --filter @chart-generator/backend db:generate # Generate Prisma client
pnpm --filter @chart-generator/backend db:seed     # Seed database

# Testing
npm test                  # Run all tests
pnpm --filter @chart-generator/frontend test       # Frontend tests only
pnpm --filter @chart-generator/backend test        # Backend tests only

# Build
npm run build             # Build all packages
pnpm --filter @chart-generator/shared build        # Must build shared first

# Type checking
npm run type-check        # All packages
```

## Architecture

### Monorepo Structure

```
packages/
├── frontend/    # Vue 3 + Vuetify + Vite
├── backend/     # Fastify + Prisma + PostgreSQL
└── shared/      # TypeScript types shared between frontend/backend
```

The `@chart-generator/shared` package must be built before frontend/backend can import its types.

### Frontend Architecture

**Chart Generation System**: Pure functions in `src/utils/chartGenerators/` that return SVG strings:
- Each chart type (bar, line, scatter, pie, area, elevation) is a standalone module
- All generators follow the signature: `(options: ChartOptions) => string`
- Types are imported from the shared package via re-export in `types.ts`

**Component Workflow**: Multi-step chart creation process:
- `FileUploadStep` → `DataInspectionStep` → `DataCleaningStep` → `ChartCreationStep`
- `ChartGenerator.vue` orchestrates the workflow with split-pane layout (chart preview + data table)

**Composables** (`src/composables/`): Reusable Vue 3 composition functions:
- `useAuth` - Authentication state and token management
- `useChartConfig` - Chart configuration state
- `useDataCleaning` - CSV data cleaning operations
- `useVideoExport` - FFmpeg-based video export of animated charts

### Backend Architecture

**Fastify Server** with layered architecture:
- `routes/` → `controllers/` → `services/` pattern
- Validation with Zod schemas in `validators/`
- Prisma ORM for PostgreSQL

**Authentication**: JWT-based with refresh token rotation:
- Access tokens: 15 minutes, stored in sessionStorage
- Refresh tokens: 7 days, httpOnly cookies
- Auth middleware in `middleware/auth.middleware.ts`

### Data Flow

1. CSV/GPX uploaded → parsed into `DataPoint[]` or `SeriesDataPoint[]`
2. Data cleaning applied (optional)
3. User selects chart type → generator function called
4. Generator returns SVG string → rendered via `v-html`
5. Charts can be saved to backend (authenticated users)

## Testing

- Frontend: Vitest + jsdom + @vue/test-utils
- Backend: Vitest
- Test files are co-located with source (`.test.ts` suffix)
- Run single test: `pnpm --filter @chart-generator/frontend test src/path/to/file.test.ts`
