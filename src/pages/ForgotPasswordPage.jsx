import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconMail, IconArrowLeft } from '../components/icons';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email.'); return; }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 350);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">EMI</div>
          <div>
            <div className="auth-title">Reset your password</div>
            <div className="auth-sub">We&rsquo;ll send instructions to your email</div>
          </div>
        </div>

        {sent ? (
          <div className="auth-success">
            If an account exists for <strong>{email}</strong>, we&rsquo;ve sent password
            reset instructions to it. Check your inbox in a few minutes.
          </div>
        ) : (
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

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="btn-primary btn auth-submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send Reset Instructions'}
            </button>
          </form>
        )}

        <div className="auth-footer-link">
          <Link to="/login" className="auth-back-link"><IconArrowLeft /> Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
