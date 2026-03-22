# ClipForge — AI-Powered Video Editing Platform

## 1. Concept & Vision

**ClipForge**, yayıncılar ve video editörleri için yapay zeka destekli, profesyonel bir video kurgulama platformudur. Twitch/YouTube yayınlarından veya manuel yüklemelerden otomatik olarak "önemli an" kliplerini çıkarır, bunları TikTok/Instagram Reels için dikey kısa videolar veya YouTube için yatay uzun videolar olarak derler.

**Odak:** Hız, profesyonellik, YouTube/Twitch/TikTok ekosistemi. "Yayından çıktıktan 5 dakika sonra paylaşıma hazır video" vaadi.

---

## 2. Design Language

### Color Palette
- **Background Dark:** `#0D0D0F`
- **Surface:** `#161619`
- **Surface Elevated:** `#1E1E22`
- **Border:** `#2A2A2F`
- **Primary:** `#7C5CFF` (Electric Purple)
- **Primary Hover:** `#6B4FE0`
- **Accent:** `#00E5A0` (Neon Green — AI/Success)
- **Text Primary:** `#F5F5F7`
- **Text Secondary:** `#A0A0A8`
- **Text Muted:** `#6B6B75`
- **Danger:** `#FF4D6A`
- **Warning:** `#FFB84D`

### Typography
- **Font:** Inter (headings), JetBrains Mono (code/ids)
- **Headings:** Inter 700, sizes 32/24/20/16px
- **Body:** Inter 400/500, 14/13px
- **Mono:** JetBrains Mono 400, 12px

### Spacing
- Base unit: 4px
- Component padding: 12px / 16px / 20px
- Section gap: 32px / 48px / 64px
- Border radius: 8px (cards), 6px (inputs), 12px (modals)

### Motion
- Page transitions: fade 200ms
- Button hover: scale(1.02) + glow, 150ms
- Skeleton loading: shimmer pulse 1.5s infinite
- Toast: slide-in from bottom-right, 300ms

---

## 3. Architecture

### Tech Stack
- **Frontend:** React 18 + Vite + TypeScript, TailwindCSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL via Coolify (Prisma ORM)
- **AI:** Google Gemini (video analysis), FFmpeg (processing)
- **Auth:** JWT-based with email/password + OAuth (X/Twitch/Google)
- **Storage:** Local filesystem (Coolify persistent volume) + optional S3
- **Queue:** Bull (Redis) for video processing jobs
- **Real-time:** SSE for job progress

### Monorepo Structure
```
apps/
  web/          # React frontend
  api/          # Express backend
packages/
  shared/       # Shared types, validators, constants
  ui/           # Shared UI components
prisma/
  schema.prisma
```

---

## 4. Features

### 4.1 Auth System
- **Register:** email + password, email verification
- **Login:** email/password, X OAuth, Twitch OAuth, Google OAuth
- **Password Reset:** email-based reset flow
- **Session:** JWT access tokens (15min) + refresh tokens (7 days)
- **API Keys:** User-generated API keys for external integrations

### 4.2 Dashboard (Ana Sayfa)
- **Stats Overview:** Toplam videolar, üretilen klipler, toplam süre, storage kullanımı
- **Recent Projects:** Son işlenen videolar listesi
- **Quick Actions:** "Video Yükle", "Twitch'e Bağlan", "Yeni Proje Oluştur"
- **Activity Feed:** Son işlemler (timeline)

### 4.3 Source Management (Panel)
- **Manuel Upload:** Drag-drop video yükleme (mp4, mov, webm), max 10GB
- **Twitch Integration:** Kanal bağlama, VOD listesi, otomatik çekme
- **YouTube Integration:** Video import (future)
- **Library:** Yüklenen tüm kaynak videoların listesi, thumbnail, süre, tarih

