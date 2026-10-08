# 1. Software Requirements Specification (SRS)

**Product:** CampusKonnect: a private, verified and trusted campus marketplace and community platform.
**Scope of this document:** the MVP release, as defined in the product roadmap.

## 1.1 Problem statement

Students have things to sell and other students need them, but nothing connects the two well:

- Usable books, cycles and electronics go unused or get thrown away.
- WhatsApp groups are hard to search or organise, and listings disappear in chat history within a day.
- Public marketplaces put students in contact with unknown, unverified people.
- None of these tools is built for campus life, and none gives students a structured way to get academic guidance from peers.

## 1.2 Product vision

A **private, verified, campus-only** platform where students can **buy, sell, rent, ask seniors and share knowledge**. The platform rests on three properties: it is **Private**, **Verified** and **Trusted**.

## 1.3 Stakeholders and personas

| Persona          | Goal                                            | Key needs                                  |
| ---------------- | ----------------------------------------------- | ------------------------------------------ |
| Everyday Student | Occasionally buys or sells something cheap      | Simple, safe, spam-free                    |
| Active Seller    | Sells regularly, or clears a room at graduation | Manage many listings at once               |
| Cautious Renter  | Rents short-term (tool, costume, calculator)    | Clear terms, no deposit disputes           |
| Administrator    | Keeps the platform trustworthy                  | Fast report handling, banning, audit trail |

## 1.4 Functional requirements (MVP)

Priorities follow MoSCoW: **M** = Must, **S** = Should, **C** = Could.

### FR-1 Authentication and verified identity

| ID     | Requirement                                                                                                      | Priority |
| ------ | ---------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1.1 | A user can register only with an email address on an allowed college domain.                                     | M        |
| FR-1.2 | Registration sends an email verification link. Unverified users cannot sign in.                                  | M        |
| FR-1.3 | A user can log in with email and password and receives a short-lived access token plus a rotating refresh token. | M        |
| FR-1.4 | A user can log out, which revokes the refresh token.                                                             | M        |
| FR-1.5 | A user can request a password reset link by email and set a new password.                                        | S        |
| FR-1.6 | A user can resend the verification email.                                                                        | S        |
| FR-1.7 | Banned users cannot log in or refresh tokens.                                                                    | M        |

### FR-2 Profiles

| ID     | Requirement                                                                                                     | Priority |
| ------ | --------------------------------------------------------------------------------------------------------------- | -------- |
| FR-2.1 | A user can view and edit their profile (name, department, year, phone, bio, avatar).                            | M        |
| FR-2.2 | Anyone signed in can view another user's public profile and active listings. Contact details are **not** shown. | M        |
| FR-2.3 | A user can change their password.                                                                               | S        |

### FR-3 Marketplace

| ID     | Requirement                                                                                                                                                          | Priority |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-3.1 | A verified user can create a listing to **sell** or **rent** an item, with title, description, category, condition, price and up to 5 images.                        | M        |
| FR-3.2 | Rental listings carry terms: rate, rate period (day/week/month) and deposit.                                                                                         | M        |
| FR-3.3 | Users can browse a feed of active listings with full-text search, filters (category, type, condition, price range) and sorting (newest, price ascending/descending). | M        |
| FR-3.4 | Owners can edit, mark as sold, or delete their own listings.                                                                                                         | M        |
| FR-3.5 | The listing detail page shows images, price, condition, rental terms and public seller info.                                                                         | M        |

### FR-4 Transactions (requests and approval)

| ID     | Requirement                                                                                                                                           | Priority |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-4.1 | A buyer sends a "Request to Buy" or "Request to Rent" (with proposed dates) with an optional message. No contact details are shared.                  | M        |
| FR-4.2 | A user cannot request their own listing, and cannot hold more than one open request per listing.                                                      | M        |
| FR-4.3 | The seller sees incoming requests and can **approve** or **reject** them.                                                                             | M        |
| FR-4.4 | Approving a request reserves the listing and **unlocks contact details and chat** for both parties.                                                   | M        |
| FR-4.5 | Either party can cancel an open request. Cancelling an approved request makes the listing active again.                                               | M        |
| FR-4.6 | The seller marks the deal **completed**. A sale marks the listing sold and closes other pending requests. A rental makes the listing available again. | M        |
| FR-4.7 | Request status changes follow a defined state machine (see design doc).                                                                               | M        |

