import { useState, useRef } from 'react';
import axios from 'axios';
import './App.css';

const PRESETS = {
  quick30s: { label: 'Quick 30s (3s cuts)', totalLength: 30, cutDuration: 3 },
  oneMin: { label: '1 min summary (5s cuts)', totalLength: 60, cutDuration: 5 },
  custom: { label: 'Custom', totalLength: 30, cutDuration: 3 }
};

const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.mpeg', '.mpg'];

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

const DEFAULT_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const MAX_FILE_SIZE_BYTES =
  parseFileSize(import.meta.env.VITE_MAX_FILE_SIZE) || DEFAULT_MAX_FILE_SIZE_BYTES;
const MAX_FILE_SIZE_LABEL = formatBytesLabel(MAX_FILE_SIZE_BYTES);

function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoDuration, setVideoDuration] = useState(null);
  const [preset, setPreset] = useState('quick30s');
  const [totalLength, setTotalLength] = useState(30);
  const [cutDuration, setCutDuration] = useState(3);
  const [loading, setLoading] = useState(false);
  const [resultVideo, setResultVideo] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      // Only set to false if dragging out of the zone completely
      if (e.currentTarget === e.target) {
        setDragActive(false);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) {
      console.warn('No file provided to handleFileSelect');
      return;
    }
    
    console.log('File selected:', { name: file.name, size: file.size, type: file.type });
    
    // Validate file type
    const fileExt = file.name?.includes('.') ? `.${file.name.split('.').pop().toLowerCase()}` : '';
    const isVideoType = file.type?.startsWith('video/');
    const isVideoExtension = VIDEO_EXTENSIONS.includes(fileExt);

    if (!isVideoType && !isVideoExtension) {
      setError('Please select a valid video file');
      setVideoFile(null);
      setVideoPreview(null);
      setVideoDuration(null);
      setResultVideo(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      console.warn('Invalid file type:', file.type, fileExt);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size must be less than ${MAX_FILE_SIZE_LABEL}`);
      setVideoFile(null);
      setVideoPreview(null);
      setVideoDuration(null);
      setResultVideo(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      console.warn('File too large:', file.size);
      return;
    }

    setError(null);
    setVideoFile(file);
    setResultVideo(null);
    setUploadProgress(0);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    
    // Get video duration
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const duration = Math.floor(video.duration);
      setVideoDuration(duration);
      console.log('Video duration:', duration);
    };
    video.onerror = () => {
      console.error('Failed to load video metadata');
      window.URL.revokeObjectURL(video.src);
    };
    video.src = url;
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
    // Reset the input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePresetChange = (presetKey) => {
    setPreset(presetKey);
    if (presetKey !== 'custom') {
      const presetConfig = PRESETS[presetKey];
      setTotalLength(presetConfig.totalLength);
      setCutDuration(presetConfig.cutDuration);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleProcess = async () => {
    if (!videoFile) {
      setError('Please select a video file');
      return;
    }

    if (totalLength <= 0 || cutDuration <= 0) {
      setError('Total length and cut duration must be greater than 0');
      return;
    }

    if (cutDuration > totalLength) {
      setError('Cut duration cannot be greater than total length');
      return;
    }

    if (videoDuration && totalLength > videoDuration) {
      setError('Total length cannot exceed the video duration');
      return;
    }

    setLoading(true);
    setError(null);
    setResultVideo(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('totalLength', totalLength);
      formData.append('cutDuration', cutDuration);

      const response = await axios.post('/api/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
          console.log('Upload progress:', percentCompleted);
        }
      });

      const videoBlob = new Blob([response.data], { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(videoBlob);
      setResultVideo(videoUrl);
    } catch (err) {
      console.error('Processing error:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to process video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultVideo) return;
    
    const a = document.createElement('a');
    a.href = resultVideo;
    a.download = `processed_${videoFile.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = (e) => {
    e.stopPropagation();
    setVideoFile(null);
    setVideoPreview(null);
    setVideoDuration(null);
    setResultVideo(null);
    setError(null);
    setUploadProgress(0);
  };

  return (
    <div className="app-container">
      <div className="main-content">
        <div className="header">
          <h1>Video Editor</h1>
          <p>Upload, configure, and process your videos</p>
        </div>

        <div className="upload-card">
          {/* File Upload Zone */}
          <div
            className={`upload-zone ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileInputChange}
              className="hidden"
              aria-label="Upload video file"
            />
            
            {videoFile ? (
              <div>
                <svg className="upload-icon success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="file-info">
                  <h3>{videoFile.name}</h3>
                  <p>
                    {formatFileSize(videoFile.size)}
                    {videoDuration && ` • ${formatTime(videoDuration)}`}
                  </p>
                </div>
                {videoPreview && (
                  <video 
                    src={videoPreview} 
                    controls 
                    className="video-preview"
                  />
                )}
                <button onClick={handleReset} className="change-file-btn">
                  Choose different file
                </button>
              </div>
            ) : (
              <div>
                <svg className="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="upload-text">Drag and drop your video here</p>
                <p className="upload-subtext">or click to browse</p>
                <p className="upload-limit">Max file size {MAX_FILE_SIZE_LABEL}</p>
              </div>
            )}
          </div>

          {error && !videoFile && (
            <div className="error-box" role="alert">
              <p>{error}</p>
            </div>
          )}

          {/* Configuration Form */}
          {videoFile && (
            <div className="config-section">
              <h3>Configuration</h3>
              
              {/* Preset Options */}
              <div className="presets">
                {Object.entries(PRESETS).map(([key, config]) => (
                  <div
                    key={key}
                    className={`preset-option ${preset === key ? 'selected' : ''}`}
                    onClick={() => handlePresetChange(key)}
                  >
                    <input
                      type="radio"
                      name="preset"
                      value={key}
                      checked={preset === key}
                      onChange={() => handlePresetChange(key)}
                    />
                    <label>{config.label}</label>
                  </div>
                ))}
              </div>

              {/* Custom Inputs */}
              <div className="inputs-grid">
                <div className="input-group">
                  <label>Total Output Length (seconds)</label>
                  <input
                    type="number"
                    min="1"
                    value={totalLength}
                    onChange={(e) => {
                      setTotalLength(parseInt(e.target.value) || 0);
                      setPreset('custom');
                    }}
                  />
                  <p className="input-hint">≈ {formatTime(totalLength)}</p>
                </div>

                <div className="input-group">
                  <label>Cut Duration (seconds)</label>
                  <input
                    type="number"
                    min="1"
                    value={cutDuration}
                    onChange={(e) => {
                      setCutDuration(parseInt(e.target.value) || 0);
                      setPreset('custom');
                    }}
                  />
                  <p className="input-hint">≈ {Math.floor(totalLength / cutDuration)} cuts</p>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="error-box" role="alert">
                  <p>{error}</p>
                </div>
              )}

              {/* Process Button */}
              <button onClick={handleProcess} disabled={loading} className="process-btn">
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    {uploadProgress > 0 && uploadProgress < 100
                      ? `Uploading... ${uploadProgress}%`
                      : 'Processing...'}
                  </>
                ) : (
                  'Process Video'
                )}
              </button>
              {loading && (
                <div className="progress-container" aria-live="polite">
                  <div className="progress-track">
                    <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <p className="progress-text">Upload progress: {uploadProgress}%</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Result Display */}
        {resultVideo && (
          <div className="result-card">
            <h3>✨ Processed Video</h3>
            
            <video 
              src={resultVideo} 
              controls 
              className="result-video"
            />
            
            <button onClick={handleDownload} className="download-btn">
              <svg className="download-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Video
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
