import { useState } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { IconMail, IconLock } from '../components/icons';
import { loginTenant, isTenantAuthed, DEMO_LOGIN_HINT_ADMIN, DEMO_LOGIN_HINT_EMPLOYEE } from '../lib/tenantAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isTenantAuthed()) {
    return <Navigate to="/dashboard" replace />;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Please enter both email and password.'); return; }
    setError('');
    setLoading(true);
    setTimeout(() => {
      const result = loginTenant(email, password);
      setLoading(false);
      if (result.ok) {
        const dest = location.state?.from?.pathname || '/dashboard';
        navigate(dest, { replace: true });
      } else {
        setError(result.error);
      }
    }, 350);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">EMI</div>
          <div>
            <div className="auth-title">EMI Inventory</div>
            <div className="auth-sub">Sign in to manage your events</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <div className="auth-input-wrap">
              <IconMail />
              <input
                type="email" placeholder="you@company.com" autoFocus
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="auth-input-wrap">
              <IconLock />
              <input
                type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn-primary btn auth-submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer-link">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <div className="auth-footer-link">
          Don&rsquo;t have an account? <Link to="/register">Create one</Link>
        </div>

        <div className="auth-hint">
          <div className="auth-role-hint">
            <span>Demo admin login: <strong>{DEMO_LOGIN_HINT_ADMIN}</strong></span>
            <span>Demo employee login: <strong>{DEMO_LOGIN_HINT_EMPLOYEE}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
