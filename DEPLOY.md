# Video Edit - Deployment Checklist

**App Name:** videoEdit  
**Domain:** http://edit.mesutapps.online  
**Repository:** gummest/videoEdit  
**Branch:** master  
**Status:** 🟡 Ready for Deploy (waiting for backend completion)

---

## Prerequisites

- [ ] GitHub repository `gummest/videoEdit` exists with code pushed to `master`
- [ ] Backend video processing API ready (`apps/api`)
- [ ] Frontend UI ready (`apps/web`)
- [ ] Nixpacks config with ffmpeg dependency

---

## 1. Coolify App Creation

### API Credentials
```bash
COOLIFY_TOKEN="NEKL60PZ1bp7XpDAXHmy4qFanQDGRUXe7MakntB9acda3262"
COOLIFY_API="https://panel.mesutapps.online/api/v1"
```

### Create Application (POST /applications/private-github-app)

```bash
curl -X POST "${COOLIFY_API}/applications/private-github-app" \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "videoEdit",
    "project_uuid": "x88ws0ococwk0kskcgsksw04",
    "environment_uuid": "agkso00og4sokkk0ksgk0gok",
    "destination_uuid": "o088c8c4044wsowkookwcok4",
    "server_uuid": "wo048k008gwc8kkg84cwggoc",
    "github_app_uuid": "uk8o0g4w04ok84ggcocgok4k",
    "build_pack": "nixpacks",
    "git_repository": "gummest/videoEdit",
    "git_branch": "master",
    "ports_exposes": "3000"
  }'
```

**Expected Response:**
```json
{
  "uuid": "<APP_UUID>",
  "domains": "http://<sslip.io-domain>"
}
```

### Set Domain & Build Commands (PATCH /applications/{uuid})

Replace `<APP_UUID>` with the UUID from the previous response:

```bash
curl -X PATCH "${COOLIFY_API}/applications/<APP_UUID>" \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "domains": "http://edit.mesutapps.online",
    "build_command": "npm install && npm run build",
    "start_command": "npm run start"
  }'
```

> **⚠️ Important:** Use `http://` (not https) to avoid redirect loops with Cloudflare Tunnel + Traefik.

---

## 2. Nixpacks Config for ffmpeg

Create `nixpacks.toml` in repository root:

```toml
[phases.setup]
nixPkgs = ["nodejs_20", "ffmpeg"]

[phases.install]
cmds = ["npm install"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm run start"
```

**Or** use environment variable via Coolify API:

```bash
curl -X PATCH "${COOLIFY_API}/applications/<APP_UUID>" \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "nixpacks_config": "[phases.setup]\nnixPkgs = [\"nodejs_20\", \"ffmpeg\"]"
  }'
```

---

## 3. Cloudflare DNS Setup

### API Credentials
```bash
CF_TOKEN="RzQrOdRshRXbG01ibMcZ4ty_2cXSvRfE7tc2BhkP"
CF_ZONE="4c5fa0562c5edac6f903e43dc98f8727"
CF_API="https://api.cloudflare.com/client/v4"
```

### Create CNAME Record

```bash
curl -X POST "${CF_API}/zones/${CF_ZONE}/dns_records" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CNAME",
    "name": "edit",
    "content": "2ca40277-901c-4aa1-a42a-afb359db9bc6.cfargotunnel.com",
    "ttl": 1,
    "proxied": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "id": "<DNS_RECORD_ID>",
    "name": "edit.mesutapps.online",
    ...
  }
}
```

---

## 4. Cloudflare Tunnel Ingress Update

The tunnel routes to localhost (Traefik handles routing). Traefik will automatically pick up the new app based on the FQDN label.

**If manual tunnel config update is needed:**

Check current tunnel config:
```bash
curl -s -X GET "${CF_API}/accounts/<ACCOUNT_ID>/cfd_tunnel/2ca40277-901c-4aa1-a42a-afb359db9bc6/configurations" \
  -H "Authorization: Bearer ${CF_TOKEN}"
```

Ingress rule format (add to config.yml or via API):
```yaml
ingress:
  - hostname: edit.mesutapps.online
    service: http://localhost:80
  # ... existing rules ...
  - service: http_status:404
```

> **Note:** With Coolify + Traefik setup, the tunnel points to localhost and Traefik handles routing based on Host headers. No tunnel config update typically needed.

---

## 5. Trigger Deployment

```bash
# Deploy the app
curl -X GET "${COOLIFY_API}/deploy?uuid=<APP_UUID>" \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}"
```

### Check Deployment Status

```bash
curl -s "${COOLIFY_API}/deployments?uuid=<APP_UUID>" \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}"
```

### Restart if Needed

```bash
curl -X POST "${COOLIFY_API}/applications/<APP_UUID>/restart" \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}"
```

---

## 6. Smoke Tests

After deployment completes:

### 6.1 Basic Health Check
```bash
curl -I https://edit.mesutapps.online
# Expected: HTTP 200 OK
```

### 6.2 Homepage Loads
```bash
curl -s https://edit.mesutapps.online | head -20
# Expected: HTML with React app root
```

