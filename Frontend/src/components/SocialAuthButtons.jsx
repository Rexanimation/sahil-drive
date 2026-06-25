import { useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_URL, GOOGLE_CLIENT_ID } from '../config';

const GoogleIcon = () => (
  <svg className="sso-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export default function SocialAuthButtons({ onSuccess, onError, setSubmitting, disabled }) {
  console.log("Google Client ID (env):", import.meta.env.VITE_GOOGLE_CLIENT_ID);
  console.log("Google Client ID (config):", GOOGLE_CLIENT_ID);

  const googleInitializedRef = useRef(false);
  const handleGoogleCredentialRef = useRef(null);
  const intervalRef = useRef(null);

  const handleGoogleCredential = useCallback(async (response) => {
    if (setSubmitting) setSubmitting(true);
    try {
      if (!response?.credential) {
        throw new Error('No credential received from Google');
      }
      const result = await axios.post(`${API_URL}/api/auth/google-login`, {
        credential: response.credential,
      }, { withCredentials: true });
      if (onSuccess) onSuccess(result.data);
    } catch (err) {
      console.error('Google login error:', err);
      if (onError) {
        onError(
          err.response?.data?.message ||
          err.message ||
          'Google login failed. Please try again.'
        );
      }
    } finally {
      if (setSubmitting) setSubmitting(false);
    }
  }, [onSuccess, onError, setSubmitting]);

  // Keep the ref updated with the latest handleGoogleCredential
  useEffect(() => {
    handleGoogleCredentialRef.current = handleGoogleCredential;
  }, [handleGoogleCredential]);

  const handleGoogleClick = useCallback(() => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      handleGoogleCredential({ credential: 'mock_google_sso_token_12345' });
    }
  }, [handleGoogleCredential]);

  useEffect(() => {
    // Function to load Google Client Library if not present
    const loadGoogleLibrary = () => {
      if (document.getElementById('google-one-tap-script')) return;
      const script = document.createElement('script');
      script.id = 'google-one-tap-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    };

    const initGoogle = () => {
      if (!window.google?.accounts?.id || googleInitializedRef.current) return;
      
      googleInitializedRef.current = true;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (handleGoogleCredentialRef.current) {
            handleGoogleCredentialRef.current(response);
          }
        },
      });
      
      const btnContainer = document.getElementById("googleSignInDiv");
      if (btnContainer) {
        window.google.accounts.id.renderButton(btnContainer, { 
          theme: "filled_black", 
          size: "large", 
          type: "standard", 
          shape: "rectangular", 
          text: "signin_with",
          width: 360
        });
      }
    };

    // Load the library if needed
    loadGoogleLibrary();

    // Try to initialize immediately, or poll until library is ready
    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      intervalRef.current = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(intervalRef.current);
          initGoogle();
        }
      }, 300);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Empty dependency array

  return (
    <div className="sso-buttons" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '10px' }}>
      <div id="googleSignInDiv"></div>
    </div>
  );
}
