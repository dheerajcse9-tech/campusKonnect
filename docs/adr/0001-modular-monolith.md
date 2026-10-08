# ADR-0001: Modular monolith instead of microservices

- **Status:** Accepted
- **Context:** A small student team is building for 1–5k users on free or low-cost hosting. The domain has several bounded contexts (auth, listings, transactions, messaging, community, admin) that share users and need transactional consistency. For example, approving a request reserves the listing and opens a conversation in a single step.
- **Decision:** Ship one deployable Express application. Each bounded context is a module in `server/src/modules/` with its own routes, controller, service and validation schemas. Modules talk to each other only through service functions.
- **Consequences:**
  - (+) One deploy, one database, and ACID transactions across modules. Cheap to host and easy to debug.
  - (+) Clear seams, so a module can be extracted later if one ever needs to scale independently.
  - (−) All modules scale together. That is acceptable at the target scale.
