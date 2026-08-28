import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { IconUser, IconMail, IconLock } from '../components/icons';
import { registerTenant, isTenantAuthed, tenantEmailExists } from '../lib/tenantAuth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isTenantAuthed()) {
    return <Navigate to="/dashboard" replace />;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (tenantEmailExists(email)) { setError('An account with this email already exists.'); return; }
    setError('');
    setLoading(true);
    setTimeout(() => {
      const result = registerTenant({ name, email, password });
      setLoading(false);
      if (result.ok) {
        navigate('/dashboard', { replace: true });
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
            <div className="auth-title">Create an account</div>
            <div className="auth-sub">Join your team on EMI Inventory</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <div className="auth-input-wrap">
              <IconUser />
              <input
                type="text" placeholder="Your full name" autoFocus
                value={name} onChange={e => setName(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Email</label>
            <div className="auth-input-wrap">
              <IconMail />
              <input
                type="email" placeholder="you@company.com"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="auth-input-wrap">
              <IconLock />
              <input
                type="password" placeholder="At least 6 characters"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <div className="auth-input-wrap">
              <IconLock />
              <input
                type="password" placeholder="••••••••"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn-primary btn auth-submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>

        <div className="auth-hint">
          New accounts are created with the Employee role. This is a demo — accounts
          created here only last for this browser session.
        </div>
      </div>
    </div>
  );
}
