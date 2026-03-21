const GEMINI_BASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';

const parseJsonResponse = (text) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};

export const analyzeVideoWithGemini = async ({ apiKey, model, source, profile }) => {
  if (!apiKey) throw new Error('Gemini API key is required.');

  const prompt = `You are an expert video editor assistant.\nAnalyze this source and output STRICT JSON with keys: highlights (array of {startSec,endSec,reason,score}), unimportant (array of {startSec,endSec,reason}), summary.\nVideo metadata:\n- sourceType: ${source.type}\n- sourceUrl: ${source.url || 'n/a'}\n- fileName: ${source.fileName || 'n/a'}\n- durationSec: ${source.durationSec || 'unknown'}\n- targetProfile: ${profile}\n`; 

  const endpoint = `${GEMINI_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: { temperature: 0.2 },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini request failed: ${resp.status} ${errText}`);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') || '';
  const parsed = parseJsonResponse(text);

  return {
    provider: 'gemini',
    model,
    rawText: text,
    analysis: parsed || {
      highlights: [],
      unimportant: [],
      summary: 'Model response could not be parsed as JSON.',
    },
    todos: [
      'TODO: Switch to native Gemini video/file upload path once runtime permits resumable upload or URI-backed file references.',
      'TODO: Add shot-boundary extraction using ffprobe + scene-change detector pre-pass.',
    ],
  };
};

export const analyzeVideo = async ({ provider, apiKey, model, source, profile }) => {
  if (provider !== 'gemini') {
    return {
      provider: 'mock',
      model: 'heuristic-v1',
      analysis: {
        highlights: [{ startSec: 30, endSec: 48, reason: 'Energy spike (heuristic fallback)', score: 0.76 }],
        unimportant: [{ startSec: 0, endSec: 18, reason: 'Low activity intro' }],
        summary: 'Fallback analysis used because provider is not configured.',
      },
      todos: ['Configure Gemini provider in settings to enable model-based analysis.'],
    };
  }

  return analyzeVideoWithGemini({ apiKey, model, source, profile });
};
