import express from 'express';
import multer from 'multer';
import cors from 'cors';
import session from 'express-session';
import { processVideo } from './videoProcessor.js';
import { cleanupTempFiles } from './utils.js';
import {
  fetchAllClips,
  fetchAllClipsAllTime,
  fetchAllVideos,
  fetchClipById,
  fetchUserByLogin,
} from './twitchClient.js';
import authRoutes, { requireTwitchAuth, userTwitchFetch } from './authRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Required when running behind HTTPS reverse proxy (Coolify/Nginx/Cloudflare)
app.set('trust proxy', 1);

const DEFAULT_MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

const parseFileSize = (value) => {
  if (!value) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);

  const normalized = value.toString().trim().toLowerCase();
  if (!normalized) return null;

  if (/^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10);
  }

  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/i);
  if (!match) return null;

  const amount = Number.parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    b: 1,
    kb: 1024,
    mb: 1024 ** 2,
    gb: 1024 ** 3,
  };

  return Math.floor(amount * multipliers[unit]);
};

const formatBytesLabel = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0B';
  const gb = 1024 ** 3;
  const mb = 1024 ** 2;
  const kb = 1024;

  if (bytes >= gb) {
    const value = Math.round((bytes / gb) * 10) / 10;
    return `${value % 1 === 0 ? Math.trunc(value) : value}GB`;
  }
  if (bytes >= mb) {
    const value = Math.round((bytes / mb) * 10) / 10;
    return `${value % 1 === 0 ? Math.trunc(value) : value}MB`;
  }
  if (bytes >= kb) {
    const value = Math.round((bytes / kb) * 10) / 10;
    return `${value % 1 === 0 ? Math.trunc(value) : value}KB`;
  }
  return `${bytes}B`;
};

const maxUploadBytes =
  parseFileSize(process.env.MAX_FILE_SIZE) ||
  parseFileSize(process.env.MAX_UPLOAD_SIZE) ||
  DEFAULT_MAX_UPLOAD_BYTES;
const maxUploadLabel = formatBytesLabel(maxUploadBytes);

// Middleware
app.disable('x-powered-by');
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: maxUploadBytes }));
app.use(express.urlencoded({ extended: true, limit: maxUploadBytes }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'videoedit-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  proxy: isProduction,
  cookie: {
    secure: isProduction,
    sameSite: isProduction ? 'lax' : 'lax',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
}));

// Auth routes
app.use('/api/auth', authRoutes);

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: maxUploadBytes,
    files: 1,
    fields: 10,
  },
  fileFilter: (req, file, cb) => {
    // Accept all video MIME types + common video file extensions
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.mpeg', '.mpg'];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (file.mimetype?.startsWith('video/') || videoExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
});

// Health check endpoint
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'ok', service: 'video-processing-api' });
});

// Video processing endpoint
app.post('/api/process', upload.single('video'), async (req, res) => {
  let inputPath = null;
  let outputPath = null;

  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    if (!req.file.size) {
      return res.status(400).json({ error: 'Uploaded video file is empty' });
    }

    inputPath = req.file.path;

    // Validate parameters
    const totalLength = Number(req.body.totalLength);
    const cutDuration = Number(req.body.cutDuration);

    if (!Number.isFinite(totalLength) || totalLength <= 0) {
      return res.status(400).json({ error: 'Invalid totalLength parameter' });
    }

    if (!Number.isFinite(cutDuration) || cutDuration <= 0) {
      return res.status(400).json({ error: 'Invalid cutDuration parameter' });
    }

    if (cutDuration > totalLength) {
      return res.status(400).json({
        error: 'cutDuration cannot be greater than totalLength',
      });
    }

    console.log(`Processing video: ${req.file.originalname}`);
    console.log(`Total length: ${totalLength}s, Cut duration: ${cutDuration}s`);

    // Process the video
    outputPath = await processVideo(inputPath, totalLength, cutDuration);

    // Send the processed video
    res.download(outputPath, `processed_${req.file.originalname}`, async (err) => {
      // Cleanup after sending (success or error)
      await cleanupTempFiles([inputPath, outputPath]);
      
      if (err && !res.headersSent) {
        console.error('Error sending file:', err);
        res.status(500).json({ error: 'Error sending processed video' });
      }
    });

  } catch (error) {
    console.error('Video processing error:', error);
    
    // Cleanup on error
    if (inputPath) await cleanupTempFiles([inputPath]);
    if (outputPath) await cleanupTempFiles([outputPath]);

    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Video processing failed', 
        message: error.message 
      });
    }
  }
});

