const progressItems = [
  ['Source ingest', 'done'],
  ['Scene detection', 'processing'],
  ['Highlight scoring', 'queued'],
  ['Render prep', 'queued']
];

export function GeneratePage() {
  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Generate & Progress</h1>
      <p className="section-sub">Pipeline adımlarını canlı takip et.</p>

      <div className="grid" style={{ marginTop: 16 }}>
        {progressItems.map(([step, state]) => (
          <article className="card" key={step}>
            <strong>{step}</strong>
            <p className="section-sub" style={{ marginBottom: 0 }}>Status: {state}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
