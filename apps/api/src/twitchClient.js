const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_API_BASE = 'https://api.twitch.tv/helix';

let cachedToken = null;

const getRequiredEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required Twitch environment variable: ${key}`);
  }
  return value;
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  return response.json();
};

export const getAppAccessToken = async () => {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const clientId = getRequiredEnv('TWITCH_CLIENT_ID');
  const clientSecret = getRequiredEnv('TWITCH_CLIENT_SECRET');

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  });

  const data = await fetchJson(`${TWITCH_AUTH_URL}?${params.toString()}`, {
    method: 'POST',
  });

  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return cachedToken.token;
};

const twitchFetch = async (path, params = {}) => {
  const clientId = getRequiredEnv('TWITCH_CLIENT_ID');
  const token = await getAppAccessToken();
  const query = new URLSearchParams(params);
  const url = `${TWITCH_API_BASE}${path}?${query.toString()}`;

  return fetchJson(url, {
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
    },
  });
};

const fetchAllPages = async (path, params = {}) => {
  let cursor = null;
  const items = [];

  do {
    const pageParams = {
      ...params,
      first: 100,
      ...(cursor ? { after: cursor } : {}),
    };

    const data = await twitchFetch(path, pageParams);
    items.push(...(data.data || []));
    cursor = data.pagination?.cursor;
  } while (cursor);

  return items;
};

export const fetchUserByLogin = async (login) => {
  const data = await twitchFetch('/users', { login });
  const user = data.data?.[0];
  if (!user) {
    throw new Error('No Twitch user found for the provided login.');
  }
  return user;
};

export const fetchAllVideos = async (userId) =>
  fetchAllPages('/videos', { user_id: userId, type: 'archive' });

export const fetchAllClips = async (broadcasterId, startedAt, endedAt) =>
  fetchAllPages('/clips', {
    broadcaster_id: broadcasterId,
    ...(startedAt ? { started_at: startedAt } : {}),
    ...(endedAt ? { ended_at: endedAt } : {}),
  });

export const fetchClipById = async (clipId) => {
  const data = await twitchFetch('/clips', { id: clipId });
  const clip = data.data?.[0];
  if (!clip) {
    throw new Error('Clip not found.');
  }
  return clip;
};

export const clearCachedToken = () => {
  cachedToken = null;
};
