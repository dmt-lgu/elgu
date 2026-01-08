import axios from "axios";

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
        };
        oauth2: {
          initTokenClient: (config: any) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
const GOOGLE_API_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

axios.defaults.baseURL = `https://sheets.googleapis.com/v4/spreadsheets/`;
axios.defaults.headers.get['Accept'] = 'application/json';
axios.defaults.headers.post['Content-Type'] = 'application/json';

// Add access token to all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('google_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors - token might be expired
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Try to get a new token
        await loginWithGoogle();
        const token = localStorage.getItem('google_access_token');
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axios(originalRequest);
        }
      } catch (err) {
        console.error('Failed to refresh token:', err);
      }
    }
    return Promise.reject(error);
  }
);

// Initialize Google API
export const initializeGoogleAuth = (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
      document.head.appendChild(script);
    }
  });
};

// Login with Google
export const loginWithGoogle = (): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    window.google?.accounts?.oauth2?.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_API_SCOPE,
      callback: (response: any) => {
        if (response.access_token) {
          localStorage.setItem('google_access_token', response.access_token);
          resolve(response.access_token);
        } else {
          reject(new Error('Failed to get access token'));
        }
      },
      error_callback: (error: any) => {
        reject(error);
      }
    }).requestAccessToken();
  });
};

// Logout
export const logoutGoogle = (): void => {
  localStorage.removeItem('google_access_token');
};

// Check if user is authenticated
export const isGoogleAuthenticated = (): boolean => {
  return !!localStorage.getItem('google_access_token');
};

export default axios;