### FR-5 Messaging and notifications

| ID     | Requirement                                                                                               | Priority |
| ------ | --------------------------------------------------------------------------------------------------------- | -------- |
| FR-5.1 | Each approved request has a private conversation between buyer and seller.                                | M        |
| FR-5.2 | Only the two participants can read or post messages, and only while the request is approved or completed. | M        |
| FR-5.3 | Users receive in-app notifications for request events, new messages, and replies to their posts.          | M        |
| FR-5.4 | Users can mark notifications as read.                                                                     | S        |

### FR-6 Community and Ask-a-Senior

| ID     | Requirement                                                                             | Priority |
| ------ | --------------------------------------------------------------------------------------- | -------- |
| FR-6.1 | A user can create a post of type **Discussion** or **Doubt / Ask a Senior**, with tags. | M        |
| FR-6.2 | Users can comment on posts.                                                             | M        |
| FR-6.3 | Users can upvote posts and comments (one vote per user, toggleable).                    | M        |
| FR-6.4 | Comments are ordered by upvotes so the most helpful answer rises.                       | M        |
| FR-6.5 | Posts are searchable by text and filterable by type and tag, sortable by newest or top. | M        |
| FR-6.6 | Authors can edit or delete their posts and comments.                                    | S        |

### FR-7 Trust, safety and administration

| ID     | Requirement                                                                                                          | Priority |
| ------ | -------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-7.1 | Any user can report a user, listing, post or comment with a reason.                                                  | M        |
| FR-7.2 | Admins see a reports queue and can resolve (optionally removing the content or banning the user) or dismiss reports. | M        |
| FR-7.3 | Admins can list and search users, and ban or unban them.                                                             | M        |
| FR-7.4 | Admins can remove any listing, post or comment.                                                                      | M        |
| FR-7.5 | Every admin action is written to an append-only audit log, which admins can view.                                    | M        |
| FR-7.6 | The admin dashboard shows platform statistics.                                                                       | M        |

## 1.5 Non-functional requirements

| ID     | Category        | Requirement                                                                                                                                      |
| ------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| NFR-1  | Security        | Passwords hashed with bcrypt (cost ≥ 10). JWT access tokens expire in ≤ 15 min. Refresh tokens are rotated, stored hashed, and revocable.        |
| NFR-2  | Security        | All input is validated server-side. Authorisation is enforced server-side on every request.                                                      |
| NFR-3  | Security        | Sensitive routes (login, register, password reset) are rate limited. Security headers are set (Helmet). CORS is restricted to the client origin. |
| NFR-4  | Privacy         | Contact details (email, phone) are disclosed only to the counterparty of an approved request.                                                    |
| NFR-5  | Usability       | Mobile-first, responsive UI that works on a 360 px wide screen.                                                                                  |
| NFR-6  | Performance     | List endpoints are paginated. p95 API latency < 300 ms at 5,000 users on entry-level hosting.                                                    |
| NFR-7  | Maintainability | Modular monolith with clear module boundaries, a typed codebase (TypeScript strict mode), linting, formatting, and automated tests in CI.        |
| NFR-8  | Cost            | Runs on free or low-cost tiers: ₹0 for the prototype, ₹0–500 at MVP launch.                                                                      |
| NFR-9  | Portability     | External services (images, email) sit behind interfaces with local fallbacks, so the app runs fully offline in development.                      |
| NFR-10 | Auditability    | Admin actions are logged with actor, action, target and timestamp.                                                                               |

## 1.6 Out of scope for MVP (per roadmap)

- **V1:** full rental deposits workflow, real-time chat (Socket.IO), Google OAuth, admin announcements.
- **V2:** nested comment threads, ratings and reviews, advanced analytics, rental dispute flow.
- **Future:** multi-college expansion, native mobile app, monetisation, public API.

## 1.7 Assumptions and constraints

- A single college deployment. Allowed email domains are configured via environment variables.
- Transactions are settled offline, in person. The platform does not process payments.
- The team is small, so the architecture favours simplicity over distribution.
