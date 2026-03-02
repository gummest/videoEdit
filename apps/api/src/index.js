import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { processVideo } from './videoProcessor.js';
import { cleanupTempFiles } from './utils.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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
app.use(cors());
app.use(express.json({ limit: maxUploadBytes }));
app.use(express.urlencoded({ extended: true, limit: maxUploadBytes }));

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
