export function LibraryPage() {
  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Library</h1>
      <p className="section-sub">Ham videolar, sahneler ve hazır preset öğeleri.</p>
      <div className="grid kpi-grid" style={{ marginTop: 16 }}>
        <article className="card"><strong>Raw Uploads</strong><p className="section-sub">67 dosya</p></article>
        <article className="card"><strong>Audio Tracks</strong><p className="section-sub">31 dosya</p></article>
        <article className="card"><strong>Overlay Assets</strong><p className="section-sub">19 dosya</p></article>
      </div>
    </section>
  );
}
