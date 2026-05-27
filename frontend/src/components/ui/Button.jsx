import React from 'react';
import styles from './Button.module.css';

/**
 * Button — Reusable button component.
 * @prop {string} variant - 'primary' | 'secondary' | 'danger' | 'ghost'
 * @prop {string} size    - 'sm' | 'md' | 'lg'
 * @prop {boolean} loading - Shows spinner when true
 * @prop {boolean} disabled
 * @prop {function} onClick
 * @prop {React.ReactNode} children
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  children,
  type = 'button',
  className = '',
  ...rest
}) => {
  const cls = [
    styles.btn,
    styles[`btn--${variant}`],
    styles[`btn--${size}`],
    loading ? styles['btn--loading'] : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={cls}
      onClick={onClick}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      <span className={loading ? styles.labelHidden : ''}>{children}</span>
    </button>
  );
};

export default Button;
