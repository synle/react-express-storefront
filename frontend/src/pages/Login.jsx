import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { paymentsApi } from '../api';

export default function Login() {
  const { user, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const googleBtnRef = useRef(null);
  const [error, setError] = useState(null);

  const from = location.state?.from || '/';

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, navigate, from]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Fetch config to get Google Client ID
        const config = await paymentsApi.getConfig();
        if (cancelled) return;

        // Wait for the Google Identity Services SDK to load
        const waitForGoogle = () => {
          return new Promise((resolve) => {
            const check = () => {
              if (window.google?.accounts?.id) return resolve();
              setTimeout(check, 100);
            };
            check();
          });
        };

        await waitForGoogle();
        if (cancelled) return;

        // Read Google Client ID from backend config endpoint
        // We add a dedicated field for it
        const googleClientId = config.googleClientId;
        if (!googleClientId) {
          setError('Google Sign-In is not configured. Set GOOGLE_CLIENT_ID in your .env file.');
          return;
        }

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            try {
              await loginWithGoogle(response.credential);
              navigate(from, { replace: true });
            } catch (err) {
              console.error('Google login failed:', err);
              setError('Login failed. Please try again.');
            }
          }
        });

        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: 300,
            text: 'signin_with'
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load login. Please refresh the page.');
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [loginWithGoogle, navigate, from]);

  return (
    <div className="container">
      <div className="login-page">
        <div className="login-card">
          <h1>Sign In</h1>
          <p>Sign in to save your cart, track orders, and checkout faster.</p>

          <div className="login-divider">
            <span>Continue with</span>
          </div>

          {error && <div className="payment-error">{error}</div>}

          <div className="google-btn-wrapper" ref={googleBtnRef}>
            {/* Google Sign-In button renders here */}
          </div>

          <p className="login-note">
            We only use your Google account for authentication.
            We never post anything or access your data.
          </p>
        </div>
      </div>
    </div>
  );
}
