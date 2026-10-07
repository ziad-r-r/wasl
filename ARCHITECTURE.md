# Wasl architecture

1. Browser talks only to same-origin Next.js routes. No secrets are shipped to the client.
2. Session cookie is checked in `getUser()` against `sessions.token_hash`.
3. Feed query prefers followed accounts, then ranks public suggestions by likes and recency. Blocked, muted, and hidden posts are excluded.
4. Stories are selected with `expires_at > NOW()` so they disappear after 24 hours without a cron job.
5. Reels are posts with `kind = reel` plus a `reels` row for audio metadata. Views increment on detail open.
6. Messages persist in PostgreSQL. The API emits an in-process event; `server.mjs` fans it out over WebSocket to conversation members. The thread also polls every 4 seconds so a missed socket still converges.
7. Admin routes require `users.role = admin` and write to `audit_logs`.
