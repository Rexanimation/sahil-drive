const isLocalhost =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

// Use relative paths to leverage Vite proxy in dev, and same-origin in prod
export const API_URL = '';

export const GOOGLE_CLIENT_ID = (
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '129140640502-j520isuroidrliefjj9b5flipdhdfoip.apps.googleusercontent.com'
).trim();
