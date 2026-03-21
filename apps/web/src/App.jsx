import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Configure axios to send credentials
axios.defaults.withCredentials = true;

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

const formatClipDuration = (seconds) => `${Math.round(seconds)}s`;

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
};

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
  const [activeTab, setActiveTab] = useState('local');

  const [twitchChannel, setTwitchChannel] = useState('');
  const [showAdvancedChannelLookup, setShowAdvancedChannelLookup] = useState(false);
  const [twitchLoading, setTwitchLoading] = useState(false);
  const [twitchError, setTwitchError] = useState(null);
  const [twitchData, setTwitchData] = useState(null);
  const [includeAllClips, setIncludeAllClips] = useState(true);
  const [clipStart, setClipStart] = useState(() => {
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return start.toISOString().slice(0, 10);
  });
  const [clipEnd, setClipEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedTwitch, setSelectedTwitch] = useState(null);
  const [clipImporting, setClipImporting] = useState(null);
  
  // Twitch authentication state
  const [twitchUser, setTwitchUser] = useState(null);
  const [twitchAuthLoading, setTwitchAuthLoading] = useState(true);

  const fileInputRef = useRef(null);
  
  // Check Twitch auth on mount
  useEffect(() => {
    const checkTwitchAuth = async () => {
      try {
        const response = await axios.get('/api/auth/twitch/me', {
          withCredentials: true,
        });
        setTwitchUser(response.data.user);
      } catch {
        // Not authenticated, that's okay
        setTwitchUser(null);
      } finally {
        setTwitchAuthLoading(false);
      }
    };
    
    checkTwitchAuth();
    
    // Check for OAuth callback messages
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'twitch') {
      setActiveTab('twitch');
    }

    if (params.get('twitch_connected') === 'true') {
      setActiveTab('twitch');
      // Reload user info
      checkTwitchAuth();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('error')) {
      setActiveTab('twitch');
      setTwitchError(params.get('error'));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'twitch' || !twitchUser || twitchLoading || twitchData) {
      return;
    }

    handleFetchMyTwitch();
  }, [activeTab, twitchUser]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
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

    const url = URL.createObjectURL(file);
    setVideoPreview(url);

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

      let errorMessage = 'Failed to process video. Please try again.';

      if (err.response?.data) {
        const errorBlob = err.response.data;
        const reader = new FileReader();

        try {
          const errorText = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(errorBlob);
          });

          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || errorText;
          } catch {
            errorMessage = errorText || errorMessage;
          }
        } catch (readErr) {
          console.error('Failed to read error response:', readErr);
          errorMessage = err.response?.statusText || errorMessage;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
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

  const handleTwitchLogin = () => {
    window.location.href = '/api/auth/twitch/login?returnTo=twitch';
  };
  
  const handleTwitchLogout = async () => {
    try {
      await axios.post('/api/auth/twitch/logout', {}, {
        withCredentials: true,
      });
      setTwitchUser(null);
      setTwitchData(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };
  
  const handleFetchMyTwitch = async () => {
    setTwitchLoading(true);
    setTwitchError(null);
    setTwitchData(null);
    setSelectedTwitch(null);

    try {
      const response = await axios.get('/api/twitch/my-library', {
        params: {
          includeAllClips,
        },
        withCredentials: true,
      });
      setTwitchData(response.data);
    } catch (err) {
      console.error('Failed to load your Twitch library:', err);
      if (err.response?.status === 401) {
        setTwitchError('Session expired. Please log in again.');
        setTwitchUser(null);
      } else {
        setTwitchError(err.response?.data?.error || 'Failed to load your Twitch library.');
      }
    } finally {
      setTwitchLoading(false);
    }
  };

  const handleFetchTwitch = async () => {
    if (!twitchChannel) {
      setTwitchError('Enter a Twitch channel login for advanced lookup.');
      return;
    }

    setTwitchLoading(true);
    setTwitchError(null);
    setTwitchData(null);
    setSelectedTwitch(null);

    try {
      const response = await axios.get('/api/twitch/library', {
        params: {
          login: twitchChannel,
          clipStart,
          clipEnd,
          includeAllClips,
        },
      });
      setTwitchData(response.data);
    } catch (err) {
      console.error('Failed to load Twitch library:', err);
      setTwitchError(err.response?.data?.error || 'Failed to load Twitch library.');
    } finally {
      setTwitchLoading(false);
    }
  };

  const handleImportClip = async (clip) => {
    setClipImporting(clip.id);
    setTwitchError(null);
    try {
      const response = await axios.get('/api/twitch/clip-download', {
        params: { clipId: clip.id },
        responseType: 'blob',
      });

      const fileName = `${clip.title || 'twitch-clip'}.mp4`;
      const file = new File([response.data], fileName, { type: 'video/mp4' });
      handleFileSelect(file);
      setActiveTab('local');
    } catch (err) {
      console.error('Failed to import clip:', err);
      let message = 'Clip import failed. Please try again.';
      const blob = err.response?.data;
      if (blob instanceof Blob) {
        try {
          const text = await blob.text();
          const parsed = JSON.parse(text);
          message = parsed.error || message;
        } catch {
          // keep default message
        }
      } else if (err.response?.data?.error) {
        message = err.response.data.error;
      }
      setTwitchError(message);
    } finally {
      setClipImporting(null);
    }
  };

  return (
    <div className="app-container">
      <div className="main-content">
        <div className="header">
          <h1>Video Editor</h1>
          <p>Upload, configure, and process your videos</p>
        </div>

        <div className="tab-switcher" role="tablist" aria-label="Video sources">
          <button
            className={`tab-button ${activeTab === 'local' ? 'active' : ''}`}
            onClick={() => setActiveTab('local')}
            role="tab"
            aria-selected={activeTab === 'local'}
          >
            Local Upload
          </button>
          <button
            className={`tab-button ${activeTab === 'twitch' ? 'active' : ''}`}
            onClick={() => setActiveTab('twitch')}
            role="tab"
            aria-selected={activeTab === 'twitch'}
          >
            Twitch Library
          </button>
        </div>

        {activeTab === 'local' && (
          <div className="upload-card">
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

            {videoFile && (
              <div className="config-section">
                <h3>Configuration</h3>

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

                {error && (
                  <div className="error-box" role="alert">
                    <p>{error}</p>
                  </div>
                )}

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
        )}

        {activeTab === 'twitch' && (
          <div className="upload-card">
            <div className="twitch-header">
              <div>
                <h2>Twitch Library</h2>
                <p>Browse VODs and clips, then import a clip for editing.</p>
              </div>
            </div>
            
            {!twitchAuthLoading && (
              <div className="twitch-auth-section">
                {twitchUser ? (
                  <div className="twitch-user-card">
                    <div className="twitch-user-info">
                      {twitchUser.profileImageUrl && (
                        <img
                          src={twitchUser.profileImageUrl}
                          alt={twitchUser.displayName}
                          className="twitch-user-avatar"
                        />
                      )}
                      <div>
                        <h3>{twitchUser.displayName}</h3>
                        <p>@{twitchUser.login}</p>
                      </div>
                    </div>
                    <div className="twitch-auth-buttons">
                      <button
                        className="process-btn"
                        onClick={handleFetchMyTwitch}
                        disabled={twitchLoading}
                      >
                        {twitchLoading ? 'Loading...' : 'Load My Videos'}
                      </button>
                      <button
                        className="secondary-btn"
                        onClick={handleTwitchLogout}
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="twitch-login-prompt">
                    <h3>Connect Your Twitch Account</h3>
                    <p>Login with Twitch to browse and import your VODs and clips.</p>
                    <button
                      className="twitch-login-btn"
                      onClick={handleTwitchLogin}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
                      </svg>
                      Login with Twitch
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="twitch-form">
              <div className="input-group toggle-group">
                <label>Clip Range</label>
                <button
                  type="button"
                  className={`toggle-button ${includeAllClips ? 'active' : ''}`}
                  onClick={() => setIncludeAllClips(true)}
                >
                  All Time
                </button>
                <button
                  type="button"
                  className={`toggle-button ${!includeAllClips ? 'active' : ''}`}
                  onClick={() => setIncludeAllClips(false)}
                >
                  Date Range
                </button>
              </div>

              {!includeAllClips && (
                <>
                  <div className="input-group">
                    <label>Clip Start Date</label>
                    <input
                      type="date"
                      value={clipStart}
                      onChange={(e) => setClipStart(e.target.value)}
                    />
                  </div>

                  <div className="input-group">
                    <label>Clip End Date</label>
                    <input
                      type="date"
                      value={clipEnd}
                      onChange={(e) => setClipEnd(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowAdvancedChannelLookup((prev) => !prev)}
              >
                {showAdvancedChannelLookup
                  ? 'Hide advanced channel lookup'
                  : (twitchUser ? 'Advanced: Load another channel' : 'Load by channel login (advanced)')}
              </button>

              {showAdvancedChannelLookup && (
                <div style={{ marginTop: '1rem' }}>
                  <div className="input-group" style={{ marginBottom: '1rem' }}>
                    <label>Twitch Channel Login (advanced)</label>
                    <input
                      type="text"
                      value={twitchChannel}
                      onChange={(e) => setTwitchChannel(e.target.value.trim())}
                      placeholder="e.g. creatorname"
                    />
                  </div>
                  <button
                    className="process-btn"
                    onClick={handleFetchTwitch}
                    disabled={twitchLoading}
                  >
                    {twitchLoading ? 'Loading Twitch library...' : 'Load Selected Channel'}
                  </button>
                </div>
              )}
            </div>

            {twitchError && (
              <div className="error-box" role="alert">
                <p>{twitchError}</p>
              </div>
            )}

            {twitchData && (
              <div className="twitch-results">
                <div className="twitch-summary">
                  <div>
                    <h3>{twitchData.broadcaster?.displayName}</h3>
                    <p>@{twitchData.broadcaster?.login}</p>
                    <div className="twitch-meta">
                      <span>{twitchData.vods?.length || 0} VODs</span>
                      <span>{twitchData.clips?.length || 0} Clips</span>
                      <span>
                        {twitchData.clipWindow?.allTime
                          ? 'All-time clips'
                          : `${formatDate(twitchData.clipWindow?.start)} → ${formatDate(twitchData.clipWindow?.end)}`}
                      </span>
                    </div>
                  </div>
                  {twitchData.broadcaster?.profileImageUrl && (
                    <img
                      src={twitchData.broadcaster.profileImageUrl}
                      alt="Twitch profile"
                      className="twitch-avatar"
                    />
                  )}
                </div>

                <div className="twitch-section">
                  <h4>VODs</h4>
                  <div className="twitch-grid">
                    {twitchData.vods?.map((vod) => (
                      <div
                        key={vod.id}
                        className={`twitch-card ${selectedTwitch?.id === vod.id ? 'selected' : ''}`}
                        onClick={() => setSelectedTwitch({ ...vod, type: 'vod' })}
                      >
                        <img src={vod.thumbnail_url} alt={vod.title} />
                        <div className="twitch-card-body">
                          <h5>{vod.title}</h5>
                          <p>{formatDate(vod.created_at)} • {vod.duration}</p>
                          <div className="twitch-card-actions">
                            <a href={vod.url} target="_blank" rel="noreferrer">Open in Twitch</a>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!twitchData.vods?.length && (
                      <p className="twitch-empty">No VODs found for this channel.</p>
                    )}
                  </div>
                </div>

                <div className="twitch-section">
                  <h4>Clips</h4>
                  <div className="twitch-grid">
                    {twitchData.clips?.map((clip) => (
                      <div
                        key={clip.id}
                        className={`twitch-card ${selectedTwitch?.id === clip.id ? 'selected' : ''}`}
                        onClick={() => setSelectedTwitch({ ...clip, type: 'clip' })}
                      >
                        <img src={clip.thumbnail_url} alt={clip.title} />
                        <div className="twitch-card-body">
                          <h5>{clip.title}</h5>
                          <p>{formatDate(clip.created_at)} • {formatClipDuration(clip.duration)}</p>
                          <div className="twitch-card-actions">
                            <a href={clip.url} target="_blank" rel="noreferrer">Open in Twitch</a>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleImportClip(clip);
                              }}
                              disabled={clipImporting === clip.id}
                            >
                              {clipImporting === clip.id ? 'Importing...' : 'Import Clip'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!twitchData.clips?.length && (
                      <p className="twitch-empty">No clips found for this date range.</p>
                    )}
                  </div>
                </div>

                {selectedTwitch && (
                  <div className="twitch-selection">
                    <h4>Selected {selectedTwitch.type === 'vod' ? 'VOD' : 'Clip'}</h4>
                    <p>{selectedTwitch.title}</p>
                    <p className="twitch-selection-meta">{selectedTwitch.url}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
