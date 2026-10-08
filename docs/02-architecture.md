# 2. Software Architecture

## 2.1 Architectural style: modular monolith

CampusKonnect is **one deployable backend application with cleanly separated internal modules** (see [ADR-0001](adr/0001-modular-monolith.md)). At this scale microservices would add operational cost without benefit. Clear internal boundaries keep it possible to split later.

```
┌─────────────────────────────────────────────────────────────┐
│ CLIENT   React + TypeScript + Tailwind (mobile-responsive)  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / JSON  (Bearer access token,
                            │                httpOnly refresh cookie)
┌───────────────────────────▼─────────────────────────────────┐
│ API LAYER  Express: helmet · cors · rate-limit · auth ·     │
│            zod validation · central error handler           │
├─────────────────────────────────────────────────────────────┤
│ MODULES   auth · users · listings · transactions ·          │
│           messaging · notifications · community · reports · │
│           admin                                             │
├─────────────────────────────────────────────────────────────┤
│ DATA & SERVICES  PostgreSQL (Prisma) · Cloudinary · Resend  │
└─────────────────────────────────────────────────────────────┘
```

## 2.2 Layering inside a module

Each backend module lives in `server/src/modules/<module>/` and follows the same layering:

| File              | Responsibility                                                                          | May depend on                              |
| ----------------- | --------------------------------------------------------------------------------------- | ------------------------------------------ |
| `*.routes.ts`     | HTTP wiring: path, middleware (auth, validation, rate limit) → controller               | controller, middleware                     |
| `*.controller.ts` | Translates HTTP ⇄ domain: reads validated input, calls the service, shapes the response | service                                    |
| `*.service.ts`    | Business rules, authorisation decisions, transactions                                   | Prisma client, other services, shared libs |
| `*.schemas.ts`    | Zod schemas for request validation (single source of truth for input types)             | zod                                        |

Dependencies point **inwards only**: routes → controller → service → data. Services never touch `req`/`res`, which keeps them unit-testable. Cross-module calls go through a module's service, never its tables directly. The one exception is read-only joins that Prisma relations express naturally.

## 2.3 Cross-cutting concerns (`server/src/lib`, `server/src/middleware`)

| Concern       | Implementation                                                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Configuration | `config/env.ts`: environment variables validated with zod at boot (fail fast)                                                            |
| Errors        | `AppError` hierarchy plus one central error middleware that maps errors to a uniform JSON shape `{ error: { code, message, details? } }` |
| Validation    | `validate({ body, query, params })` middleware using zod                                                                                 |
| AuthN         | `requireAuth` verifies the JWT access token and loads the user's role and status                                                         |
| AuthZ         | `requireRole('ADMIN')` plus ownership checks inside services                                                                             |
| Logging       | `pino` structured logs with a request id                                                                                                 |
| Rate limiting | `express-rate-limit` on auth and other sensitive routes                                                                                  |
| Email         | `EmailService` interface → `ResendEmailService` (prod) / `ConsoleEmailService` (dev, test)                                               |
| File storage  | `StorageService` interface → `CloudinaryStorage` (prod) / `LocalDiskStorage` (dev, test)                                                 |
| Audit         | `auditLog.record()` called by every admin action                                                                                         |

Email and storage use **dependency inversion**. The application depends on an interface, and the concrete adapter is chosen from configuration at startup. This satisfies NFR-9: the system runs fully offline.

## 2.4 Frontend architecture

```
client/src/
  api/          typed API client (fetch wrapper, token refresh) + per-module endpoint functions
  auth/         AuthContext (session state), route guards
  components/   reusable UI primitives (Button, Input, Card, Badge, Modal, ...) and layout
  features/     one folder per domain: marketplace, requests, messages, community, profile, admin
  pages/        route-level components composed from features
  lib/          formatting and helpers
```

- **Server state** uses TanStack Query (caching, refetching, mutations, invalidation).
- **Session state:** the access token is held in memory only. The refresh token is an httpOnly cookie, so JavaScript never sees it.
- **Routing** uses React Router, with `RequireAuth` and `RequireAdmin` guards.
- **Styling** uses Tailwind CSS, designed mobile-first.

## 2.5 Key flows

### Request → Approve → Connect (approval-gated contact)

```
Buyer                    API                          Seller
  │ POST /requests ───────►│ create PENDING request      │
  │                        │ notify seller ─────────────►│
  │                        │◄──── PATCH /requests/:id/approve
  │                        │ request APPROVED            │
  │                        │ listing RESERVED            │
  │                        │ conversation created        │
  │◄───────── notify buyer │                             │
  │ GET /requests/:id ────►│ contact details now visible │
  │ messages ◄────────────►│◄──────────────► messages    │
  │                        │◄──── PATCH /requests/:id/complete
  │                        │ request COMPLETED,          │
  │                        │ listing SOLD (or ACTIVE     │
  │                        │ again for rentals)          │
```

### Token lifecycle

1. Login returns `{ accessToken, user }` and sets the `ck_refresh` httpOnly cookie (path `/api/auth`).
2. The client sends `Authorization: Bearer <accessToken>`.
3. On a 401, the client calls `POST /api/auth/refresh`. The server verifies the hashed token in the database, **rotates** it (revokes the old one, issues a new one) and returns a new access token.
4. Reusing a revoked refresh token revokes all of that user's tokens (theft detection).

## 2.6 Deployment view

| Component  | Host                                       | Notes                                                                 |
| ---------- | ------------------------------------------ | --------------------------------------------------------------------- |
| Web client | Vercel                                     | Static build; `VITE_API_URL` points at the API                        |
| API        | Render or Railway                          | `npm run build && npm start`; runs `prisma migrate deploy` on release |
| Database   | Managed PostgreSQL (Render, Railway, Neon) |                                                                       |
| Images     | Cloudinary                                 | Optional. Falls back to local disk                                    |
| Email      | Resend                                     | Optional. Falls back to console logging                               |

For local development, `docker-compose.yml` starts PostgreSQL.

## 2.7 Scalability path

MVP → 1,000 users → 5,000 users → multi-college. Only hosting tiers change up to 5,000 users. Multi-college support would add a `College` entity and a tenant id on users and content, which the module boundaries already make tractable.
