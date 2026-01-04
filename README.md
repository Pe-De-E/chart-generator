# Chart Generator - Full-Stack Application

Ein Full-Stack Chart Generator mit Vue 3 Frontend und Node.js Backend mit Benutzerauthentifizierung.

## 🏗️ Architektur

- **Frontend**: Vue 3 + TypeScript + Vuetify + Vite
- **Backend**: Node.js + TypeScript + Fastify + Prisma
- **Database**: PostgreSQL
- **Monorepo**: pnpm workspaces

## 📁 Projektstruktur

```
chart-generator/
├── packages/
│   ├── frontend/          # Vue 3 Frontend
│   ├── backend/           # Fastify Backend API
│   └── shared/            # Geteilte TypeScript Types
├── docker-compose.yml     # PostgreSQL Development Setup
└── package.json           # Root Workspace Konfiguration
```

## 🚀 Getting Started

### Voraussetzungen

- Node.js 18+
- pnpm 8+
- Docker Desktop (für PostgreSQL)

### Installation

1. **Dependencies installieren**:
```bash
pnpm install
```

2. **PostgreSQL starten**:
```bash
npm run db:start
```

3. **Shared Types bauen**:
```bash
pnpm --filter @chart-generator/shared build
```

4. **Datenbank migrieren**:
```bash
pnpm --filter @chart-generator/backend db:generate
pnpm --filter @chart-generator/backend db:migrate
```

### Development

**Frontend + Backend gleichzeitig starten**:
```bash
npm run dev
```

Oder separat:

**Nur Frontend**:
```bash
npm run dev:frontend
```

**Nur Backend**:
```bash
npm run dev:backend
```

### URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Health Check**: http://localhost:3000/api/v1/health

## 🔐 Authentication Flow

1. Benutzer registriert sich über `/signup`
2. Login über `/login` generiert JWT Access Token (15min) + Refresh Token (7 Tage, httpOnly Cookie)
3. Access Token wird im sessionStorage gespeichert
4. Bei 401 Errors wird automatisch Token Refresh durchgeführt
5. Geschützte Routen sind nur mit gültiger Authentifizierung zugänglich

## 📡 API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Benutzer registrieren
- `POST /api/v1/auth/login` - Benutzer anmelden
- `POST /api/v1/auth/logout` - Benutzer abmelden
- `POST /api/v1/auth/refresh` - Access Token erneuern

### User Management
- `GET /api/v1/users/me` - Aktuellen Benutzer abrufen
- `PATCH /api/v1/users/me` - Profil aktualisieren
- `PATCH /api/v1/users/me/password` - Passwort ändern
- `DELETE /api/v1/users/me` - Account löschen

### Health Check
- `GET /api/v1/health` - API Status

## 🗄️ Datenbank

### Prisma Commands

```bash
# Datenbank migrieren
pnpm --filter @chart-generator/backend db:migrate

# Prisma Client generieren
pnpm --filter @chart-generator/backend db:generate

# Datenbank zurücksetzen (Vorsicht!)
pnpm --filter @chart-generator/backend db:reset
```

### Schema

- **users** - Benutzerkonten (email, password hash, name)
- **refresh_tokens** - JWT Refresh Tokens
- **charts** - Gespeicherte Charts (zukünftige Funktion)

## 🔒 Sicherheit

- Passwörter werden mit **bcrypt** (12 Rounds) gehasht
- JWT Access Tokens: **15 Minuten** Gültigkeit
- JWT Refresh Tokens: **7 Tage** Gültigkeit, httpOnly Cookies
- **Refresh Token Rotation** - neue Tokens bei jedem Refresh
- **Rate Limiting**: 100 Requests/15min (global), 5 Requests/15min (auth)
- **CORS** konfiguriert für localhost Development
- **Helmet** Security Headers

## 🧪 Testing

```bash
# Alle Tests
npm run test

# Nur Frontend Tests
pnpm --filter @chart-generator/frontend test

# Nur Backend Tests
pnpm --filter @chart-generator/backend test
```

## 🏗️ Build

```bash
# Alle Packages bauen
npm run build

# Nur Frontend
pnpm --filter @chart-generator/frontend build

# Nur Backend
pnpm --filter @chart-generator/backend build
```

## 📦 Deployment

### Backend

1. Environment Variables setzen (siehe `.env.example`)
2. Datenbank migrieren: `pnpm --filter @chart-generator/backend db:migrate`
3. Build: `pnpm --filter @chart-generator/backend build`
4. Start: `pnpm --filter @chart-generator/backend start`

### Frontend

1. Environment Variable `VITE_API_URL` setzen
2. Build: `pnpm --filter @chart-generator/frontend build`
3. Statische Files aus `packages/frontend/dist` deployen

## 🛠️ Technologie Stack

### Frontend
- Vue 3 (Composition API)
- TypeScript
- Vuetify 3 (Material Design)
- Vue Router 4
- Axios (HTTP Client)
- Vite (Build Tool)

### Backend
- Node.js + TypeScript
- Fastify (Web Framework)
- Prisma (ORM)
- PostgreSQL (Database)
- JWT (jsonwebtoken)
- bcrypt (Password Hashing)
- Zod (Validation)

### DevOps
- Docker Compose
- pnpm Workspaces
- tsx (TypeScript Execution)

## 🔮 Zukünftige Features

- Chart Persistenz (Charts in DB speichern/laden)
- Chart Sharing (Öffentliche Links)
- Email Verification
- Password Reset Flow
- OAuth Integration (Google, GitHub)
- Two-Factor Authentication
- Team/Workspace Support

## 📝 Lizenz

MIT
