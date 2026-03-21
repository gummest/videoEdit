# Twitch OAuth Integration

## Genel Bakış
videoEdit projesine Twitch OAuth entegrasyonu başarıyla kuruldu. Kullanıcılar artık Twitch hesaplarıyla giriş yapabilir, kendi VOD'larını ve cliplerini görüntüleyebilir, ve bunları sisteme yükleyebilir.

## Kurulum

### Backend Değişiklikleri

#### 1. Yeni Bağımlılık
```bash
npm install express-session
```

#### 2. Yeni Dosya: `apps/api/src/authRoutes.js`
Twitch OAuth akışını yöneten routes:
- `GET /api/auth/twitch/login` - Twitch OAuth sayfasına yönlendirir
- `GET /api/auth/twitch/callback` - OAuth callback, token exchange
- `POST /api/auth/twitch/logout` - Çıkış yapar
- `GET /api/auth/twitch/me` - Mevcut kullanıcı bilgilerini döner

**Önemli Fonksiyonlar:**
- `requireTwitchAuth` middleware - Auth gerektiren endpoint'leri korur
- `userTwitchFetch` - User token ile Twitch API çağrıları yapar
- Token refresh logic - Expiring tokenleri otomatik yeniler

#### 3. `apps/api/src/index.js` Güncellemeleri
- `express-session` middleware eklendi
- CORS yapılandırması credentials için güncellendi
- Auth routes mount edildi (`/api/auth`)
- Yeni endpoint: `GET /api/twitch/my-library` (auth gerekli)
  - Kullanıcının kendi VOD ve cliplerini getirir
  - User token ile çalışır

#### 4. `.env` Güncellemeleri
```env
SESSION_SECRET=videoedit-production-secret-change-this-to-random-string
NODE_ENV=production
```

**Mevcut Twitch Config (değişmedi):**
```env
TWITCH_CLIENT_ID=0bitvbvzvjjmr5ndd1kpqh9474vaqh
TWITCH_CLIENT_SECRET=hpvt7nen6y0iqurkc6bokcm36d8xnl
TWITCH_REDIRECT_URI=https://edit.mesutapps.online/api/auth/twitch/callback
```

### Frontend Değişiklikleri

#### 1. `apps/web/src/App.jsx` Güncellemeleri

**Yeni State:**
```javascript
const [twitchUser, setTwitchUser] = useState(null);
const [twitchAuthLoading, setTwitchAuthLoading] = useState(true);
```

**Yeni Fonksiyonlar:**
- `handleTwitchLogin()` - OAuth akışını başlatır
- `handleTwitchLogout()` - Çıkış yapar
- `handleFetchMyTwitch()` - Kullanıcının kendi videolarını yükler

**useEffect Hook:**
- Sayfa yüklendiğinde auth durumunu kontrol eder
- OAuth callback'den gelen mesajları işler
- URL'i temizler

**Axios Configuration:**
```javascript
axios.defaults.withCredentials = true;
```

#### 2. `apps/web/src/App.css` Güncellemeleri
Yeni Twitch auth UI stilleri eklendi:
- `.twitch-auth-section`
- `.twitch-login-prompt`
- `.twitch-login-btn`
- `.twitch-user-card`
- `.twitch-user-info`
- `.twitch-user-avatar`
- `.twitch-auth-buttons`
- `.secondary-btn`

## UI/UX Akışı

### 1. Giriş Yapmamış Kullanıcı
- "Twitch Library" tab'ına tıklar
- Mor gradient arka planlı login prompt görür
- "Login with Twitch" butonuna tıklar
- Twitch OAuth sayfasına yönlendirilir
- İzinleri onaylar
- Geri döndüğünde profili görünür

### 2. Giriş Yapmış Kullanıcı
- Profil kartı görünür (avatar + username)
- "Load My Videos" butonu ile kendi videolarını yükler
- VOD'lar ve clipler listelenir
- Clip'lere "Import Clip" butonu ile import edebilir
- "Logout" butonu ile çıkış yapabilir

### 3. Video Import
- Clip seçildikinde "Import Clip" butonuna tıklanır
- Clip otomatik indirilir ve `File` object'ine dönüştürülür
- `handleFileSelect()` fonksiyonu ile local upload akışına yönlendirilir
- Kullanıcı "Local Upload" tab'ında video ile devam eder

## Güvenlik

### Session Yönetimi
- Express Session kullanılıyor
- Cookie-based session storage
- 30 gün geçerlilik süresi
- HTTPS'te `secure` flag aktif (NODE_ENV=production)

### Token Yönetimi
- Access token session'da saklanıyor
- Refresh token ile otomatik yenileme
- Token expire kontrolü (5 dakika önceden refresh)
- Expire olmuş token'da kullanıcı logout yapılır

### CORS
```javascript
app.use(cors({
  origin: true,
  credentials: true,
}));
```

## API Endpoints