### 6.3 API Endpoint Check
```bash
curl -s https://edit.mesutapps.online/api/health 2>/dev/null || echo "Check API path"
```

### 6.4 Upload UI Visible (Manual)
- Open browser: https://edit.mesutapps.online
- Verify file upload zone visible
- Verify config form visible

### 6.5 Video Processing Test
```bash
# Test with sample video (requires actual file)
curl -X POST https://edit.mesutapps.online/api/process \
  -F "video=@test-video.mp4" \
  -F "totalLength=30" \
  -F "cutDuration=3"
# Expected: Processed video download
```

---

## 7. Rollback Procedure

### If Deploy Fails:

1. **Check Logs:**
```bash
curl -s "${COOLIFY_API}/applications/<APP_UUID>/logs" \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}"
```

2. **Redeploy Previous Commit:**
```bash
# Get deployments list
curl -s "${COOLIFY_API}/deployments?uuid=<APP_UUID>" \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}"

# Rollback via Git
cd /path/to/repo
git revert HEAD
git push origin master
# Then redeploy via Coolify
```

3. **Delete App (Full Rollback):**
```bash
curl -X DELETE "${COOLIFY_API}/applications/<APP_UUID>" \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}"
```

4. **Remove DNS Record:**
```bash
curl -X DELETE "${CF_API}/zones/${CF_ZONE}/dns_records/<DNS_RECORD_ID>" \
  -H "Authorization: Bearer ${CF_TOKEN}"
```

---

## Environment Variables (if needed)

Set via Coolify UI or API:

```bash
curl -X PATCH "${COOLIFY_API}/applications/<APP_UUID>/envs" \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "NODE_ENV",
    "value": "production"
  }'
```

Common env vars:
- `NODE_ENV=production`
- `PORT=3000`
- `MAX_FILE_SIZE=500mb`

---

## Quick Deploy Script

Save as `deploy-videoedit.sh`:

```bash
#!/bin/bash
set -e

COOLIFY_TOKEN="NEKL60PZ1bp7XpDAXHmy4qFanQDGRUXe7MakntB9acda3262"
COOLIFY_API="https://panel.mesutapps.online/api/v1"
CF_TOKEN="RzQrOdRshRXbG01ibMcZ4ty_2cXSvRfE7tc2BhkP"
CF_ZONE="4c5fa0562c5edac6f903e43dc98f8727"
CF_API="https://api.cloudflare.com/client/v4"

echo "🚀 Creating Coolify app..."
APP_RESPONSE=$(curl -s -X POST "${COOLIFY_API}/applications/private-github-app" \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "videoEdit",
    "project_uuid": "x88ws0ococwk0kskcgsksw04",
    "environment_uuid": "agkso00og4sokkk0ksgk0gok",
    "destination_uuid": "o088c8c4044wsowkookwcok4",
    "server_uuid": "wo048k008gwc8kkg84cwggoc",
    "github_app_uuid": "uk8o0g4w04ok84ggcocgok4k",
    "build_pack": "nixpacks",
    "git_repository": "gummest/videoEdit",
    "git_branch": "master",
    "ports_exposes": "3000"
  }')

APP_UUID=$(echo "$APP_RESPONSE" | grep -o '"uuid":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "📦 App UUID: $APP_UUID"

echo "🔧 Setting domain and build commands..."
curl -s -X PATCH "${COOLIFY_API}/applications/${APP_UUID}" \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "domains": "http://edit.mesutapps.online",
    "build_command": "npm install && npm run build",
    "start_command": "npm run start"
  }'

echo "🌐 Creating Cloudflare DNS record..."
curl -s -X POST "${CF_API}/zones/${CF_ZONE}/dns_records" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CNAME",
    "name": "edit",
    "content": "2ca40277-901c-4aa1-a42a-afb359db9bc6.cfargotunnel.com",
    "ttl": 1,
    "proxied": true
  }'

echo "🏗️ Triggering deployment..."
curl -s -X GET "${COOLIFY_API}/deploy?uuid=${APP_UUID}" \
  -H "Authorization: Bearer ${COOLIFY_TOKEN}"

echo "✅ Deployment triggered! Monitor at: https://panel.mesutapps.online"
echo "🌍 Site will be available at: https://edit.mesutapps.online"
```

---

## Estimated Deploy Time

| Step | Time |
|------|------|
| Create Coolify App | ~5 sec |
| Set Domain/Config | ~5 sec |
| Create DNS Record | ~5 sec |
| Build (Nixpacks + Node) | ~2-5 min |
| Container Start | ~30 sec |
| DNS Propagation | ~30 sec |
| **Total** | **~3-6 min** |

---

## Status Checklist

- [x] Coolify API credentials verified
- [x] Cloudflare API credentials verified
- [x] Project/Environment UUIDs identified
- [x] Server/Destination UUIDs identified
- [x] GitHub App UUID identified
- [x] DNS config prepared
- [x] Nixpacks ffmpeg config prepared
- [x] Smoke tests defined
- [x] Rollback procedure documented

**Ready to deploy when Backend agent signals completion!** 🟢
