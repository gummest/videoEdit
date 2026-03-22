import { useState } from 'react';

export function NewProjectPage() {
  const [mode, setMode] = useState<'twitch' | 'upload'>('twitch');

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>New Project</h1>
      <p className="section-sub">Twitch URL veya manuel dosya yükleme ile proje başlat.</p>

      <div style={{ display: 'flex', gap: 8, margin: '14px 0 16px' }}>
        <button className={`btn ${mode === 'twitch' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('twitch')}>Twitch Upload</button>
        <button className={`btn ${mode === 'upload' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('upload')}>Manual Upload</button>
      </div>

      <div className="grid upload-grid">
        <article className="card">
          <h3 style={{ marginTop: 0 }}>{mode === 'twitch' ? 'Twitch VOD' : 'Video File'}</h3>
          {mode === 'twitch' ? (
            <>
              <label className="label">VOD URL</label>
              <input className="input" placeholder="https://www.twitch.tv/videos/..." />
            </>
          ) : (
            <>
              <label className="label">Upload</label>
              <input className="input" type="file" />
            </>
          )}

          <label className="label" style={{ marginTop: 12 }}>Project name</label>
          <input className="input" placeholder="Weekly Highlights" />
          <button className="btn btn-primary" style={{ marginTop: 12 }}>Create Project</button>
        </article>

        <article className="card">
          <h3 style={{ marginTop: 0 }}>Generate preset</h3>
          <p className="section-sub">Model, clip süresi ve output oranını belirle.</p>
          <label className="label">Target platform</label>
          <select className="input" defaultValue="shorts">
            <option value="shorts">YouTube Shorts</option>
            <option value="reels">Instagram Reels</option>
            <option value="tiktok">TikTok</option>
          </select>
          <label className="label" style={{ marginTop: 12 }}>Clip duration</label>
          <input className="input" defaultValue="25-45s" />
        </article>
      </div>
    </section>
  );
}
