import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClipWindows,
  buildSignedClipCandidates,
  clearCachedToken,
  deriveClipMp4Candidates,
  extractClipUriCandidatesFromAccessTokenValue,
  fetchClipPlaybackSources,
  getAppAccessToken,
  probeClipMediaCandidates,
} from './twitchClient.js';

const originalFetch = globalThis.fetch;

const mockFetch = (handler) => {
  globalThis.fetch = handler;
};

const restoreFetch = () => {
  globalThis.fetch = originalFetch;
};

test('getAppAccessToken caches token until expiry', async () => {
  process.env.TWITCH_CLIENT_ID = 'test-client-id';
  process.env.TWITCH_CLIENT_SECRET = 'test-client-secret';

  let callCount = 0;
  mockFetch(async () => {
    callCount += 1;
    return {
      ok: true,
      json: async () => ({ access_token: 'token-123', expires_in: 3600 }),
    };
  });

  clearCachedToken();
  const first = await getAppAccessToken();
  const second = await getAppAccessToken();

  assert.equal(first, 'token-123');
  assert.equal(second, 'token-123');
  assert.equal(callCount, 1);

  restoreFetch();
  clearCachedToken();
});

test('getAppAccessToken throws when env vars are missing', async () => {
  delete process.env.TWITCH_CLIENT_ID;
  delete process.env.TWITCH_CLIENT_SECRET;

  clearCachedToken();

  await assert.rejects(() => getAppAccessToken(), /Missing required Twitch environment variable/);
});

test('buildClipWindows splits range into windows', () => {
  const start = new Date('2026-01-01T00:00:00.000Z');
  const end = new Date('2026-03-01T00:00:00.000Z');

  const windows = buildClipWindows(start, end, 30);

  assert.equal(windows.length, 2);
  assert.equal(windows[0].start.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(windows[1].end.toISOString(), '2026-03-01T00:00:00.000Z');
});

test('deriveClipMp4Candidates handles multiple Twitch thumbnail formats', () => {
  const clip = {
    thumbnail_url: 'https://clips-media-assets2.twitch.tv/AT-cm%7C123-preview-480x272.jpg',
    url: 'https://www.twitch.tv/someone/clip/JollyLachrymosePeanutHassaanChop-mmGrRLjnDeIzcS17',
  };

  const candidates = deriveClipMp4Candidates(clip, 'JollyLachrymosePeanutHassaanChop-mmGrRLjnDeIzcS17');

  assert.ok(candidates.some((url) => url.endsWith('AT-cm%7C123.mp4')));
  assert.ok(candidates.some((url) => url.includes('JollyLachrymosePeanutHassaanChop-mmGrRLjnDeIzcS17.mp4')));
});

test('deriveClipMp4Candidates includes VOD offset based candidate', () => {
  const clip = {
    thumbnail_url: 'https://static-cdn.jtvnw.net/twitch-clips/abc123/vod-1862442605-offset-6160-preview-480x272.jpg',
    video_id: '1862442605',
    vod_offset: 6160,
  };

  const candidates = deriveClipMp4Candidates(clip, 'clipSlug');
  assert.ok(candidates.includes('https://production.assets.clips.twitchcdn.net/abc123/vod-1862442605-offset-6160.mp4'));
});

test('deriveClipMp4Candidates returns deterministic unique list', () => {
  const clip = {
    thumbnail_url: 'https://clips-media-assets2.twitch.tv/foo-preview.jpg?abc=1',
  };

  const candidates = deriveClipMp4Candidates(clip, 'foo');

  assert.equal(candidates.length, new Set(candidates).size);
  assert.ok(candidates.every((url) => url.includes('.mp4')));
});

test('fetchClipPlaybackSources falls back to public gql client id and extracts mp4', async () => {
  process.env.TWITCH_GQL_CLIENT_ID = 'bad-client';
  let callCount = 0;

  mockFetch(async (url, options) => {
    callCount += 1;
    const clientId = options?.headers?.['Client-ID'];
    if (clientId === 'bad-client') {
      return { ok: false, status: 400, json: async () => ({}) };
    }

    return {
      ok: true,
      json: async () => ({
        data: {
          clip: {
            videoQualities: [
              { sourceURL: 'https://production.assets.clips.twitchcdn.net/v2/media/slug/video.mp4' },
              { sourceURL: 'https://production.assets.clips.twitchcdn.net/v2/media/slug/video-720.mp4' },
            ],
            playbackAccessToken: { signature: 'sig', value: '{"clip_uri":"https://foo/bar.mp4"}' },
          },
        },
      }),
    };
  });

  const result = await fetchClipPlaybackSources('slug');
  assert.equal(result.sources.length, 2);
  assert.equal(result.accessToken.signature, 'sig');
  assert.ok(callCount >= 2);

  delete process.env.TWITCH_GQL_CLIENT_ID;
  restoreFetch();
});

test('extractClipUriCandidatesFromAccessTokenValue returns clip_uri candidate', () => {
  const tokenValue = JSON.stringify({ clip_uri: 'https://production.assets.clips.twitchcdn.net/foo.mp4' });
  const result = extractClipUriCandidatesFromAccessTokenValue(tokenValue);
  assert.deepEqual(result, ['https://production.assets.clips.twitchcdn.net/foo.mp4']);
});

test('buildSignedClipCandidates appends signature and token', () => {
  const signed = buildSignedClipCandidates(['https://foo/video.mp4'], { signature: 'sig', value: 'tokenValue' });
  assert.equal(signed.length, 1);
  assert.ok(signed[0].includes('sig=sig'));
  assert.ok(signed[0].includes('token=tokenValue'));
});

test('probeClipMediaCandidates retries and resolves first valid video source', async () => {
  let calls = 0;
  mockFetch(async () => {
    calls += 1;
    if (calls === 1) {
      throw new TypeError('network down');
    }
    return {
      ok: true,
      headers: { get: () => 'video/mp4' },
    };
  });

  const result = await probeClipMediaCandidates(['https://example.com/a.mp4'], {
    timeoutMs: 200,
    retries: 1,
    maxAttempts: 1,
  });

  assert.equal(result.resolvedUrl, 'https://example.com/a.mp4');
  assert.ok(result.response);
  assert.equal(calls, 2);

  restoreFetch();
});

test('probeClipMediaCandidates can resolve m3u8 playlist to media segment', async () => {
  let call = 0;
  mockFetch(async (url) => {
    call += 1;
    if (url.includes('.m3u8')) {
      return {
        ok: true,
        headers: { get: () => 'application/vnd.apple.mpegurl' },
        text: async () => '#EXTM3U\n#EXTINF:1.0,\nsegment.ts\n',
      };
    }

    return {
      ok: true,
      headers: { get: () => 'video/mp2t' },
    };
  });

  const result = await probeClipMediaCandidates(['https://cdn.test/video.m3u8'], {
    timeoutMs: 200,
    retries: 0,
    maxAttempts: 1,
  });

  assert.ok(result.response);
  assert.equal(result.resolvedUrl, 'https://cdn.test/segment.ts');
  assert.equal(call, 2);

  restoreFetch();
});

test('probeClipMediaCandidates returns null response after exhausted attempts', async () => {
  mockFetch(async () => {
    throw new TypeError('timeout');
  });

  const result = await probeClipMediaCandidates(['https://example.com/a.mp4'], {
    timeoutMs: 50,
    retries: 0,
    maxAttempts: 1,
  });

  assert.equal(result.response, null);
  assert.equal(result.resolvedUrl, null);

  restoreFetch();
});
