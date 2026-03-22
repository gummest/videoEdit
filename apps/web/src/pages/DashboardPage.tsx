import { Card, Button } from '@clipforge/ui';

const stats = [
  { label: 'Toplam Videolar', value: '24' },
  { label: 'Üretilen Klipler', value: '86' },
  { label: 'Toplam Süre', value: '12s 44d' }
];

export function DashboardPage() {
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          {stats.map((item) => (
            <Card key={item.label}>
              <p className="text-sm text-text-secondary">{item.label}</p>
              <p className="mt-2 text-2xl font-bold">{item.value}</p>
            </Card>
          ))}
        </section>

        <Card>
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            <li>• "Twitch Yayın #18" analizi tamamlandı.</li>
            <li>• 3 klip Instagram Reels formatında export edildi.</li>
            <li>• Yeni proje oluşturuldu: "Haftalık Highlight".</li>
          </ul>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="mt-4 grid gap-2">
          <Button>Video Yükle</Button>
          <Button variant="secondary">Twitch'e Bağlan</Button>
          <Button variant="secondary">Yeni Proje Oluştur</Button>
        </div>
      </Card>
    </main>
  );
}
