import axios from "axios";

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

axios.defaults.baseURL = `https://sheets.googleapis.com/v4/spreadsheets/`;
axios.defaults.headers.get['Accept'] = 'application/json';
axios.defaults.headers.post['Content-Type'] = 'application/json';

// Add access token to all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('google_access_token');
  
  console.log('Axios Request:', {
    url: config.url,
    hasToken: !!token,
  });
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Axios Response Error:', {
      status: error.response?.status,
      message: error.response?.data?.error?.message,
      code: error.response?.data?.error?.code,
      url: error.response?.config?.url
    });
    return Promise.reject(error);
  }
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
    console.log('Attempting to login with Google...');
    
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google API not loaded'));
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_API_SCOPE,
      callback: (response: any) => {
        console.log('Google OAuth Callback:', {
          hasAccessToken: !!response.access_token,
          error: response.error
        });
        
        if (response.access_token) {
          localStorage.setItem('google_access_token', response.access_token);
          console.log('✓ Access token saved successfully:', response.access_token.substring(0, 20) + '...');
          resolve(response.access_token);
        } else {
          console.error('No access token in response:', response);
          reject(new Error('Failed to get access token: ' + (response.error || 'Unknown error')));
        }
      },
      error_callback: (error: any) => {
        console.error('✗ Google OAuth Error:', error);
        reject(error);
      }
    });

    // Request access token with immediate prompt
    // Using 'consent' to always show the popup, even if already logged in
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

// Check if user is authenticated
export const isGoogleAuthenticated = (): boolean => {
  return !!localStorage.getItem('google_access_token');
};

export default axios;