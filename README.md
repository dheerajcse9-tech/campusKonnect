# CampusKonnect

> A trusted digital ecosystem where students exchange resources, opportunities and knowledge.
> **Private · Verified · Trusted**

CampusKonnect is a private, campus-only platform. Verified students can **buy, sell and rent** items, **ask seniors** for guidance and **share knowledge**. Contact is gated behind approval, and moderation is built in.

## Features (MVP)

| Area                  | What students get                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| **Verified identity** | College-email-only sign-up, email verification, password reset, secure sessions                      |
| **Marketplace**       | Sell or rent listings with photos, search, category/condition/price filters, sorting                 |
| **Transactions**      | Request to buy or rent, seller approval, contact details revealed only after approval, deal tracking |
| **Messaging**         | Private chat unlocked by an approved request, in-app notifications                                   |
| **Community**         | Discussion feed and _Ask a Senior_ doubts, upvoted answers, tags, search                             |
| **Trust & safety**    | Reports, admin moderation queue, suspensions, content removal, full audit log                        |
| **Experience**        | Polished responsive UI, dark mode, landing page, mobile tab bar, toasts and skeleton loaders         |

## Tech stack

| Layer    | Technology                                                                     |
| -------- | ------------------------------------------------------------------------------ |
| Web app  | React 19, TypeScript, Tailwind CSS v4, React Router, TanStack Query, Vite      |
| API      | Node.js 22, Express 5, TypeScript, Zod validation, Pino logging                |
| Data     | PostgreSQL 16, Prisma ORM                                                      |
| Services | Cloudinary (images), Resend (email). Both have local fallbacks for development |
| Hosting  | Vercel (web, with an `/api` proxy) and Render (API), plus Neon (PostgreSQL)    |

## Quick start (local development)

Prerequisites: Node.js ≥ 20, and PostgreSQL 16 (or Docker).

```bash
git clone https://github.com/dheerajcse9-tech/campusKonnect.git
cd campusKonnect
npm install

# 1. Database
docker compose up -d                       # or use a local PostgreSQL
cp server/.env.example server/.env          # defaults work with docker-compose

# 2. Schema and demo data
npm run db:migrate -w server
npm run db:seed -w server                   # prints demo logins (password: Password123)

# 3. Run (two terminals)
npm run dev:server                          # API on http://localhost:4000
npm run dev:client                          # app on http://localhost:5173
```

In development, emails (verification and reset links) are printed to the API console, and uploaded images are stored in `server/uploads/`.

## Scripts

| Command                                    | What it does                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `npm test`                                 | Server integration and unit tests (real PostgreSQL), then client unit tests |
| `npm run lint` / `npm run typecheck`       | ESLint and TypeScript strict checks on both workspaces                      |
| `npm run format:check`                     | Prettier                                                                    |
| `npm run build`                            | Production builds of the API and the web app                                |
| `npm run admin:grant -w server -- <email>` | Make a verified user an administrator (audited)                             |

Server tests need the `campuskonnect_test` database from `server/.env.test`:

```bash
createdb -U campus campuskonnect_test
```

## Repository layout

```
docs/      Requirements (SRS), architecture, database and API design, security, deployment, ADRs
server/    Express API: src/modules/<module>/{routes,controller,service,schemas}, prisma/, tests/
client/    React app: api/, auth/, components/, features/, pages/, theme/
```

## Documentation

- [Requirements (SRS)](docs/01-requirements.md)
- [Architecture](docs/02-architecture.md) and [Architecture decision records](docs/adr/)
- [Database design](docs/03-database-design.md)
- [API design](docs/04-api-design.md)
- [Engineering process and quality](docs/05-engineering-process.md)
- [Security and privacy](docs/06-security-and-privacy.md)
- [Deployment guide](docs/07-deployment.md)

## Quality

- 99 automated server tests run against a real PostgreSQL database. They cover every endpoint, the authorisation rules, the request state machine, concurrency, rate limiting and production configuration checks.
- Client unit tests cover the token-refresh logic and formatting.
- Every user journey in the project deck (buy, rent, Ask a Senior, moderation) has been verified end to end in a real browser.
- CI on GitHub Actions runs format, lint, typecheck, tests and production builds on every push and pull request.
