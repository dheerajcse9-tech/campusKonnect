# 4. API Design

REST over JSON. Base path: `/api`. All endpoints except those under `/api/auth` and `/api/health` require `Authorization: Bearer <accessToken>`.

## 4.1 Conventions

- **Errors** use one uniform shape:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Invalid request", "details": [...] } }
  ```
  Codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500).
- **Pagination:** `?page=1&limit=20` returns `{ items, page, limit, total, totalPages }`.
- **Timestamps** are ISO-8601 UTC strings.
- **Money** is integer rupees.

## 4.2 Endpoints

### Health

| Method | Path      | Description                       |
| ------ | --------- | --------------------------------- |
| GET    | `/health` | Liveness check plus database ping |

### Auth (`/auth`)

| Method | Path                        | Body                                            | Description                                                   |
| ------ | --------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| POST   | `/auth/register`            | `{ name, email, password, department?, year? }` | Create an account and send the verification email             |
| POST   | `/auth/verify-email`        | `{ token }`                                     | Verify email                                                  |
| POST   | `/auth/resend-verification` | `{ email }`                                     | Re-send the verification email (always 200)                   |
| POST   | `/auth/login`               | `{ email, password }`                           | Returns `{ accessToken, user }` and sets the refresh cookie   |
| POST   | `/auth/refresh`             | cookie                                          | Rotates the refresh token and returns `{ accessToken, user }` |
| POST   | `/auth/logout`              | cookie                                          | Revokes the refresh token                                     |
| POST   | `/auth/forgot-password`     | `{ email }`                                     | Sends a reset link (always 200)                               |
| POST   | `/auth/reset-password`      | `{ token, password }`                           | Sets a new password and revokes all sessions                  |
| POST   | `/auth/change-password`     | `{ currentPassword, newPassword }`              | Authenticated. Signs out every other session                  |

### Users (`/users`)

| Method | Path               | Description                         |
| ------ | ------------------ | ----------------------------------- |
| GET    | `/users/me`        | Current user's private profile      |
| PATCH  | `/users/me`        | Update profile                      |
| POST   | `/users/me/avatar` | Upload avatar (multipart `image`)   |
| GET    | `/users/:id`       | Public profile plus active listings |

### Listings (`/listings`)

| Method | Path                            | Description                                                                                                                |
| ------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/listings`                     | Feed. Query: `q, category, type, condition, minPrice, maxPrice, sellerId, sort=newest\|price_asc\|price_desc, page, limit` |
| GET    | `/listings/mine`                | Current user's listings (all statuses)                                                                                     |
| GET    | `/listings/:id`                 | Listing detail                                                                                                             |
| POST   | `/listings`                     | Create (multipart: fields plus up to 5 `images`)                                                                           |
| PATCH  | `/listings/:id`                 | Update fields (owner)                                                                                                      |
| POST   | `/listings/:id/images`          | Add images (owner)                                                                                                         |
| DELETE | `/listings/:id/images/:imageId` | Remove an image (owner)                                                                                                    |
| PATCH  | `/listings/:id/status`          | `{ status: ACTIVE\|SOLD }` (owner)                                                                                         |
| DELETE | `/listings/:id`                 | Remove (owner)                                                                                                             |

### Requests (`/requests`)

| Method | Path                     | Description                                                             |
| ------ | ------------------------ | ----------------------------------------------------------------------- |
| POST   | `/requests`              | `{ listingId, message?, rentStartDate?, rentEndDate? }`                 |
| GET    | `/requests`              | `?role=incoming\|outgoing&status=`                                      |
| GET    | `/requests/:id`          | Detail. Includes counterparty contact **only if** approved or completed |
| POST   | `/requests/:id/approve`  | Seller                                                                  |
| POST   | `/requests/:id/reject`   | Seller                                                                  |
| POST   | `/requests/:id/cancel`   | Either party                                                            |
| POST   | `/requests/:id/complete` | Seller                                                                  |

### Messaging (`/conversations`)

| Method | Path                          | Description                                           |
| ------ | ----------------------------- | ----------------------------------------------------- |
| GET    | `/conversations`              | My conversations with last message and unread count   |
| GET    | `/conversations/:id/messages` | `?after=<iso>`: messages, marks incoming ones as read |
| POST   | `/conversations/:id/messages` | `{ body }`                                            |

### Notifications (`/notifications`)

| Method | Path                      | Description                   |
| ------ | ------------------------- | ----------------------------- |
| GET    | `/notifications`          | Paginated, plus `unreadCount` |
| POST   | `/notifications/:id/read` | Mark one as read              |
| POST   | `/notifications/read-all` | Mark all as read              |

### Community (`/posts`, `/comments`)

| Method | Path                   | Description                                                         |
| ------ | ---------------------- | ------------------------------------------------------------------- |
| GET    | `/posts`               | `q, type, tag, authorId, sort=newest\|top, page, limit`             |
| POST   | `/posts`               | `{ title, body, type, tags[] }`                                     |
| GET    | `/posts/:id`           | Post with comments (sorted by upvotes) and `viewerHasUpvoted` flags |
| PATCH  | `/posts/:id`           | Author                                                              |
| DELETE | `/posts/:id`           | Author                                                              |
| POST   | `/posts/:id/upvote`    | Toggle. Returns `{ upvoted, upvoteCount }`                          |
| POST   | `/posts/:id/comments`  | `{ body }`                                                          |
| PATCH  | `/comments/:id`        | Author                                                              |
| DELETE | `/comments/:id`        | Author                                                              |
| POST   | `/comments/:id/upvote` | Toggle                                                              |

### Reports (`/reports`)

| Method | Path       | Description                                  |
| ------ | ---------- | -------------------------------------------- |
| POST   | `/reports` | `{ targetType, targetId, reason, details? }` |

### Admin (`/admin`, role ADMIN)

| Method | Path                         | Description                           |
| ------ | ---------------------------- | ------------------------------------- |
| GET    | `/admin/stats`               | Dashboard counters                    |
| GET    | `/admin/users`               | `q, status, page`                     |
| POST   | `/admin/users/:id/ban`       | `{ reason }`                          |
| POST   | `/admin/users/:id/unban`     |                                       |
| GET    | `/admin/reports`             | `status, targetType, page`            |
| POST   | `/admin/reports/:id/resolve` | `{ note?, removeContent?, banUser? }` |
| POST   | `/admin/reports/:id/dismiss` | `{ note? }`                           |
| POST | `/admin/listings/:id/remove` | `{ reason }`: remove a listing (soft delete, author notified) |
| POST | `/admin/posts/:id/remove` | `{ reason }`: remove a post (soft delete, author notified) |
| POST | `/admin/comments/:id/remove` | `{ reason }`: remove a comment (soft delete, author notified) |
| GET    | `/admin/audit-logs`          | Paginated audit trail                 |
