# 🚀 Quickstart Guide

## ⚡ Super-Schnellstart (empfohlen)

**Wichtig**: Stelle sicher, dass **Docker Desktop läuft**!

### 1. Dependencies installieren
```bash
pnpm install
```

### 2. ALLES mit einem Befehl starten
```bash
pnpm dev:all
```

Das war's! 🎉 Dieser Befehl:
- ✅ Startet Docker (PostgreSQL + Redis)
- ✅ Wartet bis die Datenbank bereit ist
- ✅ Führt Prisma Migrations aus
- ✅ Startet Frontend + Backend parallel

Öffne dann:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

---

## 🔧 Manuelles Setup (falls du mehr Kontrolle willst)

### 1. Dependencies installieren
```bash
pnpm install
```

### 2. Shared Types bauen
```bash
pnpm --filter @chart-generator/shared build
```

### 3. Datenbank Setup
```bash
pnpm db:setup
```

Dies startet Docker, wartet auf PostgreSQL und generiert Prisma Client.

### 4. Datenbank migrieren (nur beim ersten Mal)
```bash
pnpm --filter @chart-generator/backend db:migrate
```

Beim ersten Mal wird nach einem Migration-Namen gefragt. Drücke einfach **Enter** für den Default.

### 5. Development Server starten
```bash
pnpm dev
```

Dies startet:
- **Frontend** auf http://localhost:5173
- **Backend API** auf http://localhost:3000

---

## Erste Schritte

1. Öffne http://localhost:5173 im Browser
2. Du wirst zur Login-Seite weitergeleitet
3. Klicke auf **"Registrieren"**
4. Erstelle einen Account:
   - E-Mail: deine@email.de
   - Passwort: mindestens 8 Zeichen, 1 Großbuchstabe, 1 Kleinbuchstabe, 1 Zahl
5. Nach erfolgreicher Registrierung wirst du automatisch eingeloggt
6. Du siehst nun den Chart Generator!

---

## Problembehebung

### PostgreSQL läuft nicht
```bash
# PostgreSQL stoppen und neu starten
npm run db:stop
npm run db:start
```

### Datenbank zurücksetzen
```bash
pnpm --filter @chart-generator/backend db:reset
```

### Frontend kompiliert nicht
```bash
# Shared types neu bauen
pnpm --filter @chart-generator/shared build

# Frontend neu starten
npm run dev:frontend
```

### Backend startet nicht
```bash
# .env Datei überprüfen
cat packages/backend/.env

# Prisma Client neu generieren
pnpm --filter @chart-generator/backend db:generate
```

---

## Nützliche Commands

```bash
# 🚀 ALLES starten (Docker + DB Setup + Dev Server)
pnpm dev:all

# 💻 Nur Dev Server (Frontend + Backend)
pnpm dev

# 🎨 Nur Frontend starten
pnpm dev:frontend

# ⚙️ Nur Backend starten
pnpm dev:backend

# 🐳 Datenbank Setup (Docker + Migrations)
pnpm db:setup

# 🔄 PostgreSQL starten
pnpm db:start

# 🛑 PostgreSQL stoppen
pnpm db:stop

# 🔍 Type-Checking (alle Packages)
pnpm type-check

# 🧪 Tests ausführen
pnpm test

# 📦 Build für Production
pnpm build
```

---

## API testen (mit curl oder Postman)

### Health Check
```bash
curl http://localhost:3000/api/v1/health
```

### Registrieren
```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123",
    "firstName": "Max",
    "lastName": "Mustermann"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

---

## Viel Erfolg! 🎉
