import express from 'express';

const router = express.Router();

const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/authorize';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_API_BASE = 'https://api.twitch.tv/helix';

const getRequiredEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const toSafeTab = (value) => (value === 'twitch' ? 'twitch' : 'local');
const buildFrontendRedirect = ({ twitchConnected = false, error = null, tab = 'local' }) => {
  const redirect = new URL('/', 'https://edit.mesutapps.online');
  if (twitchConnected) redirect.searchParams.set('twitch_connected', 'true');
  if (error) redirect.searchParams.set('error', error);
  redirect.searchParams.set('tab', toSafeTab(tab));
  return `${redirect.pathname}${redirect.search}`;
};

// OAuth login redirect
router.get('/twitch/login', async (req, res) => {
  const clientId = getRequiredEnv('TWITCH_CLIENT_ID');
  const redirectUri = getRequiredEnv('TWITCH_REDIRECT_URI');
  const returnTab = toSafeTab(req.query.returnTo);
  const state = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const scopes = [
    'user:read:email',
    'clips:edit',
  ];

  req.session.twitchOAuth = {
    state,
    returnTab,
  };
  await req.session.save();

  const authUrl = new URL(TWITCH_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes.join(' '));
  authUrl.searchParams.set('force_verify', 'true');
  authUrl.searchParams.set('state', state);

  res.redirect(authUrl.toString());
});

// OAuth callback
router.get('/twitch/callback', async (req, res) => {
  const { code, error, error_description, state } = req.query;
  const savedOAuth = req.session.twitchOAuth;
  const returnTab = toSafeTab(savedOAuth?.returnTab || 'twitch');

  if (error) {
    console.error('Twitch OAuth error:', error, error_description);
    return res.redirect(buildFrontendRedirect({
      error: error_description || error,
      tab: returnTab,
    }));
  }

  if (!code) {
    return res.redirect(buildFrontendRedirect({
      error: 'No authorization code received',
      tab: returnTab,
    }));
  }

  if (!savedOAuth || !state || state !== savedOAuth.state) {
    return res.redirect(buildFrontendRedirect({
      error: 'OAuth state mismatch. Please try logging in again.',
      tab: 'twitch',
    }));
  }

  try {
    const clientId = getRequiredEnv('TWITCH_CLIENT_ID');
    const clientSecret = getRequiredEnv('TWITCH_CLIENT_SECRET');
    const redirectUri = getRequiredEnv('TWITCH_REDIRECT_URI');
    
    // Exchange code for token
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });
    
    const tokenResponse = await fetch(`${TWITCH_TOKEN_URL}?${tokenParams.toString()}`, {
      method: 'POST',
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }
    
    const tokenData = await tokenResponse.json();
    
    // Fetch user info
    const userResponse = await fetch(`${TWITCH_API_BASE}/users`, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });
    
    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info');
    }
    
    const userData = await userResponse.json();
    const user = userData.data?.[0];
    
    if (!user) {
      throw new Error('No user data received');
    }
    
    // Store in session
    req.session.twitchAuth = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
      user: {
        id: user.id,
        login: user.login,
        displayName: user.display_name,
        profileImageUrl: user.profile_image_url,
        email: user.email,
      },
    };
    
    delete req.session.twitchOAuth;
    await req.session.save();

    // Redirect to frontend and keep user on Twitch tab
    res.redirect(buildFrontendRedirect({
      twitchConnected: true,
      tab: returnTab,
    }));
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(buildFrontendRedirect({
      error: err.message,
      tab: returnTab,
    }));
  }
});

// Logout
router.post('/twitch/logout', (req, res) => {
  if (req.session.twitchAuth) {
    delete req.session.twitchAuth;
  }
  res.json({ success: true });
});

// Get current user
router.get('/twitch/me', (req, res) => {
  if (!req.session.twitchAuth) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { user } = req.session.twitchAuth;
  res.json({ user });
});

// Refresh token helper
const refreshAccessToken = async (session) => {
  const { refreshToken } = session.twitchAuth;
  
  const clientId = getRequiredEnv('TWITCH_CLIENT_ID');
  const clientSecret = getRequiredEnv('TWITCH_CLIENT_SECRET');
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  
  const response = await fetch(`${TWITCH_TOKEN_URL}?${params.toString()}`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }
  
  const data = await response.json();
  
  session.twitchAuth.accessToken = data.access_token;
  session.twitchAuth.refreshToken = data.refresh_token || refreshToken;
  session.twitchAuth.expiresAt = Date.now() + (data.expires_in * 1000);
  
  await session.save();
  
  return session.twitchAuth.accessToken;
};

// Middleware to ensure valid token
export const requireTwitchAuth = async (req, res, next) => {
  if (!req.session.twitchAuth) {
    return res.status(401).json({ error: 'Not authenticated with Twitch' });
  }
  
  const { expiresAt } = req.session.twitchAuth;
  
  // Refresh if expiring soon (within 5 minutes)
  if (expiresAt - Date.now() < 5 * 60 * 1000) {
    try {
      await refreshAccessToken(req.session);
    } catch (err) {
      console.error('Token refresh failed:', err);
      delete req.session.twitchAuth;
      return res.status(401).json({ error: 'Authentication expired, please login again' });
    }
  }
  
  next();
};

// User-authenticated Twitch fetch helper
export const userTwitchFetch = async (session, path, params = {}) => {
  const clientId = getRequiredEnv('TWITCH_CLIENT_ID');
  const { accessToken } = session.twitchAuth;
  
  const query = new URLSearchParams(params);
  const url = `${TWITCH_API_BASE}${path}?${query.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  
  return response.json();
};

export default router;
