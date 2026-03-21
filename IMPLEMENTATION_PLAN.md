# VideoEdit Pro AI Upgrade Plan

## MVP (implemented foundation)
1. **Auth + Session Layer**
   - App-level register/login/logout/me with JWT (cookie + bearer support).
   - Password hashing (scrypt), token signing (HMAC).
2. **Modern Product UX Shell**
   - Landing page for streamers/YouTubers/editors.
   - Auth forms and dashboard tabs (Create Job / Jobs / Gemini Settings).
3. **Gemini Settings + Secret Handling**
   - User-specific Gemini model + API key settings.
   - API key encrypted server-side (AES-256-GCM), never returned to client.
4. **AI Job Pipeline Skeleton**
   - Job model persisted to DB with source/profile/status/timelinePlan.
   - Profiles: `short_vertical` and `long_horizontal`.
   - Analyzer adapter abstraction with Gemini path + mock fallback.
5. **Source Integration in Dashboard**
   - Job form supports `upload`, `twitch_clip`, `twitch_vod` source types.
   - Existing Twitch endpoints remain for import/fetch operations.
6. **Persistence + Tests**
   - File DB (`apps/api/data/app-db.json`) for users/settings/jobs.
   - Core tests for security + auth + API client config.

## Phase 2 (next)
1. Native Gemini video/file upload flow (resumable file API, URI-backed media).
2. Worker queue (Redis/BullMQ) for async transcode + AI analyze + render pipeline.
3. FFmpeg timeline renderer for automatic cut/drop/merge from Gemini timeline output.
4. OAuth account linking (Twitch + YouTube publishing).
5. Team workspaces, multi-project assets, job retry and audit logs.
6. Production DB migration (Postgres + Prisma) and object storage (S3/R2).
