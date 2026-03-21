import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClipWindows,
  clearCachedToken,
  deriveClipMp4Candidates,
  fetchClipPlaybackSources,
  getAppAccessToken,
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

test('deriveClipMp4Candidates returns deterministic unique list', () => {
  const clip = {
    thumbnail_url: 'https://clips-media-assets2.twitch.tv/foo-preview.jpg?abc=1',
  };

  const candidates = deriveClipMp4Candidates(clip, 'foo');

  assert.equal(candidates.length, new Set(candidates).size);
  assert.ok(candidates.every((url) => url.includes('.mp4')));
});

test('fetchClipPlaybackSources extracts mp4 sources from Twitch GQL', async () => {
  process.env.TWITCH_CLIENT_ID = 'test-client-id';

  mockFetch(async () => ({
    ok: true,
    json: async () => ({
      data: {
        clip: {
          videoQualities: [
            { sourceURL: 'https://production.assets.clips.twitchcdn.net/v2/media/slug/video.mp4' },
            { sourceURL: 'https://production.assets.clips.twitchcdn.net/v2/media/slug/video-720.mp4' },
          ],
          playbackAccessToken: { signature: 'sig', value: 'token' },
        },
      },
    }),
  }));

  const result = await fetchClipPlaybackSources('slug');
  assert.equal(result.sources.length, 2);
  assert.equal(result.accessToken.signature, 'sig');

  restoreFetch();
});
