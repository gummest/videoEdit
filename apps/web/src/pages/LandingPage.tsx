import { Link } from 'react-router-dom';
import { Button, Card } from '@clipforge/ui';

const features = [
  { title: 'AI Clip Detection', desc: 'Yayınlarınızdaki en heyecanlı anları otomatik tespit edin.' },
  { title: 'Multi-format Export', desc: 'TikTok, Reels, Shorts ve YouTube formatlarına tek tıkta aktarın.' },
  { title: 'Twitch Integration', desc: 'Twitch VOD bağlantısıyla otomatik import ve klipleme.' }
];

export function LandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <section className="rounded-xl border border-border bg-surface p-10 text-center">
        <h1 className="text-4xl font-bold">Yayınlarınızdan hemen paylaşıma hazır videolar</h1>
        <p className="mx-auto mt-4 max-w-2xl text-text-secondary">ClipForge, AI destekli klip tespiti ve hızlı export akışıyla içerik üretim sürecinizi hızlandırır.</p>
        <Link to="/register" className="mt-8 inline-block"><Button>Ücretsiz Başla</Button></Link>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {features.map((item) => (
          <Card key={item.title}>
            <h3 className="text-lg font-semibold text-accent">{item.title}</h3>
            <p className="mt-2 text-sm text-text-secondary">{item.desc}</p>
          </Card>
        ))}
      </section>

      <footer className="mt-14 border-t border-border py-6 text-center text-sm text-text-muted">© {new Date().getFullYear()} ClipForge — Yayından paylaşıma en kısa yol.</footer>
    </main>
  );
}
