# 3. Database Design

PostgreSQL with the Prisma ORM. The authoritative schema is `server/prisma/schema.prisma`. This document explains the model and the reasoning behind it.

## 3.1 Entity–relationship overview

```
User 1───* Listing 1───* ListingImage
 │            │
 │            └──1───* TransactionRequest *───1 User (requester)
 │                          │
 │                          └──1───0..1 Conversation 1───* Message
 │
 ├──1───* Post 1───* Comment
 │          │          │
 │          *          *
 │       PostVote   CommentVote        (composite PK: userId + target)
 │
 ├──1───* Notification
 ├──1───* Report (as reporter)         Report.targetType/targetId → any entity
 ├──1───* AuditLog (as actor)
 └──1───* RefreshToken / EmailVerificationToken / PasswordResetToken
```

## 3.2 Entities

| Entity | Purpose | Notable fields |
| --- | --- | --- |
| `User` | A verified student or admin | `email` (unique, college domain), `passwordHash`, `role` (STUDENT/ADMIN), `status` (ACTIVE/BANNED), `emailVerifiedAt` |
| `RefreshToken` | Rotating refresh tokens | `tokenHash` (SHA-256), `expiresAt`, `revokedAt` |
| `EmailVerificationToken`, `PasswordResetToken` | One-time email tokens | `tokenHash`, `expiresAt`, `usedAt` |
| `Listing` | An item for sale or rent | `type` (SELL/RENT), `category`, `condition`, `price`, `rentPeriod`, `deposit`, `status` |
| `ListingImage` | Ordered listing images | `url`, `storageKey`, `position` |
| `TransactionRequest` | A buy or rent request and its lifecycle | `status`, `type`, `message`, `rentStartDate`, `rentEndDate`, `sellerId` (denormalised for fast "incoming" queries) |
| `Conversation` | Private chat unlocked by an approved request | `requestId` (unique, 1:1) |
| `Message` | A chat message | `body`, `senderId`, `readAt` |
| `Notification` | An in-app notification | `type`, `title`, `body`, `link`, `readAt` |
| `Post` | A community discussion or doubt | `type` (DISCUSSION/DOUBT), `tags[]`, `upvoteCount`, `commentCount`, `status` |
| `Comment` | An answer or comment on a post | `upvoteCount`, `status` |
| `PostVote`, `CommentVote` | One vote per user per target | Composite primary key |
| `Report` | A user report about content or a user | `targetType`, `targetId`, `reason`, `status`, `resolution` |
| `AuditLog` | Append-only record of admin actions | `actorId`, `action`, `targetType`, `targetId`, `metadata` (JSON) |

## 3.3 Enumerations

- `ListingCategory`: BOOKS, ELECTRONICS, CYCLES, FURNITURE, CLOTHING, STATIONERY, SPORTS, HOSTEL_ESSENTIALS, OTHER
- `ItemCondition`: NEW, LIKE_NEW, GOOD, FAIR, POOR
- `ListingStatus`: ACTIVE, RESERVED, SOLD, REMOVED
- `RentPeriod`: DAY, WEEK, MONTH
- `RequestStatus`: PENDING, APPROVED, REJECTED, CANCELLED, COMPLETED

## 3.4 Request state machine

```
             approve            complete
 PENDING ───────────► APPROVED ───────────► COMPLETED
    │                    │
    │ reject             │ cancel (either party)
    ▼                    ▼
 REJECTED            CANCELLED
    ▲
    │ cancel (requester) / auto-close when the listing is sold or removed
 PENDING ───────────► CANCELLED
```

Terminal states are REJECTED, CANCELLED and COMPLETED. The state machine is implemented as a pure function, `request-state.ts`, and unit tested.

Listing side effects:

| Event | Listing status |
| --- | --- |
| Request approved | ACTIVE → RESERVED |
| Approved request cancelled | RESERVED → ACTIVE |
| SELL request completed | RESERVED → SOLD. Other pending requests → REJECTED |
| RENT request completed | RESERVED → ACTIVE (item returned) |
| Listing removed by owner or admin | → REMOVED. Open requests → CANCELLED |

## 3.5 Design decisions

- **UUID primary keys** keep ids non-enumerable, so they don't leak row counts or invite scraping.
- **Money as integer rupees.** Campus second-hand prices don't need paise, and integers avoid floating-point errors.
- **Denormalised counters** (`upvoteCount`, `commentCount`) are updated in the same transaction as the vote or comment, so feed queries avoid aggregate joins.
- **Soft delete for moderated content** (`status = REMOVED`) keeps evidence for reports and the audit trail. Hard delete is used only for an owner's own listing that has no requests.
- **Tokens are stored as SHA-256 hashes**, so a database leak does not expose usable tokens.
- **Polymorphic reports** (`targetType` + `targetId`) avoid four nullable foreign keys. Integrity is checked in the service layer when a report is created.
- **Indexes** cover the hot query paths: listings by `(status, createdAt)`, `(category)`, `(sellerId)`; requests by `(sellerId, status)` and `(requesterId, status)`; notifications by `(userId, readAt)`; posts by `(status, createdAt)`.
- **Search** uses case-insensitive `ILIKE` on title and description for the MVP. Migrating to PostgreSQL full-text search (`tsvector` with a GIN index) is the documented next step once data volume justifies it.
