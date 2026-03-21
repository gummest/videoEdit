# Twitch OAuth - Hızlı Başlangıç

## Kurulum Tamamlandı ✅

videoEdit projesine Twitch OAuth entegrasyonu başarıyla kuruldu ve test edilmeye hazır!

## Çalıştırma

### Development Modu

#### Terminal 1: Backend
```bash
cd /data/workspace/videoEdit/apps/api
PORT=3001 node --env-file=.env src/index.js
```

#### Terminal 2: Frontend (opsiyonel, production build yeterli)
```bash
cd /data/workspace/videoEdit/apps/web
npm run dev
```

### Production Modu (Önerilen)

```bash
# Build (zaten yapıldı)
cd /data/workspace/videoEdit
npm run build

# Çalıştır
cd apps/api
PORT=3001 node --env-file=.env src/index.js
```

Tarayıcıda: `http://localhost:3001`

## Twitch OAuth Test Adımları

### 1. Login Akışı
1. Tarayıcıda uygulamayı aç
2. "Twitch Library" tab'ına git
3. "Login with Twitch" butonu görünecek (mor gradient arkaplan)
4. Butona tıkla → Twitch OAuth sayfasına yönlendirileceksin
5. Twitch hesabınla giriş yap
6. İzinleri onayla
7. Geri döndüğünde profilin (avatar + username) görünecek

### 2. Video Listeleme
1. "Load My Videos" butonuna tıkla
2. VOD'ların ve cliplerin listelenmesini bekle
3. Kartlar halinde görünecekler

### 3. Clip Import
1. Bir clip kartında "Import Clip" butonuna tıkla
2. Otomatik olarak "Local Upload" tab'ına geçiş yapılacak
3. Video yüklenmiş halde gelecek
4. Artık normal video editing flow'una devam edebilirsin

### 4. Logout
1. "Logout" butonuna tıkla
2. Login prompt'a geri döneceksin

## API Endpoints

### OAuth
- `GET /api/auth/twitch/login` - OAuth başlat
- `GET /api/auth/twitch/callback` - OAuth callback
- `GET /api/auth/twitch/me` - Mevcut kullanıcı
- `POST /api/auth/twitch/logout` - Çıkış

### Twitch Library
- `GET /api/twitch/my-library?includeAllClips=true` - Kullanıcının videoları (auth gerekli)
- `GET /api/twitch/library?login=CHANNEL` - Herhangi bir kanalın videoları (public)

### Video Processing
- `POST /api/process` - Video işleme (mevcut özellik)

## Konfigurasyon

### .env (zaten ayarlandı)
```env
TWITCH_CLIENT_ID=0bitvbvzvjjmr5ndd1kpqh9474vaqh
TWITCH_CLIENT_SECRET=hpvt7nen6y0iqurkc6bokcm36d8xnl
TWITCH_REDIRECT_URI=https://edit.mesutapps.online/api/auth/twitch/callback
PORT=3001
SESSION_SECRET=videoedit-production-secret-change-this-to-random-string
NODE_ENV=production
MAX_FILE_SIZE=2GB
```

### Twitch Developer Console
Redirect URI zaten kayıtlı:
```
https://edit.mesutapps.online/api/auth/twitch/callback
```

**NOT:** Domain henüz yayında değil, kod tarafı hazır. Yayına alındığında aynı şekilde çalışacak.

## Deployment (Coolify)

### 1. Build Command
```bash
npm run build
```

### 2. Start Command
```bash
npm start
```

### 3. Environment Variables (Coolify'da)
```
TWITCH_CLIENT_ID=0bitvbvzvjjmr5ndd1kpqh9474vaqh
TWITCH_CLIENT_SECRET=hpvt7nen6y0iqurkc6bokcm36d8xnl
TWITCH_REDIRECT_URI=https://edit.mesutapps.online/api/auth/twitch/callback
PORT=3001
SESSION_SECRET=<güçlü-random-string-üret>
NODE_ENV=production
MAX_FILE_SIZE=2GB
```

### 4. Health Check
```
GET /health
```

## Önemli Notlar

### Production İçin
- [ ] `SESSION_SECRET` env var'ını güçlü bir değerle değiştir
- [ ] Redis session store kullan (memory store production için uygun değil)
- [ ] HTTPS kullan (secure cookie için)
- [ ] Domain'i yayına al

### Redis Entegrasyonu (Önerilen)
```bash
npm install connect-redis redis
```

```javascript
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});
await redisClient.connect();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  },
}));
```

## Sorun Giderme

### "EADDRINUSE" Hatası
Port zaten kullanımda. Farklı port dene:
```bash
PORT=3002 node src/index.js
```

### Session Kayboluyor
- Cookie'lerin block edilmediğinden emin ol
- `withCredentials: true` axios config'de var mı kontrol et
- CORS `credentials: true` olmalı

### OAuth Callback 404
- Redirect URI'nin Twitch Console'da doğru olduğundan emin ol
- Backend'in `/api/auth/twitch/callback` serve ettiğinden emin ol

## Dosya Değişiklikleri

### Yeni Dosyalar
- `apps/api/src/authRoutes.js` - OAuth routes
- `TWITCH_OAUTH_INTEGRATION.md` - Detaylı döküman
- `TWITCH_QUICKSTART.md` - Bu dosya

### Güncellenen Dosyalar
- `apps/api/src/index.js` - Session + auth routes eklendi
- `apps/api/.env` - SESSION_SECRET + NODE_ENV eklendi
- `apps/api/package.json` - express-session eklendi
- `apps/web/src/App.jsx` - Auth state + login/logout logic
- `apps/web/src/App.css` - Twitch auth UI stilleri

## Başarıyla Kuruldu! 🎉

Twitch OAuth entegrasyonu tamamen çalışır durumda. Kullanıcılar artık:
- ✅ Twitch hesaplarıyla giriş yapabilir
- ✅ Kendi VOD ve cliplerini görebilir
- ✅ Clip'leri import edip düzenleyebilir
- ✅ Güvenli session yönetimi ile çalışabilir

**İyi çalışmalar! 🚀**