### 4.4 AI Analysis & Clip Detection
- **Video Processing Job:**
  1. Video FFmpeg ile segmentlere bölünür (30sn parçalar)
  2. Her segment Gemini'ye gönderilir → "Önemli an mı? Neden?"
  3. Gemini'den dönen önemli anlar timestamp olarak kaydedilir
  4. Kullanıcı onay/müdahale bekler
- **AI Settings Panel:**
  - Gemini API Key (user-provided)
  - Gemini Model: `gemini-2.0-flash-exp` (default), `gemini-1.5-pro`, `gemini-2.5-pro`
  - Detection Threshold: %0-100 (ne kadar "önemli" eşiği)
  - Min Clip Duration: 30-120sn
  - Max Clips Per Video: 5-20
  - Custom Prompt: "Bu yayında izleyicileri heyecanlandıran anları bul"

### 4.5 Clip Editor (Profesyonel Edit)
- **Timeline View:** Video timeline, önemli anlar işaretli
- **Clip Board:** Tespit edilen klipler listesi, her biri:
  - Start/End time (editable)
  - Title/description (AI-generated, editable)
  - "Bu klip iyi mi?" feedback butonu
  - Reel/Short veya YouTube target format
- **Manual Trim:** Drag to adjust start/end
- **Add Transition:** Fade, dissolve, cut
- **Caption/Subtitle:** Auto-generated (Whisper) + editable
- **Export Settings:**
  - Format: MP4 (H.264)
  - Resolution: 1080x1920 (9:16), 1920x1080 (16:9), 1080x1080 (1:1)
  - FPS: 30/60
  - Quality: Low/Medium/High/Max
  - Platform target: TikTok, Instagram, YouTube Shorts, YouTube, Custom

### 4.6 Export & Render
- **Queue System:** Jobs queued with Bull/Redis
- **Progress:** Real-time SSE updates (0-100%)
- **Output Formats:**
  - **Reels/Shorts/TikTok:** 9:16, 1080x1920, 30/60fps, max 3 min
  - **YouTube Long:** 16:9, 1920x1080, 30/60fps, 8-20 min
  - **Twitter/X Post:** 16:9 veya 1:1, max 140s
- **Auto-Posting (Future):**直接 tweet atma, TikTok upload (OAuth)

### 4.7 Project Management
- **Projects:** Bir video kaynağı + birden fazla clip/export
- **Templates:** Kaydedilmiş export ayarları
- **History:** Tüm işlem geçmişi

---

## 5. API Endpoints

### Auth
- `POST /api/auth/register` — Register
- `POST /api/auth/login` — Login
- `POST /api/auth/refresh` — Refresh token
- `POST /api/auth/logout` — Logout
- `POST /api/auth/forgot-password` — Password reset request
- `POST /api/auth/reset-password` — Reset password
- `GET /api/auth/oauth/:provider` — OAuth redirect
- `GET /api/auth/oauth/:provider/callback` — OAuth callback

### Users
- `GET /api/users/me` — Current user profile
- `PATCH /api/users/me` — Update profile
- `DELETE /api/users/me` — Delete account
- `POST /api/users/api-keys` — Create API key
- `DELETE /api/users/api-keys/:id` — Revoke API key

### Videos (Sources)
- `POST /api/videos/upload` — Upload video (multipart)
- `GET /api/videos` — List user's videos
- `GET /api/videos/:id` — Video details
- `DELETE /api/videos/:id` — Delete video
- `POST /api/videos/:id/analyze` — Trigger AI analysis

### Clips
- `GET /api/videos/:videoId/clips` — List detected clips
- `PATCH /api/clips/:id` — Update clip (trim, title, target)
- `DELETE /api/clips/:id` — Remove clip

### Projects
- `POST /api/projects` — Create project
- `GET /api/projects` — List projects
- `GET /api/projects/:id` — Project details
- `DELETE /api/projects/:id` — Delete project

