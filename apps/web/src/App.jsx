import { useEffect, useMemo, useState } from 'react';
import apiClient from './lib/apiClient';
import './App.css';

const profiles = [
  { id: 'short_vertical', label: '30-60s Vertical Shorts', note: 'TikTok / Reels / Shorts (9:16)' },
  { id: 'long_horizontal', label: '15-20min Horizontal YouTube', note: 'YouTube long-form (16:9)' },
];

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [dashboardTab, setDashboardTab] = useState('create');

  const [settings, setSettings] = useState({ model: 'gemini-2.5-flash', hasApiKey: false, apiKey: '' });
  const [settingsMsg, setSettingsMsg] = useState('');

  const [jobs, setJobs] = useState([]);
  const [jobForm, setJobForm] = useState({
    title: '',
    sourceType: 'upload',
    sourceUrl: '',
    fileName: '',
    durationSec: '',
    profile: 'short_vertical',
  });
  const [jobMsg, setJobMsg] = useState('');

  const activeProfile = useMemo(() => profiles.find((p) => p.id === jobForm.profile), [jobForm.profile]);

  const loadSession = async () => {
    try {
      const { data } = await apiClient.get('/api/account/me');
      setUser(data.user);
    } catch {
      setUser(null);
    }
  };

  const loadSettings = async () => {
    try {
      const { data } = await apiClient.get('/api/app/settings/gemini');
      setSettings((prev) => ({ ...prev, ...data, apiKey: '' }));
    } catch {
      // noop
    }
  };

  const loadJobs = async () => {
    try {
      const { data } = await apiClient.get('/api/app/jobs');
      setJobs(data.jobs || []);
    } catch {
      // noop
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (user) {
      loadSettings();
      loadJobs();
    }
  }, [user]);

  const submitAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'register' ? '/api/account/register' : '/api/account/login';

    try {
      const payload = authMode === 'register'
        ? authForm
        : { email: authForm.email, password: authForm.password };
      const { data } = await apiClient.post(endpoint, payload);
      setUser(data.user);
      setAuthForm({ name: '', email: '', password: '' });
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Authentication failed');
    }
  };

  const logout = async () => {
    await apiClient.post('/api/account/logout');
    setUser(null);
    setJobs([]);
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSettingsMsg('');
    try {
      await apiClient.put('/api/app/settings/gemini', {
        model: settings.model,
        apiKey: settings.apiKey || undefined,
      });
      setSettingsMsg('Saved. API key is encrypted server-side and never sent back to client.');
      loadSettings();
    } catch (err) {
      setSettingsMsg(err.response?.data?.error || 'Failed to save settings');
    }
  };

  const createJob = async (e) => {
    e.preventDefault();
    setJobMsg('');
    try {
      const payload = {
        ...jobForm,
        durationSec: jobForm.durationSec ? Number(jobForm.durationSec) : undefined,
      };
      const { data } = await apiClient.post('/api/app/jobs', payload);
      setJobMsg(`Job created: ${data.job.status}`);
      setJobForm((prev) => ({ ...prev, sourceUrl: '', fileName: '', durationSec: '', title: '' }));
      loadJobs();
      setDashboardTab('jobs');
    } catch (err) {
      setJobMsg(err.response?.data?.error || 'Job creation failed');
    }
  };

  if (!user) {
    return (
      <div className="layout">
        <section className="landing card">
          <h1>VideoEdit Pro AI</h1>
          <p className="subtitle">AI-assisted editing platform for streamers, YouTubers and editors.</p>
          <ul>
            <li>Upload or import from Twitch</li>
            <li>Gemini-guided highlight + boring-scene detection</li>
            <li>One-click output profiles: Shorts & YouTube long-form</li>
          </ul>
        </section>

        <section className="card auth-card">
          <div className="tabs">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Login</button>
            <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Register</button>
          </div>

          <form onSubmit={submitAuth} className="form">
            {authMode === 'register' && (
              <input placeholder="Display name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} />
            )}
            <input type="email" placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} required />
            <input type="password" placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} minLength={8} required />
            {authError && <p className="error">{authError}</p>}
            <button type="submit">{authMode === 'register' ? 'Create account' : 'Login'}</button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="layout dashboard">
      <header className="card topbar">
        <div>
          <h2>Welcome, {user.name}</h2>
          <p>{user.email}</p>
        </div>
        <button onClick={logout}>Logout</button>
      </header>

      <nav className="card tabs">
        <button className={dashboardTab === 'create' ? 'active' : ''} onClick={() => setDashboardTab('create')}>Create Job</button>
        <button className={dashboardTab === 'jobs' ? 'active' : ''} onClick={() => setDashboardTab('jobs')}>Jobs</button>
        <button className={dashboardTab === 'settings' ? 'active' : ''} onClick={() => setDashboardTab('settings')}>Gemini Settings</button>
      </nav>

      {dashboardTab === 'create' && (
        <section className="card">
          <h3>New AI Editing Job</h3>
          <form className="form" onSubmit={createJob}>
            <input placeholder="Project title" value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} />

            <select value={jobForm.sourceType} onChange={(e) => setJobForm({ ...jobForm, sourceType: e.target.value })}>
              <option value="upload">Manual Upload</option>
              <option value="twitch_clip">Twitch Clip URL/ID</option>
              <option value="twitch_vod">Twitch VOD URL/ID</option>
            </select>

            <input placeholder="Source URL or ID" value={jobForm.sourceUrl} onChange={(e) => setJobForm({ ...jobForm, sourceUrl: e.target.value })} />
            <input placeholder="Uploaded file name (optional)" value={jobForm.fileName} onChange={(e) => setJobForm({ ...jobForm, fileName: e.target.value })} />
            <input type="number" placeholder="Duration seconds (optional)" value={jobForm.durationSec} onChange={(e) => setJobForm({ ...jobForm, durationSec: e.target.value })} />

            <select value={jobForm.profile} onChange={(e) => setJobForm({ ...jobForm, profile: e.target.value })}>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <p className="hint">Output profile: {activeProfile?.note}</p>
            {jobMsg && <p className="hint">{jobMsg}</p>}
            <button type="submit">Analyze + Build Timeline Plan</button>
          </form>
        </section>
      )}

      {dashboardTab === 'jobs' && (
        <section className="card">
          <h3>Jobs</h3>
          <button onClick={loadJobs}>Refresh</button>
          <div className="jobs">
            {jobs.map((job) => (
              <article key={job.id} className="job">
                <h4>{job.title}</h4>
                <p>Status: <b>{job.status}</b> • Profile: {job.profile}</p>
                <p>Source: {job.source?.type} {job.source?.url ? `• ${job.source.url}` : ''}</p>
                {job.analysis?.analysis?.summary && <p>AI Summary: {job.analysis.analysis.summary}</p>}
                {!!job.analysis?.todos?.length && <p className="hint">TODO: {job.analysis.todos[0]}</p>}
              </article>
            ))}
            {!jobs.length && <p>No jobs yet.</p>}
          </div>
        </section>
      )}

      {dashboardTab === 'settings' && (
        <section className="card">
          <h3>Gemini Provider Settings</h3>
          <form className="form" onSubmit={saveSettings}>
            <input value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value })} placeholder="Model (e.g. gemini-2.5-flash)" />
            <input type="password" value={settings.apiKey} onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })} placeholder={settings.hasApiKey ? 'API key saved (enter to rotate)' : 'Paste Gemini API key'} />
            <p className="hint">Current key status: {settings.hasApiKey ? 'Configured' : 'Not configured'}</p>
            {settingsMsg && <p className="hint">{settingsMsg}</p>}
            <button type="submit">Save Settings</button>
          </form>
        </section>
      )}
    </div>
  );
}

export default App;
