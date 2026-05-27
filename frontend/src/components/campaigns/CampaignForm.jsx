import React, { useState, useEffect, useCallback } from 'react';
import Button from '../ui/Button';
import styles from './CampaignForm.module.css';

const MODE_OPTIONS = [
  { value: 'CONNECTION_REQUEST', label: '🤝 Connection Request', maxChars: 300 },
  { value: 'DIRECT_MESSAGE',     label: '💬 Direct Message',     maxChars: 8000 },
];

const VARIABLE_CHIPS = [
  { label: '{first_name}',  value: '{first_name}' },
  { label: '{last_name}',   value: '{last_name}' },
  { label: '{company}',     value: '{company}' },
  { label: '{job_title}',   value: '{job_title}' },
];

const INITIAL_STATE = {
  name: '',
  accountId: '',
  mode: 'CONNECTION_REQUEST',
  messageTemplate: '',
  delaySeconds: 60,
  jitter: true,
  dailyCap: 20,
  scheduledAt: '',
};

/**
 * CampaignForm — Rich form for creating/editing a campaign.
 * @prop {object}   initialData - Pre-fill form for editing
 * @prop {Array}    accounts    - List of LinkedIn accounts
 * @prop {function} onSubmit(formData) - Submit handler (async)
 * @prop {function} onCancel
 */