// User's Twitch library (requires auth)
app.get('/api/twitch/my-library', requireTwitchAuth, async (req, res) => {
  try {
    const { user } = req.session.twitchAuth;
    const { includeAllClips } = req.query;
    
    const includeAll = includeAllClips !== 'false';
    const clipStartDate = includeAll
      ? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const clipEndDate = new Date();
    
    // Fetch videos
    const fetchAllUserVideos = async (userId) => {
      const items = [];
      let cursor = null;
      
      do {
        const pageParams = {
          user_id: userId,
          type: 'archive',
          first: 100,
          ...(cursor ? { after: cursor } : {}),
        };
        
        const data = await userTwitchFetch(req.session, '/videos', pageParams);
        items.push(...(data.data || []));
        cursor = data.pagination?.cursor;
      } while (cursor);
      
      return items;
    };
    
    // Fetch clips
    const fetchAllUserClips = async (userId, startDate, endDate) => {
      const items = [];
      let cursor = null;
      
      do {
        const pageParams = {
          broadcaster_id: userId,
          started_at: startDate.toISOString(),
          ended_at: endDate.toISOString(),
          first: 100,
          ...(cursor ? { after: cursor } : {}),
        };
        
        const data = await userTwitchFetch(req.session, '/clips', pageParams);
        items.push(...(data.data || []));
        cursor = data.pagination?.cursor;
      } while (cursor);
      
      return items;
    };
    
    const [vods, clips] = await Promise.all([
      fetchAllUserVideos(user.id),
      includeAll
        ? fetchAllUserClips(user.id, clipStartDate, clipEndDate)
        : fetchAllUserClips(user.id, clipStartDate, clipEndDate),
    ]);
    
    return res.json({
      broadcaster: user,
      vods,
      clips,
      clipWindow: {
        start: clipStartDate.toISOString(),
        end: clipEndDate.toISOString(),
        allTime: includeAll,
      },
    });
  } catch (error) {
    console.error('Twitch my-library error:', error.message);
    return res.status(500).json({
      error: 'Failed to load your Twitch library. Please try logging in again.',
    });
  }
});

// Public Twitch library (no auth, for browsing other channels)
app.get('/api/twitch/library', async (req, res) => {
  try {
    const { login, broadcasterId, clipStart, clipEnd, includeAllClips } = req.query;

    if (!login && !broadcasterId) {
      return res.status(400).json({ error: 'Provide a Twitch channel login or broadcasterId.' });
    }

    const user = login ? await fetchUserByLogin(login) : { id: broadcasterId, display_name: broadcasterId, login: broadcasterId };

    const includeAll = includeAllClips !== 'false';
    const clipStartDate = includeAll
      ? new Date(user.created_at || Date.now() - 365 * 24 * 60 * 60 * 1000)
      : (clipStart ? new Date(clipStart) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const clipEndDate = includeAll
      ? new Date()
      : (clipEnd ? new Date(clipEnd) : new Date());

    if (Number.isNaN(clipStartDate.getTime()) || Number.isNaN(clipEndDate.getTime())) {
      return res.status(400).json({ error: 'Invalid clipStart or clipEnd date.' });
    }

    const [vods, clips] = await Promise.all([
      fetchAllVideos(user.id),
      includeAll
        ? fetchAllClipsAllTime(user.id, user.created_at)
        : fetchAllClips(user.id, clipStartDate.toISOString(), clipEndDate.toISOString()),
    ]);

    return res.json({
      broadcaster: {
        id: user.id,
        login: user.login,
        displayName: user.display_name,
        profileImageUrl: user.profile_image_url,
      },
      vods,
      clips,
      clipWindow: {
        start: clipStartDate.toISOString(),
        end: clipEndDate.toISOString(),
        allTime: includeAll,
      },
    });
  } catch (error) {
    console.error('Twitch library error:', error.message);
    return res.status(500).json({
      error: 'Failed to load Twitch library. Check server credentials and try again.',
    });
  }
});

app.get('/api/twitch/clip-download', async (req, res) => {
  try {
    const { clipId } = req.query;
    if (!clipId) {
      return res.status(400).json({ error: 'Missing clipId.' });
    }

    const clip = await fetchClipById(clipId);
    const thumbnailUrl = clip.thumbnail_url || '';
    const mp4Url = thumbnailUrl.replace(/-preview.*\.(jpg|png)/i, '.mp4');

    if (!mp4Url || mp4Url === thumbnailUrl) {
      return res.status(400).json({ error: 'Unable to derive clip media URL.' });
    }

    const clipResponse = await fetch(mp4Url);
    if (!clipResponse.ok) {
      return res.status(502).json({ error: 'Failed to fetch clip media.' });
    }

    res.setHeader('Content-Type', 'video/mp4');
    const safeTitle = clip.title?.replace(/[^a-z0-9-_ ]/gi, '').slice(0, 80) || 'twitch-clip';
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);

    const stream = Readable.fromWeb(clipResponse.body);
    stream.pipe(res);
  } catch (error) {
    console.error('Twitch clip download error:', error.message);
    return res.status(500).json({
      error: 'Failed to import Twitch clip.',
    });
  }
});

// Serve the web client after API routes
const webDistPath = path.resolve(__dirname, '../../web/dist');
app.use(express.static(webDistPath));

// SPA fallback (ignore API routes)
app.get(/^\/((?!api(?:\/|$)).*)/, (req, res) => {
  res.sendFile(path.join(webDistPath, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `File too large. Maximum size is ${maxUploadLabel}.`,
      });
    }
    return res.status(400).json({ error: error.message });
  }
  
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  
  next();
});

// Ensure uploads directory exists
await fs.mkdir('uploads', { recursive: true });

app.listen(PORT, () => {
  console.log(`Video processing API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Process endpoint: POST http://localhost:${PORT}/api/process`);
});
