import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import styles from './Auth.module.css';

const FEATURES = [
  { icon: '⚡', text: 'Automated LinkedIn outreach at scale' },
  { icon: '🎯', text: 'Smart connection requests & direct messages' },
  { icon: '📊', text: 'Real-time campaign analytics & logs' },
  { icon: '🛡️', text: 'Rate-limiting & jitter to stay safe' },
  { icon: '📥', text: 'Bulk CSV lead import' },
];

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const validate = () => {
    const errs = {};
    if (!email.trim())            errs.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!password)                errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setIsLoading(true);
    setErrors({});
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setErrors({ submit: err.message || 'Invalid email or password' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Left Brand Panel */}
      <div className={styles.brandPanel}>
        <div className={styles.brandContent}>
          <div className={styles.brandLogo}>
            <div className={styles.logoIcon}>⚡</div>
            <span className={styles.logoText}>LinkedReach</span>
          </div>
          <h1 className={styles.brandHeadline}>LinkedIn outreach,<br /><span className={styles.gradient}>automated.</span></h1>
          <p className={styles.brandDesc}>
            The open-source platform for running smart, safe, and scalable LinkedIn campaigns. Connect your accounts and start reaching prospects in minutes.
          </p>
          <ul className={styles.featureList}>
            {FEATURES.map((f, i) => (
              <li key={i} className={styles.featureItem}>
                <span className={styles.featureIcon}>{f.icon}</span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.brandBg}>
          <div className={styles.glow1} />
          <div className={styles.glow2} />
        </div>
      </div>

      {/* Right Form Panel */}
      <div className={styles.formPanel}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Welcome back</h2>
            <p className={styles.formSubtitle}>Sign in to your LinkedReach account</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className={`form-input ${errors.email ? 'error' : ''}`}
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: null })); }}
                autoComplete="email"
                autoFocus
              />
              {errors.email && <span className="form-error">⚠ {errors.email}</span>}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className={styles.passWrap}>
                <input
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: null })); }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPass((s) => !s)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
              {errors.password && <span className="form-error">⚠ {errors.password}</span>}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className={styles.submitError}>⚠ {errors.submit}</div>
            )}

            <Button variant="primary" size="lg" type="submit" loading={isLoading} style={{ width: '100%' }}>
              Sign In →
            </Button>
          </form>

          <div className={styles.divider}>
            <span>New to LinkedReach?</span>
          </div>

          <Link to="/signup" className={styles.switchLink}>
            Create a free account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
