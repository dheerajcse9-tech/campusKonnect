# 6. Security and Privacy

CampusKonnect handles real students' identities, phone numbers and in-person meetings. This document records the threats we design against and the controls in place, so administrators and the college's IT team can review them.

## 6.1 Assets

| Asset                          | Why it matters                                           |
| ------------------------------ | -------------------------------------------------------- |
| Student accounts               | Verified identity is the basis of trust on the platform  |
| Contact details (email, phone) | Misuse enables harassment. Disclosed only after approval |
| Private messages               | Deal coordination, including meeting places              |
| Moderation powers              | A compromised admin could ban students or remove content |

## 6.2 Threats and controls

| Threat                       | Control                                                                                                                                                              | Where                                     |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Outsiders joining            | Registration only for configured college domains, plus a one-time email verification link                                                                            | `auth.service.ts`                         |
| Password guessing            | bcrypt (cost 12). Per-account login limit (10 per 15 min). Per-IP limit on auth routes                                                                               | `crypto.ts`, `rate-limit.ts`              |
| Account enumeration          | Same error and same bcrypt work for unknown emails and wrong passwords. Resend-verification and forgot-password always return 200                                    | `auth.service.ts`                         |
| Stolen session               | 15-minute access JWTs held in memory only. httpOnly refresh cookie. Rotation with reuse detection that revokes every session                                         | ADR-0003                                  |
| CSRF on cookie routes        | Refresh, logout and change-password require a custom header (forces a CORS preflight) and reject foreign `Origin`s                                                   | `csrf.ts`                                 |
| XSS                          | React escapes all output. Names and other user text are HTML-escaped in emails. Helmet security headers                                                              | `templates.ts`, `app.ts`                  |
| Malicious uploads            | Images verified by magic bytes (not the client-supplied MIME type). 5 MB size limit. Re-encoded by Cloudinary in production                                          | `image.ts`, `storage.service.ts`          |
| Contact harvesting           | Email and phone are never in public profiles or listings. They are revealed only to the counterparty of an approved request                                          | `transactions.service.ts`                 |
| Broken access control        | Authorisation decided server-side in services (ownership, participant and role checks). Admin routes use `requireRole('ADMIN')`. Covered by tests                    | `middleware/auth.ts`, tests               |
| Banned user keeps access     | User status re-read on every request. Ban revokes all refresh tokens and unwinds open deals                                                                          | `admin.service.ts`                        |
| Race conditions              | Optimistic concurrency on request transitions. Atomic listing reservation. Advisory lock against duplicate requests                                                  | `transactions.service.ts`                 |
| Rogue or mistaken moderation | Admin actions are atomic and audit-logged with a reason. Admins cannot ban other admins. The admin role is granted only from the server CLI, and that is audited too | `admin.service.ts`, `scripts/set-role.ts` |
| Misconfigured production     | The server refuses to start in production without unique secrets, https URLs, real email (Resend) and persistent image storage (Cloudinary)                          | `config/env.ts`                           |
| Abuse and flooding           | Per-user write limits. Baseline API limits. One open request per listing per student. Notification coalescing for chat                                               | `rate-limit.ts`                           |

### Campus NAT and rate limiting

College networks usually put hundreds of students behind a few public IP addresses. Signed-in traffic is therefore rate limited **per user**, and per-IP limits are set high, as a coarse flood guard only. Brute-force protection works **per target account**, not per IP.

## 6.3 Privacy

- **Data minimisation:** we store name, college email, an optional phone number, department, year and bio. We store no payment data, because deals are settled in person.
- **Right to erasure:** `POST /api/users/me/delete` (password plus typed confirmation) anonymises the account. It erases name, email, phone, bio and avatar, removes the user's listings and images, hides their posts and comments, cancels open deals (notifying the other party) and deletes their notifications and tokens. The anonymised row is kept so the other students' request history stays consistent. Messages already delivered to another student remain in that student's conversation history.
- **Retention:** moderation records (reports, audit log) are kept for accountability.
- **Before launch**, the operating college or team must publish a privacy policy and terms of use. These should explain the points above, name a contact for data requests, and state that meetups happen at the students' own discretion in public campus locations. This is a legal and organisational task, not a code task.

## 6.4 Operational checklist

- [ ] Generate `JWT_ACCESS_SECRET` with at least 48 random bytes. Never reuse it across environments.
- [ ] Set `ALLOWED_EMAIL_DOMAINS` to the college's real student domains only.
- [ ] Verify the sending domain in Resend (SPF/DKIM) so verification emails don't land in spam.
- [ ] Use `COOKIE_SAMESITE=none` only when the web app and API are on different sites. It needs HTTPS.
- [ ] Turn on automated daily database backups on the PostgreSQL host and test a restore.
- [ ] Create the first admin with `npm run admin:grant -- <email>`, and keep the admin list small.
- [ ] Monitor `/api/health` with an uptime checker.
- [ ] Review the audit log and open reports regularly.
