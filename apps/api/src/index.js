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

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
  fileFilter: (req, file, cb) => {
    // Accept all video MIME types + common video file extensions
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.mpeg', '.mpg'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (file.mimetype.startsWith('video/') || videoExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
});

// Health check endpoint
app.get('/health', (req, res) => {
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

    inputPath = req.file.path;

    // Validate parameters
    const totalLength = parseFloat(req.body.totalLength);
    const cutDuration = parseFloat(req.body.cutDuration);

    if (!totalLength || totalLength <= 0) {
      return res.status(400).json({ error: 'Invalid totalLength parameter' });
    }

    if (!cutDuration || cutDuration <= 0) {
      return res.status(400).json({ error: 'Invalid cutDuration parameter' });
    }

    if (cutDuration > totalLength) {
      return res.status(400).json({ 
        error: 'cutDuration cannot be greater than totalLength' 
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
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(webDistPath, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        error: 'File too large. Maximum size is 500MB.' 
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
