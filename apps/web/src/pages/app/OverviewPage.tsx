const stats = [
  ['Active Projects', '12'],
  ['Generated Clips', '84'],
  ['Pending Exports', '5'],
  ['Library Assets', '241']
];

export function OverviewPage() {
  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Overview</h1>
      <p className="section-sub">Bugünkü üretim özetin ve pipeline sağlık durumu.</p>

      <div className="grid kpi-grid" style={{ marginTop: 16 }}>
        {stats.map(([label, value]) => (
          <article className="card" key={label}>
            <p className="section-sub" style={{ margin: 0, fontSize: 13 }}>{label}</p>
            <p style={{ margin: '10px 0 0', fontSize: 32, fontWeight: 800 }}>{value}</p>
          </article>
        ))}
      </div>

      <article className="card" style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>System</h3>
        <ul className="section-sub" style={{ marginBottom: 0 }}>
          <li>FFmpeg worker: healthy</li>
          <li>Twitch client: connected</li>
          <li>Gemini provider: configured</li>
        </ul>
      </article>
    </section>
  );
}
