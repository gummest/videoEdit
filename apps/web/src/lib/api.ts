const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export interface AuthPayload {
  email: string;
  password: string;
  name?: string;
}

export async function authRequest(path: 'login' | 'register', payload: AuthPayload) {
  const response = await fetch(`${API_URL}/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? 'Authentication failed');
  }

  return response.json();
}

export type ProjectStatus = 'queued' | 'processing' | 'done';

export interface ProjectItem {
  id: string;
  title: string;
  source: 'twitch' | 'upload';
  status: ProjectStatus;
  clips: number;
  updatedAt: string;
}

export const projectMock: ProjectItem[] = [
  { id: 'prj-9821', title: 'VALORANT Ranked #42', source: 'twitch', status: 'done', clips: 8, updatedAt: '2 saat önce' },
  { id: 'prj-9827', title: 'Podcast Bölüm 11', source: 'upload', status: 'processing', clips: 0, updatedAt: '8 dk önce' },
  { id: 'prj-9830', title: 'IRL Stream Highlights', source: 'twitch', status: 'queued', clips: 0, updatedAt: 'şimdi' }
];
