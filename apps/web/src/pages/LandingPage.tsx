import { Link } from 'react-router-dom';

const ecosystemApps = [
  {
    name: 'Office',
    desc: 'LiveOps Console ile görev, agent ve operasyon yönetimini tek panelden sürdürün.',
    url: 'https://office.mesutapps.online',
    tag: 'Operasyon'
  },
  {
    name: 'OCR',
    desc: 'Görsellerden metin çıkarma ve belge dijitalleştirme süreçlerini hızlandırın.',
    url: 'https://ocr.mesutapps.online',
    tag: 'Doküman'
  },
  {
    name: 'Excel to SQL',
    desc: 'Excel tablolarını saniyeler içinde SQL sorgularına dönüştürün.',
    url: 'https://exceltosql.mesutapps.online',
    tag: 'Veri'
  },
  {
    name: 'Video Edit',
    desc: 'Yükle, kırp, düzenle ve sosyal platformlara uygun formatlarda dışa aktar.',
    url: 'https://edit.mesutapps.online',
    tag: 'Öne Çıkan'
  }
];

const features = [
  {
    icon: '🧠',
    title: 'AI Öne Çıkan An Tespiti',
    desc: 'Uzun videolardaki en etkili sahneleri otomatik bulur, klip önerilerini hızla hazırlar.'
  },
  {
    icon: '✂️',
    title: 'Akıllı Düzenleme Akışı',
    desc: 'Klip başlangıç-bitiş noktalarını kolayca düzenleyin, içerikleri dakikalar içinde yayına alın.'
  },
  {
    icon: '📱',
    title: 'Platforma Uyumlu Export',
    desc: 'TikTok, Reels, Shorts ve YouTube için tek kaynaktan çoklu oran çıktısı oluşturun.'
  },
  {
    icon: '📺',
    title: 'Twitch & Upload Desteği',
    desc: 'Twitch VOD içe aktarın veya doğrudan dosya yükleyin, aynı pipeline ile ilerleyin.'
  },
  {
    icon: '⚡',
    title: 'Hızlı Yayınlama',
    desc: 'Klipleri tek panelden yönetip üretim süresini düşürün, paylaşım hızını artırın.'
  },
  {
    icon: '🔒',
    title: 'Hesap Bazlı Çalışma Alanı',
    desc: 'Kendi hesabınız ile güvenli oturum açın, projelerinizi kişisel panelinizden yönetin.'
  }
];

export function LandingPage() {
  return (
    <main className="ve-landing">
      <section className="ve-hero">
        <div className="ve-container">
          <div className="ve-badge">
            <span /> edit.mesutapps.online • MesutApps ekosisteminde Video Edit
          </div>

          <h1>
            MesutApps gücüyle
            <br />
            <span className="ve-gradient">AI destekli video düzenleme</span>
          </h1>

          <p>
            videoEdit, MesutApps çatısı altındaki üretim araçlarının video tarafıdır. Uzun videolardan öne çıkan
            anları yakalayın, kırpın, optimize edin ve platformlara hazır kliplere dönüştürün.
          </p>

          <div className="ve-actions">
            <Link to="/register" className="ve-btn ve-btn-primary">
              Ücretsiz Başla
            </Link>
            <Link to="/login" className="ve-btn ve-btn-secondary">
              Panele Giriş
            </Link>
            <a href="#ecosystem" className="ve-btn ve-btn-ghost">
              MesutApps Araçları
            </a>
          </div>
        </div>
      </section>

      <section className="ve-stats">
        <div className="ve-container ve-stats-grid">
          <div className="ve-stat-item">
            <strong>7+</strong>
            <span>Web uygulaması</span>
          </div>
          <div className="ve-stat-item">
            <strong>2+</strong>
            <span>Mobil uygulama</span>
          </div>
          <div className="ve-stat-item">
            <strong>1</strong>
            <span>Video üretim merkezi</span>
          </div>
        </div>
      </section>

      <section className="ve-features" id="features">
        <div className="ve-container">
          <div className="ve-section-label">Video Edit Özellikleri</div>
          <h2>videoEdit ile üretim sürecini hızlandırın</h2>
          <p className="ve-section-subtitle">
            MesutApps içindeki modern iş akışı yaklaşımını video düzenlemeye taşıdık: net, hızlı ve sonuç odaklı.
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

      <section className="ve-ecosystem" id="ecosystem">
        <div className="ve-container">
          <div className="ve-section-label">MesutApps Ekosistemi</div>
          <h2>VideoEdit tek başına değil, güçlü bir ürün ailesinin parçası</h2>
          <p className="ve-section-subtitle">İş akışınızın farklı adımları için MesutApps araçları birlikte çalışır.</p>

          <div className="ve-ecosystem-grid">
            {ecosystemApps.map((app) => (
              <a key={app.name} href={app.url} target="_blank" rel="noreferrer" className="ve-ecosystem-card">
                <span className="ve-chip">{app.tag}</span>
                <h3>{app.name}</h3>
                <p>{app.desc}</p>
                <span className="ve-link">Uygulamayı Aç →</span>
              </a>
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

      <footer className="ve-footer">© {new Date().getFullYear()} MesutApps • videoEdit</footer>
    </main>
  );
}
