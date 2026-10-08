# ADR-0004: Pluggable adapters for email and image storage

- **Status:** Accepted
- **Context:** Production uses Resend (email) and Cloudinary (images), but developers and CI must be able to run the app without accounts or network access.
- **Decision:** Define `EmailService` and `StorageService` interfaces. Provide production adapters (Resend, Cloudinary) and local adapters (console logger, local disk under `/uploads`). The adapter is selected at startup based on whether credentials are configured.
- **Consequences:**
  - (+) Zero-config local setup. Tests are deterministic, and the email adapter can capture sent messages for assertions.
  - (+) Swapping providers later touches only one adapter file.
