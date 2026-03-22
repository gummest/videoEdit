import { Link } from 'react-router-dom';

const steps = [
  { title: 'Kaynağı Seç', desc: 'Twitch VOD URL ekle veya videonu manuel yükle.' },
  { title: 'AI Profilini Ayarla', desc: 'Gemini model/token ayarıyla analiz hassasiyetini belirle.' },
  { title: 'Klipleri Üret', desc: 'Highlight önerilerini al, düzenle, export et.' }
];

const features = [
  'Twitch + manuel upload tek akış',
  'FFmpeg tabanlı hızlı render pipeline',
  'AI ile otomatik highlight sahne tespiti',
  'Reels / Shorts / TikTok preset paketleri',
  'Proje, library ve export geçmişi yönetimi'
];

const presets = ['9:16 Shorts', '1:1 Instagram', '16:9 YouTube', 'Hook-heavy TikTok'];

export function LandingPage() {
  return (
    <main>
      <section className="landing-hero page-wrap">
        <span className="badge">MesutApps • videoEdit</span>
        <h1 className="section-title">AI destekli video edit,
tek panelde üretim hattı</h1>
        <p className="section-sub" style={{ maxWidth: 740, margin: '0 auto' }}>
          videoEdit ile Twitch yayınlarını veya yüklediğin videoları otomatik analiz et, kliplere böl,
          platforma uygun presetlerle dışa aktar.
        </p>
        <div className="landing-actions">
          <Link to="/register" className="btn btn-primary">Ücretsiz Başla</Link>
          <Link to="/login" className="btn btn-secondary">Panele Giriş</Link>
        </div>
      </section>

      <section className="page-wrap" style={{ padding: '10px 0 70px' }}>
        <h2>How it works</h2>
        <div className="grid steps-grid">
          {steps.map((item, i) => (
            <article className="card" key={item.title}>
              <div className="badge">0{i + 1}</div>
              <h3>{item.title}</h3>
              <p className="section-sub">{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-wrap" style={{ paddingBottom: 70 }}>
        <h2>Features</h2>
        <div className="grid features-grid">
          {features.map((item) => (
            <article className="card" key={item}><strong>{item}</strong></article>
          ))}
        </div>
      </section>

      <section className="page-wrap" style={{ paddingBottom: 70 }}>
        <h2>Presets</h2>
        <div className="grid presets-grid">
          {presets.map((item) => <article className="card" key={item}>{item}</article>)}
        </div>
      </section>

      <section className="page-wrap" style={{ paddingBottom: 100, textAlign: 'center' }}>
        <article className="card" style={{ padding: 36 }}>
          <h2 style={{ marginTop: 0 }}>İçeriği hızlandır, yayın ritmini koru</h2>
          <p className="section-sub">Hesabını aç, ilk projeni oluştur ve AI destekli üretim hattını çalıştır.</p>
          <div className="landing-actions" style={{ marginTop: 10 }}>
            <Link className="btn btn-primary" to="/register">Create account</Link>
            <Link className="btn btn-secondary" to="/app/overview">Demo panel</Link>
          </div>
        </article>
      </section>
    </main>
  );
}
