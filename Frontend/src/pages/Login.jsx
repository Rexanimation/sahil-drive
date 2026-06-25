import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import SocialAuthButtons from '../components/SocialAuthButtons';
import '../styles/Dashboard.css';

const AuthBrand = () => (
  <header className="auth-brand">
    <div className="auth-logo-wrapper">
      <svg className="auth-logo-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 13l2 2 4-4" />
      </svg>
    </div>
    <h1 className="auth-brand-name">Sahil Drive</h1>
    <p className="auth-brand-subtitle">Premium Cloud Storage</p>
  </header>
);

const AuthLegalFooter = () => (
  <footer className="auth-legal-footer">
    <a href="#privacy" className="auth-legal-link" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
    <span className="auth-legal-separator">·</span>
    <a href="#terms" className="auth-legal-link" onClick={(e) => e.preventDefault()}>Terms of Service</a>
  </footer>
);

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    axios.post(`${API_URL}/api/auth/login`, {
      email: form.email,
      password: form.password,
    }, {
      withCredentials: true,
    }).then(() => {
      navigate('/');
    }).catch((err) => {
      setErrorMsg(err.response?.data?.message || 'Login failed. Please check your credentials.');
    }).finally(() => {
      setSubmitting(false);
    });
  }

  return (
    <div className="auth-container">
      <AuthBrand />

      <div className="auth-glass-card glass-panel" role="main">
        <h2 className="auth-card-title">Welcome Back</h2>
        <p className="auth-card-desc">Access your secure digital vault.</p>

        {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-input-group">
            <label className="auth-input-label" htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              name="email"
              type="email"
              className="auth-input auth-input-plain"
              placeholder="name@company.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="auth-input-group auth-password-group">
            <div className="auth-password-header">
              <label className="auth-input-label" htmlFor="login-password">Password</label>
              <a
                href="#forgot"
                className="auth-forgot-link"
                onClick={(e) => { e.preventDefault(); alert('Reset instructions sent to your email!'); }}
              >
                Forgot Password?
              </a>
            </div>
            <div className="auth-input-wrapper">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input auth-input-plain"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="auth-input-icon-right"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={submitting}>
            {submitting ? 'Signing In...' : 'Sign In to Sahil Drive'}
          </button>
        </form>

        <div className="auth-divider">Or Continue With</div>

        <SocialAuthButtons
          onSuccess={() => navigate('/')}
          onError={setErrorMsg}
          setSubmitting={setSubmitting}
          disabled={submitting}
        />

        <p className="auth-switch">
          Don&apos;t have an account?
          <Link to="/register" className="auth-switch-link">Create an account</Link>
        </p>
      </div>

      <AuthLegalFooter />
    </div>
  );
};

export default Login;
