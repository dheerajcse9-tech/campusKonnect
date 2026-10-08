# 5. Engineering Process and Quality

## 5.1 Lifecycle

The implementation roadmap has six phases, and each is locked in before the next one starts:

| Phase        | Output                                 | Where                       |
| ------------ | -------------------------------------- | --------------------------- |
| A Foundation | Requirements, prototype, presentation  | `docs/01-requirements.md`   |
| B Design     | Architecture, database, API, UI/UX     | `docs/02`–`04`, `docs/adr/` |
| C Build      | MVP, module by module, tested as we go | `server/`, `client/`        |
| D Ship       | Deploy, pilot with real students       | `docs/06-deployment.md`     |
| E Grow       | College-wide launch, monitor, scale    |                             |
| F Beyond     | Multi-college, if the model proves out |                             |

Inside phase C the work is **incremental**. Each module (auth, listings, transactions, …) is designed, built, tested and committed as a separate, working increment.

## 5.2 Principles applied

| Principle                  | Where it shows up                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| **Separation of concerns** | routes / controllers / services / schemas layering; frontend `api` vs `features` vs `components` |
| **Single responsibility**  | One module per bounded context. One middleware per concern                                       |
| **Dependency inversion**   | `EmailService` and `StorageService` interfaces, with adapters chosen at runtime                  |
| **DRY**                    | Zod schemas are the single source of truth for validation _and_ types. Shared pagination helper  |
| **Fail fast**              | Environment validated at boot. Invalid input rejected at the edge                                |
| **Least privilege**        | Server-side authorisation on every route. Contact details only after approval                    |
| **Defence in depth**       | Validation, rate limiting, Helmet, CORS, hashed tokens, audit log                                |
| **KISS / YAGNI**           | Modular monolith instead of microservices. Polling instead of WebSockets for the MVP             |
| **Explicit state**         | Request lifecycle modelled as a tested state machine                                             |

## 5.3 Coding standards

- TypeScript in `strict` mode on both tiers.
- ESLint (typescript-eslint) and Prettier. CI fails on lint, type or format errors.
- Naming: `camelCase` for variables and functions, `PascalCase` for types and components, `kebab-case` or `module.layer.ts` for files.
- No `any` in application code without a justification comment.

## 5.4 Testing strategy

| Level                | Tooling                                              | Scope                                                                                |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Unit                 | Vitest                                               | Pure logic: request state machine, token helpers, pagination, formatting             |
| Integration (API)    | Vitest + Supertest + a real PostgreSQL test database | Every module's endpoints, including authorisation and error paths                    |
| Component            | Vitest + Testing Library                             | Key UI components and hooks                                                          |
| Manual / exploratory | Seed data                                            | End-to-end user journeys from the presentation (buy, rent, ask a senior, moderation) |

The integration tests reset the test database between files, so tests are independent and repeatable.

## 5.5 Version control

- `main` is always deployable. Work happens on feature branches and is merged by pull request.
- **Conventional Commits**: `feat(listings): …`, `fix(auth): …`, `docs: …`, `test: …`, `chore: …`.
- One commit per completed module or increment, with tests passing.

## 5.6 Definition of done (per module)

1. Requirements in the SRS are implemented.
2. Input validation and authorisation are in place.
3. Integration tests cover the happy path and the main failure paths.
4. Lint, typecheck and tests pass locally and in CI.
5. Documentation (API and design) is updated.
6. The work is committed with a descriptive conventional commit message and pushed.
