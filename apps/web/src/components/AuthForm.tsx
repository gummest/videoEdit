import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authRequest, getTwitchLoginUrl } from '../lib/api';

interface Props { mode: 'login' | 'register'; }

function validate(mode: 'login' | 'register', name: string, email: string, password: string) {
  if (mode === 'register' && name.trim().length < 2) return 'İsim en az 2 karakter olmalı.';
  if (!email.includes('@')) return 'Geçerli bir e-posta girin.';
  if (password.length < 6) return 'Şifre en az 6 karakter olmalı.';
  return '';
}

export function AuthForm({ mode }: Props) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const formError = validate(mode, name, email, password);
    if (formError) {
      setError(formError);
      return;
    }

    try {
      setLoading(true);
      setError('');
      await authRequest(mode, { name: mode === 'register' ? name : undefined, email, password });
      navigate('/app/overview');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <section className="card auth-card">
        <span className="badge">MesutApps • videoEdit</span>
        <h1 style={{ marginBottom: 8 }}>{mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}</h1>
        <p className="section-sub" style={{ marginTop: 0 }}>
          {mode === 'login' ? 'Paneline erişmek için oturum aç.' : 'Dakikalar içinde AI video pipeline kur.'}
        </p>

        <form onSubmit={onSubmit} className="grid" style={{ marginTop: 18 }}>
          {mode === 'register' && (
            <label>
              <span className="label">Ad Soyad</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}

          <label>
            <span className="label">E-posta</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label>
            <span className="label">Şifre</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          {error && <p className="error">{error}</p>}

          <button className="btn btn-primary" disabled={loading} type="submit">
            {loading ? 'Gönderiliyor...' : mode === 'login' ? 'Giriş Yap' : 'Kaydı Tamamla'}
          </button>

          <a className="btn btn-secondary" href={getTwitchLoginUrl()}>
            {mode === 'login' ? 'Twitch ile Giriş Yap' : 'Twitch ile Kayıt Ol'}
          </a>
        </form>

        <p className="section-sub" style={{ fontSize: 14, marginBottom: 0 }}>
          {mode === 'login' ? (
            <>Hesabın yok mu? <Link to="/register" style={{ color: '#d4ddff' }}>Kayıt ol</Link></>
          ) : (
            <>Zaten hesabın var mı? <Link to="/login" style={{ color: '#d4ddff' }}>Giriş yap</Link></>
          )}
        </p>
      </section>
    </div>
  );
}
