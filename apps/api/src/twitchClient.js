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

export const buildClipWindows = (startDate, endDate, windowDays = 30) => {
  const windows = [];
  const end = new Date(endDate);
  let cursor = new Date(startDate);

  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) {
    return windows;
  }

  const stepMs = windowDays * 24 * 60 * 60 * 1000;

  while (cursor < end) {
    const next = new Date(Math.min(cursor.getTime() + stepMs, end.getTime()));
    windows.push({ start: new Date(cursor), end: next });
    cursor = next;
  }

  return windows;
};

export const fetchAllClipsAllTime = async (broadcasterId, createdAt, windowDays = 30) => {
  const startDate = createdAt ? new Date(createdAt) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const endDate = new Date();
  const windows = buildClipWindows(startDate, endDate, windowDays);
  const allClips = [];

  for (const window of windows) {
    const clips = await fetchAllClips(broadcasterId, window.start.toISOString(), window.end.toISOString());
    allClips.push(...clips);
  }

  return allClips;
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

export const deriveClipMp4Candidates = (clip = {}, clipId = '') => {
  const candidates = [];
  const seen = new Set();
  const addCandidate = (value) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;
    if (!/\.mp4(?:\?|$)/i.test(trimmed)) return;
    seen.add(trimmed);
    candidates.push(trimmed);
  };

  const thumbnailUrl = clip.thumbnail_url || '';
  if (thumbnailUrl) {
    const withoutQuery = thumbnailUrl.split('?')[0];

    // Common Twitch preview formats:
    //  - ...-preview-480x272.jpg
    //  - ...-social-preview.jpg
    //  - ...-preview.jpg / .png / .jpeg / .webp
    addCandidate(withoutQuery.replace(/-preview[^/.]*\.(?:jpg|jpeg|png|webp)$/i, '.mp4'));
    addCandidate(withoutQuery.replace(/-social-preview\.(?:jpg|jpeg|png|webp)$/i, '.mp4'));
    addCandidate(withoutQuery.replace(/\.(?:jpg|jpeg|png|webp)$/i, '.mp4'));
  }

  const clipUrl = clip.url || '';
  if (clipUrl.includes('/clip/')) {
    const slug = clipUrl.split('/clip/')[1]?.split(/[/?#]/)[0];
    if (slug) {
      addCandidate(`https://clips-media-assets2.twitch.tv/${slug}.mp4`);
      addCandidate(`https://production.assets.clips.twitchcdn.net/${slug}.mp4`);
    }
  }

  if (clipId) {
    addCandidate(`https://clips-media-assets2.twitch.tv/${clipId}.mp4`);
    addCandidate(`https://production.assets.clips.twitchcdn.net/${clipId}.mp4`);
  }

  return candidates.filter(Boolean);
};

export const fetchClipPlaybackSources = async (clipSlug) => {
  const clientId = getRequiredEnv('TWITCH_CLIENT_ID');

  try {
    const response = await fetchWithTimeout('https://gql.twitch.tv/gql', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `query GetClipPlayback($slug: ID!) {
          clip(slug: $slug) {
            videoQualities {
              sourceURL
              quality
            }
            playbackAccessToken(params: { platform: \"web\", playerBackend: \"mediaplayer\", playerType: \"site\" }) {
              signature
              value
            }
          }
        }`,
        variables: { slug: clipSlug },
      }),
    });

    if (!response.ok) {
      return { sources: [], accessToken: null };
    }

    const payload = await response.json();
    const clip = payload?.data?.clip;
    const sources = (clip?.videoQualities || [])
      .map((item) => item?.sourceURL)
      .filter((url) => typeof url === 'string' && url.includes('.mp4'));

    return {
      sources,
      accessToken: clip?.playbackAccessToken || null,
    };
  } catch {
    return { sources: [], accessToken: null };
  }
};

export const fetchClipAccessToken = async (clipSlug) => {
  const clientId = getRequiredEnv('TWITCH_CLIENT_ID');
  const token = await getAppAccessToken();

  try {
    const response = await fetch(`https://api.twitch.tv/api/clips/${encodeURIComponent(clipSlug)}/access_token`, {
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    if (!payload?.sig || !payload?.token) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

export const fetchWithTimeout = async (url, options = {}, timeoutMs = 8_000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const isRetryableFetchError = (error) => {
  if (!error) return false;
  const name = error.name || '';
  return name === 'AbortError' || name === 'TypeError';
};

export const probeClipMediaCandidates = async (
  candidates = [],
  {
    timeoutMs = 8_000,
    retries = 1,
    maxAttempts = 12,
  } = {}
) => {
  const attempts = candidates.filter(Boolean).slice(0, maxAttempts);

  for (const candidate of attempts) {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        const response = await fetchWithTimeout(candidate, {}, timeoutMs);
        if (!response.ok) {
          break;
        }

        const contentType = response.headers.get('content-type') || '';
        const isVideo =
          contentType.includes('video/') || contentType.includes('application/octet-stream');

        if (!isVideo) {
          break;
        }

        return { response, resolvedUrl: candidate };
      } catch (error) {
        if (!isRetryableFetchError(error) || attempt === retries) {
          break;
        }
      }
      attempt += 1;
    }
  }

  return { response: null, resolvedUrl: null };
};

export const clearCachedToken = () => {
  cachedToken = null;
};
oken = () => {
  cachedToken = null;
};
hedToken = null;
};
 () => {
  cachedToken = null;
};
 clearCachedToken = () => {
  cachedToken = null;
};
