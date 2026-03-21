import express from 'express';
import { randomUUID } from 'crypto';
import { requireAppAuth } from './authMiddleware.js';
import { decryptSecret, encryptSecret } from './security.js';
import { readDb, updateDb } from './db.js';
import { analyzeVideo } from './geminiAdapter.js';

const router = express.Router();

const EDIT_PROFILES = {
  short_vertical: {
    id: 'short_vertical',
    label: 'Vertical Reels/Shorts',
    orientation: '9:16',
    durationRangeSec: [30, 60],
    platforms: ['TikTok', 'Instagram Reels', 'YouTube Shorts'],
  },
  long_horizontal: {
    id: 'long_horizontal',
    label: 'Horizontal YouTube Video',
    orientation: '16:9',
    durationRangeSec: [900, 1200],
    platforms: ['YouTube'],
  },
};

router.get('/profiles', requireAppAuth, (req, res) => {
  res.json({ profiles: Object.values(EDIT_PROFILES) });
});

router.get('/settings/gemini', requireAppAuth, async (req, res) => {
  const db = await readDb();
  const item = db.settings.find((s) => s.userId === req.appUser.id && s.kind === 'gemini');
  return res.json({
    provider: 'gemini',
    model: item?.model || 'gemini-2.5-flash',
    hasApiKey: Boolean(item?.apiKeyEncrypted),
  });
});

router.put('/settings/gemini', requireAppAuth, async (req, res) => {
  const { apiKey, model } = req.body || {};
  if (apiKey && String(apiKey).length < 20) {
    return res.status(400).json({ error: 'Gemini API key format looks invalid.' });
  }

  await updateDb((draft) => {
    const existing = draft.settings.find((s) => s.userId === req.appUser.id && s.kind === 'gemini');
    if (existing) {
      if (typeof apiKey === 'string' && apiKey.length > 0) {
        existing.apiKeyEncrypted = encryptSecret(apiKey.trim());
      }
      existing.model = model || existing.model || 'gemini-2.5-flash';
      existing.updatedAt = new Date().toISOString();
    } else {
      draft.settings.push({
        id: randomUUID(),
        userId: req.appUser.id,
        kind: 'gemini',
        model: model || 'gemini-2.5-flash',
        apiKeyEncrypted: apiKey ? encryptSecret(apiKey.trim()) : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    return draft;
  });

  res.json({ success: true });
});

router.get('/jobs', requireAppAuth, async (req, res) => {
  const db = await readDb();
  const jobs = db.jobs.filter((j) => j.userId === req.appUser.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ jobs });
});

router.post('/jobs', requireAppAuth, async (req, res) => {
  const { sourceType, sourceUrl, profile, title, fileName, durationSec } = req.body || {};

  if (!['upload', 'twitch_clip', 'twitch_vod'].includes(sourceType)) {
    return res.status(400).json({ error: 'Invalid sourceType.' });
  }
  if (!EDIT_PROFILES[profile]) {
    return res.status(400).json({ error: 'Invalid profile.' });
  }

  const db = await readDb();
  const geminiSettings = db.settings.find((s) => s.userId === req.appUser.id && s.kind === 'gemini');
  const apiKey = decryptSecret(geminiSettings?.apiKeyEncrypted);

  const job = {
    id: randomUUID(),
    userId: req.appUser.id,
    title: title || fileName || sourceUrl || `Job-${Date.now()}`,
    source: {
      type: sourceType,
      url: sourceUrl || null,
      fileName: fileName || null,
      durationSec: Number(durationSec) || null,
    },
    profile,
    status: 'queued',
    timelinePlan: null,
    analysis: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await updateDb((draft) => {
    draft.jobs.push(job);
    return draft;
  });

  try {
    const analysisResult = await analyzeVideo({
      provider: apiKey ? 'gemini' : 'mock',
      apiKey,
      model: geminiSettings?.model || 'gemini-2.5-flash',
      source: job.source,
      profile,
    });

    const timelinePlan = {
      cuts: analysisResult.analysis.highlights || [],
      drops: analysisResult.analysis.unimportant || [],
      outputProfile: EDIT_PROFILES[profile],
      generatedAt: new Date().toISOString(),
      renderEngine: 'ffmpeg-pipeline-skeleton',
    };

    await updateDb((draft) => {
      const target = draft.jobs.find((j) => j.id === job.id);
      if (target) {
        target.analysis = analysisResult;
        target.timelinePlan = timelinePlan;
        target.status = 'analyzed';
        target.updatedAt = new Date().toISOString();
      }
      return draft;
    });
  } catch (error) {
    await updateDb((draft) => {
      const target = draft.jobs.find((j) => j.id === job.id);
      if (target) {
        target.status = 'failed';
        target.error = error.message;
        target.updatedAt = new Date().toISOString();
      }
      return draft;
    });
  }

  const latest = await readDb();
  const savedJob = latest.jobs.find((j) => j.id === job.id);
  res.status(201).json({ job: savedJob });
});

export default router;