const CampaignForm = ({ initialData, accounts = [], onSubmit, onCancel }) => {
  const [form, setForm] = useState({ ...INITIAL_STATE, ...initialData });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [textareaRef, setTextareaRef] = useState(null);

  const currentMode = MODE_OPTIONS.find((m) => m.value === form.mode);
  const maxChars = currentMode?.maxChars || 300;
  const charCount = form.messageTemplate.length;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const insertVariable = useCallback(
    (chip) => {
      if (!textareaRef) return;
      const start = textareaRef.selectionStart;
      const end = textareaRef.selectionEnd;
      const newValue =
        form.messageTemplate.substring(0, start) +
        chip +
        form.messageTemplate.substring(end);
      handleChange('messageTemplate', newValue);
      // Restore cursor after variable
      setTimeout(() => {
        textareaRef.focus();
        textareaRef.setSelectionRange(start + chip.length, start + chip.length);
      }, 0);
    },
    [textareaRef, form.messageTemplate]
  );

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Campaign name is required';
    if (!form.accountId)   errs.accountId = 'Select a LinkedIn account';
    if (!form.messageTemplate.trim()) errs.messageTemplate = 'Message template is required';
    if (form.messageTemplate.length > maxChars)
      errs.messageTemplate = `Message exceeds ${maxChars} character limit`;
    if (form.dailyCap < 5 || form.dailyCap > 100)
      errs.dailyCap = 'Daily cap must be between 5 and 100';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...form,
        dailyCap: Number(form.dailyCap),
        delaySeconds: Number(form.delaySeconds),
        scheduledAt: form.scheduledAt || null,
      });
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {/* Campaign Name */}
      <div className="form-group">
        <label className="form-label">Campaign Name *</label>
        <input
          className={`form-input ${errors.name ? 'error' : ''}`}
          type="text"
          placeholder="e.g. SaaS Founders Q2 Outreach"
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />
        {errors.name && <span className="form-error">⚠ {errors.name}</span>}
      </div>

      {/* LinkedIn Account */}
      <div className="form-group">
        <label className="form-label">LinkedIn Account *</label>
        <select
          className={`form-input form-select ${errors.accountId ? 'error' : ''}`}
          value={form.accountId}
          onChange={(e) => handleChange('accountId', e.target.value)}
        >
          <option value="">Select an account...</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.label || acc.email || acc.id}
            </option>
          ))}
        </select>
        {errors.accountId && <span className="form-error">⚠ {errors.accountId}</span>}
        {accounts.length === 0 && (
          <span className={styles.hint}>No accounts connected. Go to LinkedIn Accounts to add one.</span>
        )}
      </div>

      {/* Mode Selector */}
      <div className="form-group">
        <label className="form-label">Campaign Mode</label>
        <div className={styles.modeToggle}>
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.modeOption} ${form.mode === opt.value ? styles.modeOptionActive : ''}`}
              onClick={() => handleChange('mode', opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message Template */}
      <div className="form-group">
        <label className="form-label">
          Message Template *
          <span className={styles.charCounter} style={{ color: charCount > maxChars ? 'var(--color-error)' : 'var(--text-muted)' }}>
            {charCount} / {maxChars}
          </span>
        </label>

        <div className={styles.chipRow}>
          {VARIABLE_CHIPS.map((chip) => (
            <span
              key={chip.value}
              className="tag"
              onClick={() => insertVariable(chip.value)}
              title={`Insert ${chip.value}`}
            >
              {chip.label}
            </span>
          ))}
        </div>

        <textarea
          ref={(el) => setTextareaRef(el)}
          className={`form-input ${styles.textarea} ${errors.messageTemplate ? 'error' : ''}`}
          placeholder={
            form.mode === 'CONNECTION_REQUEST'
              ? "Hi {first_name}, I came across your profile and would love to connect..."
              : "Hi {first_name}, thanks for connecting! I wanted to reach out because..."
          }
          value={form.messageTemplate}
          onChange={(e) => handleChange('messageTemplate', e.target.value)}
          rows={6}
          maxLength={maxChars + 100}
        />
        {errors.messageTemplate && <span className="form-error">⚠ {errors.messageTemplate}</span>}
      </div>

      {/* Delay Slider */}
      <div className="form-group">
        <label className="form-label">
          Delay Between Actions: <strong style={{ color: 'var(--text-primary)' }}>{form.delaySeconds}s</strong>
        </label>
        <input
          type="range"
          className={styles.slider}
          min={30}
          max={300}
          step={10}
          value={form.delaySeconds}
          onChange={(e) => handleChange('delaySeconds', Number(e.target.value))}
        />
        <div className={styles.sliderLabels}>
          <span>30s (Faster)</span>
          <span>300s (Safer)</span>
        </div>
      </div>

      {/* Two-column row */}
      <div className={styles.twoCol}>
        {/* Daily Cap */}
        <div className="form-group">
          <label className="form-label">Daily Cap (5–100) *</label>
          <input
            className={`form-input ${errors.dailyCap ? 'error' : ''}`}
            type="number"
            min={5}
            max={100}
            value={form.dailyCap}
            onChange={(e) => handleChange('dailyCap', e.target.value)}
          />
          {errors.dailyCap && <span className="form-error">⚠ {errors.dailyCap}</span>}
        </div>

        {/* Scheduled Start */}
        <div className="form-group">
          <label className="form-label">Scheduled Start (optional)</label>
          <input
            className="form-input"
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => handleChange('scheduledAt', e.target.value)}
          />
        </div>
      </div>

      {/* Jitter Toggle */}
      <div className={styles.jitterRow}>
        <label className={styles.toggleLabel}>
          <span className={styles.toggleInfo}>
            <span className={styles.toggleTitle}>Randomize Jitter</span>
            <span className={styles.toggleDesc}>Adds random delay variance to avoid detection patterns</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={form.jitter}
            className={`${styles.toggle} ${form.jitter ? styles.toggleOn : ''}`}
            onClick={() => handleChange('jitter', !form.jitter)}
          >
            <span className={styles.toggleThumb} />
          </button>
        </label>
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className={styles.submitError}>
          <span>⚠</span> {errors.submit}
        </div>
      )}

      {/* Actions */}
      <div className={styles.formActions}>
        {onCancel && (
          <Button variant="ghost" type="button" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button variant="primary" type="submit" loading={isSubmitting}>
          {initialData?.id ? 'Save Changes' : 'Create Campaign'}
        </Button>
      </div>
    </form>
  );
};

export default CampaignForm;
