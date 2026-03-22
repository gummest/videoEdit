export function SettingsPage() {
  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Gemini Settings</h1>
      <p className="section-sub">Token ve model ayarlarını proje bazlı yönet.</p>

      <article className="card" style={{ marginTop: 16, maxWidth: 620 }}>
        <label className="label">Gemini API Token</label>
        <input className="input" type="password" placeholder="AIza..." />

        <label className="label" style={{ marginTop: 12 }}>Model</label>
        <select className="input" defaultValue="gemini-1.5-pro">
          <option value="gemini-1.5-pro">gemini-1.5-pro</option>
          <option value="gemini-1.5-flash">gemini-1.5-flash</option>
        </select>

        <button className="btn btn-primary" style={{ marginTop: 12 }}>Save Settings</button>
      </article>
    </section>
  );
}
