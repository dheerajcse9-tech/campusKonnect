# ADR-0002: PostgreSQL with Prisma ORM

- **Status:** Accepted
- **Context:** The data is highly relational (users ↔ listings ↔ requests ↔ conversations) and needs constraints, transactions and decent text search. The team works in TypeScript.
- **Decision:** Use PostgreSQL as the system of record, and Prisma for schema, migrations and a type-safe client.
- **Consequences:**
  - (+) The schema-first design doubles as documentation. Migrations are versioned in git. Queries are typed end to end.
  - (+) Managed PostgreSQL has free tiers on Render, Railway and Neon.
  - (−) Some advanced SQL (full-text ranking) needs `$queryRaw`. We accept this when search outgrows `ILIKE`.
