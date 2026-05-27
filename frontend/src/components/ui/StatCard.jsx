import React from 'react';
import styles from './StatCard.module.css';

/**
 * StatCard — Display a metric with an icon, label, and value.
 * @prop {string} icon  - Emoji or SVG element
 * @prop {string} label - Metric label
 * @prop {string|number} value - Metric value
 * @prop {string} color - Accent CSS color (e.g. '#6366f1')
 * @prop {string} trend - Optional trend string like '+12%'
 * @prop {boolean} trendUp - If true, trend is positive (green)
 */
const StatCard = ({ icon, label, value, color = '#6366f1', trend, trendUp }) => {
  return (
    <div className={`glass-card ${styles.card}`}>
      <div className={styles.iconWrap} style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
        <span className={styles.icon} style={{ color }}>{icon}</span>
      </div>
      <div className={styles.content}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value ?? '—'}</span>
        {trend && (
          <span className={`${styles.trend} ${trendUp ? styles.trendUp : styles.trendDown}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div className={styles.glowBar} style={{ background: color }} />
    </div>
  );
};

export default StatCard;
