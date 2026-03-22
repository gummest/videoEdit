import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OverviewPage } from './pages/app/OverviewPage';
import { NewProjectPage } from './pages/app/NewProjectPage';
import { SettingsPage } from './pages/app/SettingsPage';
import { GeneratePage } from './pages/app/GeneratePage';
import { ResultsPage } from './pages/app/ResultsPage';
import { LibraryPage } from './pages/app/LibraryPage';
import { ExportsPage } from './pages/app/ExportsPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="new-project" element={<NewProjectPage />} />
        <Route path="generate" element={<GeneratePage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="exports" element={<ExportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
