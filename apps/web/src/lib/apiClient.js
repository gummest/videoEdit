import axios from 'axios';

const resolveApiUrl = (path) => {
  if (typeof path !== 'string') return path;

  // Keep full URLs untouched
  if (/^https?:\/\//i.test(path)) return path;

  // Force same-origin API calls in browser to avoid cross-origin/base-tag drift
  if (typeof window !== 'undefined' && path.startsWith('/api/')) {
    return `${window.location.origin}${path}`;
  }

  return path;
};

const apiClient = typeof axios.create === 'function'
  ? axios.create({ withCredentials: true })
  : axios;

if (apiClient.defaults) {
  apiClient.defaults.withCredentials = true;
}

if (apiClient.interceptors?.request?.use) {
  apiClient.interceptors.request.use((config) => {
    if (config?.url) {
      config.url = resolveApiUrl(config.url);
    }
    return config;
  });
}

export default apiClient;
