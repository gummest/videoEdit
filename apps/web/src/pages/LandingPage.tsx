import { Link } from 'react-router-dom';

const features = [
  {
    icon: '🧠',
    title: 'AI Öne Çıkan An Tespiti',
    desc: 'Uzun videolardaki en etkili sahneleri otomatik bulur, klip önerileri hazırlar.'
  },
  {
    icon: '✂️',
    title: 'Akıllı Düzenleme Akışı',
    desc: 'Klip başlangıç-bitiş noktalarını hızlıca düzenleyin, içerikleri dakikalar içinde yayına alın.'
  },
  {
    icon: '📱',
    title: 'Platforma Uyumlu Export',
    desc: 'TikTok, Reels, Shorts ve YouTube için tek kaynaktan farklı oranlarda çıktı alın.'
  },
  {
    icon: '📺',
    title: 'Twitch & Upload Desteği',
    desc: 'Twitch VOD içe aktarın veya doğrudan dosya yükleyin, aynı pipeline ile ilerleyin.'
  },
  {
    icon: '💬',
    title: 'Altyazı & İçerik Hazırlığı',
    desc: 'Sosyal medya için okunaklı içerik hazırlığını hızlandıran metin/altyazı desteği.'
  },
  {
    icon: '⚡',
    title: 'Hızlı Yayınlama',
    desc: 'Klipleri tek panelden yönetip üretim süresini düşürün, paylaşım hızını artırın.'
  }
];

export function LandingPage() {
  return (
    <main className="ve-landing">
      <section className="ve-hero">
        <div className="ve-container">
          <div className="ve-badge">
            <span /> videoEdit • AI destekli kurgu
          </div>

          <h1>
            Uzun videolardan hızla
            <br />
            <span className="ve-gradient">paylaşıma hazır klipler üretin</span>
          </h1>

          <p>
            videoEdit; içerik üreticileri, yayıncılar ve sosyal medya ekipleri için modern bir video işleme
            deneyimi sunar. Öne çıkan anları yakalayın, düzenleyin ve farklı platformlara uygun formatta dışa
            aktarın.
          </p>

          <div className="ve-actions">
            <Link to="/register" className="ve-btn ve-btn-primary">
              Ücretsiz Başla
            </Link>
            <Link to="/login" className="ve-btn ve-btn-secondary">
              Panele Giriş
            </Link>
          </div>
        </div>
      </section>

      <section className="ve-features" id="features">
        <div className="ve-container">
          <div className="ve-section-label">Özellikler</div>
          <h2>videoEdit ile üretim sürecini hızlandırın</h2>
          <p className="ve-section-subtitle">
            ClipForge tarzı modern arayüz yaklaşımını videoEdit iş akışına uyarladık: net, hızlı ve sonuç odaklı.
          </p>

          <div className="ve-features-grid">
            {features.map((item) => (
              <article key={item.title} className="ve-feature-card">
                <div className="ve-feature-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ve-cta">
        <div className="ve-container">
          <h2>İlk klibini şimdi üretmeye başla</h2>
          <p>Hesabını oluştur, videonu ekle ve dakikalar içinde platforma hazır içeriklerini al.</p>
          <div className="ve-actions">
            <Link to="/register" className="ve-btn ve-btn-primary">
              Hesap Oluştur
            </Link>
            <Link to="/login" className="ve-btn ve-btn-ghost">
              Giriş Yap →
            </Link>
          </div>
        </div>
      </section>

      <footer className="ve-footer">© {new Date().getFullYear()} videoEdit</footer>
    </main>
  );
}
