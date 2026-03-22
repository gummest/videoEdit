import { projectMock } from '../../lib/api';

export function ResultsPage() {
  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Results</h1>
      <p className="section-sub">Proje sonuçları ve klip çıktıları.</p>

      <article className="card" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr><th>Project</th><th>Source</th><th>Status</th><th>Clips</th><th>Updated</th></tr>
          </thead>
          <tbody>
            {projectMock.map((p) => (
              <tr key={p.id}><td>{p.title}</td><td>{p.source}</td><td>{p.status}</td><td>{p.clips}</td><td>{p.updatedAt}</td></tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
