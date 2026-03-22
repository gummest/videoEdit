import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  ['overview', 'Overview'],
  ['new-project', 'New Project'],
  ['generate', 'Generate'],
  ['results', 'Results'],
  ['library', 'Library'],
  ['exports', 'Exports'],
  ['settings', 'Gemini Settings']
];

export function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div style={{ marginBottom: 22 }}>
          <div className="badge">videoEdit</div>
          <h3 style={{ marginBottom: 6 }}>Control Panel</h3>
          <p className="section-sub" style={{ margin: 0, fontSize: 13 }}>FFmpeg + Twitch + AI pipeline</p>
        </div>

        <nav>
          {navItems.map(([path, label]) => (
            <NavLink
              key={path}
              to={`/app/${path}`}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
