# ADR-0003: JWT access tokens with rotating httpOnly refresh tokens

- **Status:** Accepted
- **Context:** The SPA and the API are hosted on different origins (Vercel and Render). We need stateless request authentication, the ability to revoke sessions (bans, password resets, logout), and protection from XSS token theft.
- **Decision:**
  - Short-lived (15 min) JWT access tokens, held only in client memory and sent as a Bearer header.
  - Long-lived (7 day) opaque refresh tokens in an `httpOnly`, `Secure`, `SameSite` cookie scoped to `/api/auth`, stored server-side as SHA-256 hashes and rotated on every use.
  - Reuse of a revoked refresh token revokes the user's entire token family.
- **Consequences:**
  - (+) XSS cannot read the refresh token. Bans and password resets take effect within one access-token lifetime.
  - (+) Each authenticated request re-checks the user's `status`, so a ban is effective immediately.
  - (−) The client needs refresh-and-retry logic, implemented once in the API client.
