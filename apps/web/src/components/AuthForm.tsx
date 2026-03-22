import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@clipforge/ui';
import { authRequest } from '../lib/api';

interface AuthFormProps { mode: 'login' | 'register'; }

export function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await authRequest(mode, { email, password, name: mode === 'register' ? name : undefined });
      navigate('/dashboard');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Card className="mx-auto mt-20 w-full max-w-md">
      <h1 className="mb-4 text-2xl font-bold">{mode === 'login' ? 'Giriş Yap' : 'Ücretsiz Başla'}</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'register' && (
          <input className="w-full rounded-md border border-border bg-surface-elevated p-2" placeholder="Ad" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input className="w-full rounded-md border border-border bg-surface-elevated p-2" placeholder="E-posta" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded-md border border-border bg-surface-elevated p-2" placeholder="Şifre" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="w-full">{mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</Button>
      </form>
    </Card>
  );
}
