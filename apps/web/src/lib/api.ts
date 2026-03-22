const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export async function authRequest(path: string, payload: { email: string; password: string; name?: string }) {
  const response = await fetch(`${API_URL}/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.message ?? 'Auth error');
  }

  return response.json();
}
