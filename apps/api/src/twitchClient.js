const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_API_BASE = 'https://api.twitch.tv/helix';
const TWITCH_GQL_URL = 'https://gql.twitch.tv/gql';
const TWITCH_PUBLIC_GQL_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

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

const dedupeStrings = (values = []) => {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
};

const tryJsonParse = (value) => {
  if (!value || typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const chooseBestMp4 = (urls = []) => {
  const ranked = dedupeStrings(urls).map((url) => {
    const qualityMatch = url.match(/(?:-|_)(\d{3,4})(?:p)?\.mp4/i) || url.match(/quality=(\d{3,4})/i);
    const score = qualityMatch ? Number.parseInt(qualityMatch[1], 10) : 0;
    return { url, score: Number.isFinite(score) ? score : 0 };
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked.map((entry) => entry.url);
};

const buildClipThumbnails = (thumbnailUrl = '') => {
  if (!thumbnailUrl) return [];

  const clean = thumbnailUrl.trim();
  if (!clean) return [];

  const withoutQuery = clean.split('?')[0];
  const variants = [withoutQuery];

  // Common Twitch preview layouts
  variants.push(withoutQuery.replace(/-preview[^/.]*\.(?:jpg|jpeg|png|webp)$/i, '.mp4'));
  variants.push(withoutQuery.replace(/-social-preview\.(?:jpg|jpeg|png|webp)$/i, '.mp4'));
  variants.push(withoutQuery.replace(/\.(?:jpg|jpeg|png|webp)$/i, '.mp4'));

  // Sometimes thumbnail_url can include static-cdn host while media is on production.assets
  variants.push(
    withoutQuery
      .replace('https://static-cdn.jtvnw.net/twitch-clips/', 'https://production.assets.clips.twitchcdn.net/')
      .replace(/-preview[^/.]*\.(?:jpg|jpeg|png|webp)$/i, '.mp4')
  );

  return dedupeStrings(variants).filter((value) => /\.mp4(?:\?|$)/i.test(value));
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
  const add = (value) => {
    if (!value || typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed || !/\.mp4(?:\?|$)/i.test(trimmed)) return;
    candidates.push(trimmed);
  };

  for (const value of buildClipThumbnails(clip.thumbnail_url || '')) {
    add(value);
  }

  const clipUrl = clip.url || '';
  if (clipUrl.includes('/clip/')) {
    const slug = clipUrl.split('/clip/')[1]?.split(/[/?#]/)[0];
    if (slug) {
      add(`https://clips-media-assets2.twitch.tv/${slug}.mp4`);
      add(`https://production.assets.clips.twitchcdn.net/${slug}.mp4`);
    }
  }

  // Important for clips with VOD-based URLs.
  const thumbPathMatch = (clip.thumbnail_url || '').match(/\/twitch-clips\/([^/]+)\//i);
  const thumbAssetKey = thumbPathMatch?.[1];
  const vodOffset = clip.vod_offset;
  const videoId = clip.video_id;
  if (thumbAssetKey && videoId && Number.isFinite(vodOffset)) {
    add(`https://production.assets.clips.twitchcdn.net/${thumbAssetKey}/vod-${videoId}-offset-${vodOffset}.mp4`);
  }

  if (clipId) {
    add(`https://clips-media-assets2.twitch.tv/${clipId}.mp4`);
    add(`https://production.assets.clips.twitchcdn.net/${clipId}.mp4`);
  }

  return chooseBestMp4(dedupeStrings(candidates));
};

const fetchClipPlaybackSourcesViaGql = async (clipSlug, gqlClientId) => {
  const response = await fetchWithTimeout(TWITCH_GQL_URL, {
    method: 'POST',
    headers: {
      'Client-ID': gqlClientId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query GetClipPlayback($slug: ID!) {
        clip(slug: $slug) {
          videoQualities {
            sourceURL
            quality
          }
          playbackAccessToken(params: { platform: "web", playerBackend: "mediaplayer", playerType: "site" }) {
            signature
            value
          }
        }
      }`,
      variables: { slug: clipSlug },
    }),
  });

  if (!response.ok) {
    throw new Error(`GQL request failed with ${response.status}`);
  }

  const payload = await response.json();
  const clip = payload?.data?.clip;
  const allSources = (clip?.videoQualities || [])
    .map((item) => item?.sourceURL)
    .filter((url) => typeof url === 'string' && url.length > 0);

  const sources = chooseBestMp4(allSources.filter((url) => /\.mp4(?:\?|$)/i.test(url)));
  const playlistSources = dedupeStrings(allSources.filter((url) => /\.m3u8(?:\?|$)/i.test(url)));

  return {
    sources,
    playlistSources,
    accessToken: clip?.playbackAccessToken || null,
  };
};

export const fetchClipPlaybackSources = async (clipSlug) => {
  const configured = process.env.TWITCH_GQL_CLIENT_ID || '';
  const appClientId = process.env.TWITCH_CLIENT_ID || '';
  const clientIds = dedupeStrings([configured, TWITCH_PUBLIC_GQL_CLIENT_ID, appClientId]);

  for (const clientId of clientIds) {
    try {
      const result = await fetchClipPlaybackSourcesViaGql(clipSlug, clientId);
      if (result.sources.length || result.playlistSources.length || result.accessToken) {
        return result;
      }
    } catch {
      // Try next Client-ID fallback.
    }
  }

  return { sources: [], playlistSources: [], accessToken: null };
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

const parseM3u8ToBestMediaUrl = (playlistText = '', baseUrl = '') => {
  const lines = playlistText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  // Variant playlist (#EXT-X-STREAM-INF then URL line)
  const variants = [];
  for (let i = 0; i < lines.length - 1; i += 1) {
    const line = lines[i];
    if (!line.startsWith('#EXT-X-STREAM-INF')) continue;
    const next = lines[i + 1];
    if (!next || next.startsWith('#')) continue;

    const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
    const bandwidth = bwMatch ? Number.parseInt(bwMatch[1], 10) : 0;
    variants.push({
      url: new URL(next, baseUrl).toString(),
      bandwidth: Number.isFinite(bandwidth) ? bandwidth : 0,
    });
  }

  if (variants.length > 0) {
    variants.sort((a, b) => b.bandwidth - a.bandwidth);
    return variants[0].url;
  }

  // Media playlist segments
  for (const line of lines) {
    if (line.startsWith('#')) continue;
    return new URL(line, baseUrl).toString();
  }

  return null;
};

const resolveM3u8Candidate = async (candidate, timeoutMs) => {
  const response = await fetchWithTimeout(candidate, {}, timeoutMs);
  if (!response.ok) return null;

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const text = await response.text();

  // Support both proper m3u8 and text/plain playlist responses.
  if (!contentType.includes('mpegurl') && !text.includes('#EXTM3U')) {
    return null;
  }

  return parseM3u8ToBestMediaUrl(text, candidate);
};

export const probeClipMediaCandidates = async (
  candidates = [],
  {
    timeoutMs = 8_000,
    retries = 1,
    maxAttempts = 12,
  } = {}
) => {
  const attempts = dedupeStrings(candidates).slice(0, maxAttempts);

  for (const candidate of attempts) {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        if (/\.m3u8(?:\?|$)/i.test(candidate)) {
          const resolvedFromPlaylist = await resolveM3u8Candidate(candidate, timeoutMs);
          if (resolvedFromPlaylist) {
            const mediaResponse = await fetchWithTimeout(resolvedFromPlaylist, {}, timeoutMs);
            if (mediaResponse.ok) {
              return { response: mediaResponse, resolvedUrl: resolvedFromPlaylist };
            }
          }
          break;
        }

        const response = await fetchWithTimeout(candidate, {}, timeoutMs);
        if (!response.ok) {
          break;
        }

        const contentType = response.headers.get('content-type') || '';
        const isVideo =
          contentType.includes('video/') ||
          contentType.includes('application/octet-stream') ||
          contentType.includes('binary/octet-stream');

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

export const buildSignedClipCandidates = (baseUrls = [], accessToken = null) => {
  if (!accessToken?.signature || !accessToken?.value) return [];

  return dedupeStrings(baseUrls).map((url) => {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}sig=${encodeURIComponent(accessToken.signature)}&token=${encodeURIComponent(accessToken.value)}`;
  });
};

export const extractClipUriCandidatesFromAccessTokenValue = (accessTokenValue) => {
  const parsed = tryJsonParse(accessTokenValue);
  const clipUri = parsed?.clip_uri;
  if (!clipUri || typeof clipUri !== 'string') return [];

  const candidates = [clipUri];
  // Some payloads include source URL and playback endpoints in other fields.
  for (const key of ['sourceURL', 'source_url', 'url']) {
    if (typeof parsed[key] === 'string') candidates.push(parsed[key]);
  }

  return dedupeStrings(candidates);
};

export const clearCachedToken = () => {
  cachedToken = null;
};
