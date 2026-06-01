import axios from 'axios';

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => { requestAccessToken: (options?: { prompt?: string }) => void };
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

const sheets = axios.create({ baseURL: 'https://sheets.googleapis.com/v4/spreadsheets/' });
sheets.defaults.headers.get = sheets.defaults.headers.get || {};
sheets.defaults.headers.post = sheets.defaults.headers.post || {};
sheets.defaults.headers.get['Accept'] = 'application/json';
sheets.defaults.headers.post['Content-Type'] = 'application/json';

// Add access token to Google Sheets requests only
sheets.interceptors.request.use((config) => {
  const token = localStorage.getItem('google_access_token');
  if (!config.headers) config.headers = {} as any;
  if (token) {
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

sheets.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

// Initialize Google API
export const initializeGoogleAuth = (): Promise<void> => {
  return new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
};

// Login with Google
export const loginWithGoogle = (): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google API not loaded'));
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_API_SCOPE,
      callback: (response: any) => {
        if (response.access_token) {
          localStorage.setItem('google_access_token', response.access_token);
          resolve(response.access_token);
        } else {
          reject(new Error('Failed to get access token: ' + (response.error || 'Unknown error')));
        }
      },
      error_callback: (error: any) => {
        reject(error);
      }
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

// Check if user is authenticated
export const isGoogleAuthenticated = (): boolean => {
  return !!localStorage.getItem('google_access_token');
};

export default sheets;