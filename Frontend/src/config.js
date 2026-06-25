const isLocalhost =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

// Dev: Use backend on :4000, Prod: empty (served from same origin)
export const API_URL = isLocalhost ? 'http://localhost:4000' : '';

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '129140640502-j520isuroidrliefjj9b5flipdhdfoip.apps.googleusercontent.com';