### Exports
- `POST /api/exports` — Start export job
- `GET /api/exports` — List exports
- `GET /api/exports/:id` — Export details + download URL
- `DELETE /api/exports/:id` — Cancel/delete export
- `GET /api/exports/:id/progress` — SSE progress stream

### Settings
- `GET /api/settings/ai` — Get AI settings
- `PATCH /api/settings/ai` — Update AI settings

### Integrations
- `GET /api/integrations/twitch` — Twitch OAuth URL
- `GET /api/integrations/twitch/callback` — Twitch OAuth callback
- `GET /api/integrations/twitch/vods` — List Twitch VODs
- `POST /api/integrations/twitch/vods/:id/import` — Import VOD

---

## 6. Data Model

### User
- id, email, passwordHash, name, avatarUrl
- emailVerified, createdAt, updatedAt

### Video
- id, userId, title, filename, originalPath, duration, thumbnailPath
- status: 'uploading' | 'ready' | 'processing' | 'analyzed' | 'error'
- source: 'upload' | 'twitch' | 'youtube'
- sourceId (twitch_vod_id, youtube_video_id)
- createdAt

### Clip
- id, videoId, startTime, endTime, title, description
- targetFormat: 'reels' | 'shorts' | 'youtube' | 'twitter'
- status: 'pending' | 'approved' | 'rejected' | 'exporting' | 'done'
- aiScore (0-100)
- createdAt

### Project
- id, userId, videoId, name, description
- settings (JSON: transitions, captions, export presets)
- createdAt

### Export
- id, projectId, clipId, format, resolution, fps, quality
- status: 'queued' | 'processing' | 'done' | 'error'
- progress (0-100), outputPath, fileSize
- error (if failed)
- createdAt

### AISetting (per-user)
- userId, geminiApiKey, geminiModel, detectionThreshold
- minClipDuration, maxClipsPerVideo, customPrompt

### Integration (OAuth tokens)
- userId, provider: 'twitch' | 'google' | 'x'
- accessToken, refreshToken, expiresAt

### APIKey
- id, userId, key (hashed), name, lastUsedAt, createdAt

---

## 7. Pages

1. **`/`** — Landing page (hero, features, pricing CTA)
2. **`/login`** — Login
3. **`/register`** — Register
4. **`/dashboard`** — Main dashboard
5. **`/videos`** — Video library
6. **`/videos/:id`** — Video detail + AI analysis + clip editor
7. **`/projects`** — Projects list
8. **`/projects/:id`** — Project detail
9. **`/exports`** — Exports list + downloads
10. **`/settings`** — Account settings
11. **`/settings/ai`** — AI settings
12. **`/settings/integrations`** — Connected accounts (Twitch, etc.)
13. **`/settings/api-keys`** — API keys

---

## 8. Implementation Phases

### Phase 1: Foundation
- [ ] Monorepo setup (web + api)
- [ ] Database schema (Prisma)
- [ ] Auth system (JWT, register/login)
- [ ] Basic landing page
- [ ] Dashboard shell

### Phase 2: Video Management
- [ ] Video upload (multipart, progress)
- [ ] Video library page
- [ ] Video player with timeline
- [ ] FFmpeg integration (thumbnail generation)

### Phase 3: AI Integration
- [ ] Gemini API setup
- [ ] Video segmentation
- [ ] AI analysis job
- [ ] Clip detection UI
- [ ] AI settings panel

### Phase 4: Clip Editor
- [ ] Timeline component
- [ ] Clip trim/edit
- [ ] Export settings
- [ ] Render queue

### Phase 5: Integrations & Polish
- [ ] Twitch OAuth + VOD import
- [ ] Real-time progress (SSE)
- [ ] Auto-captioning (Whisper)
- [ ] Email notifications
- [ ] Landing page polish

---

## 9. Non-Goals (v1)
- Mobile app
- Team/collab features
- Stock media library
- Mobile video capture
- Direct social posting (TikTok/IG upload API limitations)