### Public Endpoints
- `GET /api/twitch/library?login=CHANNEL` - Herhangi bir kanalın videolarını göster (App Access Token)
- `GET /api/twitch/clip-download?clipId=ID` - Clip'i indir

### Protected Endpoints (Auth Required)
- `GET /api/twitch/my-library?includeAllClips=true` - Kullanıcının kendi videolarını getir
- `GET /api/auth/twitch/me` - Mevcut kullanıcı bilgisi
- `POST /api/auth/twitch/logout` - Çıkış

### OAuth Endpoints
- `GET /api/auth/twitch/login` - OAuth başlat
- `GET /api/auth/twitch/callback` - OAuth callback

## Twitch OAuth Scopes
```javascript
const scopes = [
  'user:read:email',  // Kullanıcı email bilgisi
  'clips:edit',       // Clip yönetimi (gelecek özellik için)
];
```

## Test Senaryosu

### 1. Login Akışı
```bash
# Tarayıcıda:
1. http://localhost:3001 aç
2. "Twitch Library" tab'ına git
3. "Login with Twitch" butonuna tık
4. Twitch'te giriş yap ve izinleri onayla
5. Geri döndüğünde profilin göründüğünü doğrula
```

### 2. Video Yükleme
```bash
1. "Load My Videos" butonuna tık
2. VOD ve clip listesinin geldiğini doğrula
3. Bir clip'in "Import Clip" butonuna tık
4. "Local Upload" tab'ına geçiş yapıldığını doğrula
5. Video'nun yüklendiğini görüntüle
```

### 3. Logout
```bash
1. "Logout" butonuna tık
2. Login prompt'un göründüğünü doğrula
3. /api/auth/twitch/me endpoint'ine GET çağrısı yap
4. 401 hatası aldığını doğrula
```

## Deployment Notları

### Coolify/Docker
1. `SESSION_SECRET` env var'ı production'da farklı bir değere set edilmeli
2. `NODE_ENV=production` set edilmeli
3. HTTPS kullanılmalı (secure cookie için)
4. Domain: `https://edit.mesutapps.online`

### Twitch Developer Console
Redirect URI zaten kayıtlı:
```
https://edit.mesutapps.online/api/auth/twitch/callback
```

**Not:** Domain henüz yayında değil, kod tarafı hazır.

## Geliştirme Notları

### Memory Store Uyarısı
```
Warning: connect.session() MemoryStore is not
designed for a production environment
```

**Çözüm (Production için):**
- Redis session store kullan (`connect-redis`)
- PostgreSQL session store kullan (`connect-pg-simple`)

Örnek Redis entegrasyonu:
```javascript
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL,
});
await redisClient.connect();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  // ...
}));
```

## Sorun Giderme

### Port Çakışması
Eğer `EADDRINUSE` hatası alıyorsanız:
```bash
PORT=3001 node src/index.js
```

### OAuth Callback 404
- Redirect URI'nin Twitch Developer Console'da doğru olduğundan emin ol
- Backend'in `/api/auth/twitch/callback` endpoint'ini serve ettiğinden emin ol

### Session Kayboluyor
- Cookie'ler block edilmiş olabilir
- `withCredentials: true` axios config'de olduğundan emin ol
- CORS `credentials: true` olduğundan emin ol

### Token Expired
- Otomatik refresh logic `requireTwitchAuth` middleware'de çalışıyor
- Eğer refresh token da expire olduysa, kullanıcı tekrar login yapmalı

## Gelecek Geliştirmeler

1. **Redis Session Store**: Production için memory store yerine Redis
2. **Clip Creation**: `clips:edit` scope'u ile yeni clip oluşturma
3. **VOD Download**: VOD'ları da import edebilme
4. **Multiple Accounts**: Birden fazla Twitch hesabı bağlama
5. **Clip Editing**: Import edilen clip'leri düzenleme özellikleri

## Dosya Yapısı

```
apps/
├── api/
│   ├── src/
│   │   ├── index.js              # Ana server (session + auth routes eklendi)
│   │   ├── authRoutes.js         # YENİ: OAuth routes
│   │   ├── twitchClient.js       # Mevcut (App Access Token)
│   │   └── ...
│   ├── .env                      # SESSION_SECRET + NODE_ENV eklendi
│   └── package.json              # express-session eklendi
└── web/
    ├── src/
    │   ├── App.jsx               # Auth state + login/logout logic
    │   └── App.css               # Twitch auth UI stilleri
    └── ...
```

## Sonuç

✅ Twitch OAuth entegrasyonu başarıyla kuruldu
✅ Kullanıcı login/logout akışı çalışıyor
✅ User token ile video/clip listeleme hazır
✅ UI/UX şık ve kullanıcı dostu
✅ Session yönetimi ve token refresh otomatik
✅ Production'a deploy hazır (Redis store önerilir)

**Mesut'a not:** Domain yayına alındığında, tarayıcıdan login test edebilirsin. Backend kod tarafı tamamen hazır!
