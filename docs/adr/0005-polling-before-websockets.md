# ADR-0005: Polling for chat in the MVP; Socket.IO in V1

- **Status:** Accepted
- **Context:** Approval-gated chat is an MVP feature. The roadmap places real-time chat (Socket.IO) in V1. Free-tier hosts may sleep idle instances and complicate sticky WebSocket sessions.
- **Decision:** The MVP exposes a REST messaging API. The client polls an open conversation every few seconds using `?after=<timestamp>`, and refreshes notification counts on a longer interval.
- **Consequences:**
  - (+) Simple, stateless, and works on any host.
  - (−) Up to a few seconds of latency and some redundant requests. Acceptable for in-person deal coordination.
  - When we move to V1, the message service stays the same and a Socket.IO gateway is added to push the events it already produces.
