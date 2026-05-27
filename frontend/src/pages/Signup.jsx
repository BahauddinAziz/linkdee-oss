import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import styles from './Auth.module.css';

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const validate = () => {
    const errs = {};
    if (!email.trim())                   errs.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email   = 'Enter a valid email';
    if (!password)                       errs.password = 'Password is required';
    else if (password.length < 8)        errs.password = 'Password must be at least 8 characters';
    if (password !== confirm)            errs.confirm  = 'Passwords do not match';
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
      await signup(email, password);
      navigate('/');
    } catch (err) {
      setErrors({ submit: err.message || 'Registration failed. Please try again.' });
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
          <h1 className={styles.brandHeadline}>
            Start reaching<br /><span className={styles.gradient}>prospects today.</span>
          </h1>
          <p className={styles.brandDesc}>
            Join LinkedReach to automate your LinkedIn outreach with full control, safety-first rate limiting, and beautiful real-time analytics.
          </p>
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <span className={styles.statNum}>100%</span>
              <span className={styles.statLabel}>Open Source</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statNum}>∞</span>
              <span className={styles.statLabel}>Campaigns</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statNum}>0</span>
              <span className={styles.statLabel}>Cost</span>
            </div>
          </div>
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
            <h2 className={styles.formTitle}>Create your account</h2>
            <p className={styles.formSubtitle}>Free forever · No credit card required</p>
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
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: null })); }}
                  autoComplete="new-password"
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

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                className={`form-input ${errors.confirm ? 'error' : ''}`}
                type={showPass ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: null })); }}
                autoComplete="new-password"
              />
              {errors.confirm && <span className="form-error">⚠ {errors.confirm}</span>}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className={styles.submitError}>⚠ {errors.submit}</div>
            )}

            <Button variant="primary" size="lg" type="submit" loading={isLoading} style={{ width: '100%' }}>
              Create Account →
            </Button>

            <p className={styles.legal}>
              By signing up you agree to our{' '}
              <a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a>
              {' '}and{' '}
              <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.
            </p>
          </form>

          <div className={styles.divider}>
            <span>Already have an account?</span>
          </div>

          <Link to="/login" className={styles.switchLink}>
            Sign in instead
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
