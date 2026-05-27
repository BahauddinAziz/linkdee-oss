import React, { useState, useCallback, useRef } from 'react';
import Button from '../ui/Button';
import styles from './CampaignForm.module.css';

const TYPE_OPTIONS = [
  { value: 'CONNECTION_REQUEST', label: '🤝 Connection Request' },
  { value: 'DIRECT_MESSAGE',     label: '💬 Direct Message' },
];

const VARIABLE_CHIPS = [
  { label: '{first_name}',  value: '{first_name}' },
  { label: '{last_name}',   value: '{last_name}' },
  { label: '{company}',     value: '{company}' },
  { label: '{job_title}',   value: '{job_title}' },
];

const INITIAL_STATE = {
  name: '',
  linkedAccountId: '',
  steps: [{ type: 'CONNECTION_REQUEST', template: '', delayDays: 0 }],
  delaySeconds: 60,
  jitterEnabled: true,
  dailyCap: 20,
  scheduledStartAt: '',
};

const CampaignForm = ({ initialData, accounts = [], onSubmit, onCancel }) => {
  // Handle mapping from old data format if necessary
  const data = { ...INITIAL_STATE, ...initialData };
  if (initialData?.accountId && !initialData?.linkedAccountId) data.linkedAccountId = initialData.accountId;
  if (initialData?.jitter !== undefined && initialData?.jitterEnabled === undefined) data.jitterEnabled = initialData.jitter;
  if (initialData?.scheduledAt && !initialData?.scheduledStartAt) data.scheduledStartAt = initialData.scheduledAt;
  if (initialData?.mode && !initialData?.steps) {
    data.steps = [{ type: initialData.mode, template: initialData.messageTemplate || '', delayDays: 0 }];
  }

  const [form, setForm] = useState(data);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRefs = useRef([]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleStepChange = (index, field, value) => {
    const newSteps = [...form.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    handleChange('steps', newSteps);
  };

  const addStep = () => {
    handleChange('steps', [...form.steps, { type: 'DIRECT_MESSAGE', template: '', delayDays: 3 }]);
  };

  const removeStep = (index) => {
    const newSteps = form.steps.filter((_, i) => i !== index);
    handleChange('steps', newSteps);
  };

  const insertVariable = useCallback(
    (index, chip) => {
      const textarea = textareaRefs.current[index];
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentTemplate = form.steps[index].template;
      const newValue = currentTemplate.substring(0, start) + chip + currentTemplate.substring(end);
      handleStepChange(index, 'template', newValue);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + chip.length, start + chip.length);
      }, 0);
    },
    [form.steps]
  );

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Campaign name is required';
    if (!form.linkedAccountId) errs.linkedAccountId = 'Select a LinkedIn account';
    if (form.dailyCap < 5 || form.dailyCap > 100) errs.dailyCap = 'Daily cap must be between 5 and 100';
    
    form.steps.forEach((step, i) => {
      if (!step.template.trim()) {
        errs[`step_${i}`] = 'Message template is required';
      }
      const maxChars = step.type === 'DIRECT_MESSAGE' ? 8000 : 300;
      if (step.template.length > maxChars) {
        errs[`step_${i}`] = `Message exceeds ${maxChars} characters`;
      }
    });
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
        name: form.name,
        linkedAccountId: form.linkedAccountId,
        dailyCap: Number(form.dailyCap),
        delaySeconds: Number(form.delaySeconds),
        jitterEnabled: form.jitterEnabled,
        scheduledStartAt: form.scheduledStartAt || null,
        steps: form.steps.map(s => ({ ...s, delayDays: Number(s.delayDays) }))
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
          className={`form-input form-select ${errors.linkedAccountId ? 'error' : ''}`}
          value={form.linkedAccountId}
          onChange={(e) => handleChange('linkedAccountId', e.target.value)}
        >
          <option value="">Select an account...</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.label || acc.email || acc.id}
            </option>
          ))}
        </select>
        {errors.linkedAccountId && <span className="form-error">⚠ {errors.linkedAccountId}</span>}
        {accounts.length === 0 && (
          <span className={styles.hint}>No accounts connected. Go to LinkedIn Accounts to add one.</span>
        )}
      </div>

      {/* Sequence Builder */}
      <div className={styles.sequenceBuilder}>
        <h4 className={styles.sequenceTitle}>Workflow Sequence</h4>
        <div className={styles.stepsList}>
          {form.steps.map((step, index) => {
            const maxChars = step.type === 'DIRECT_MESSAGE' ? 8000 : 300;
            const charCount = step.template.length;
            const stepError = errors[`step_${index}`];

            return (
              <div key={index} className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepIndicator}>Step {index + 1}</div>
                  {index > 0 && (
                    <button type="button" className={styles.removeStepBtn} onClick={() => removeStep(index)}>
                      🗑️ Remove
                    </button>
                  )}
                </div>

                <div className={styles.stepBody}>
                  {index > 0 && (
                    <div className="form-group">
                      <label className="form-label">Wait Delay</label>
                      <div className={styles.delayInputWrap}>
                        <span>Wait</span>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: '80px', margin: '0 8px' }}
                          min="1"
                          value={step.delayDays}
                          onChange={(e) => handleStepChange(index, 'delayDays', e.target.value)}
                        />
                        <span>days then...</span>
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Action Type</label>
                    <select
                      className="form-input form-select"
                      value={step.type}
                      onChange={(e) => handleStepChange(index, 'type', e.target.value)}
                    >
                      {TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

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
                          onClick={() => insertVariable(index, chip.value)}
                          title={`Insert ${chip.value}`}
                        >
                          {chip.label}
                        </span>
                      ))}
                    </div>

                    <textarea
                      ref={(el) => (textareaRefs.current[index] = el)}
                      className={`form-input ${styles.textarea} ${stepError ? 'error' : ''}`}
                      placeholder={step.type === 'CONNECTION_REQUEST' ? "Hi {first_name}, I'd love to connect!" : "Thanks for connecting!"}
                      value={step.template}
                      onChange={(e) => handleStepChange(index, 'template', e.target.value)}
                      rows={5}
                      maxLength={maxChars + 100}
                    />
                    {stepError && <span className="form-error">⚠ {stepError}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Button variant="secondary" type="button" onClick={addStep} className={styles.addStepBtn}>
          ➕ Add Step
        </Button>
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

        <div className="form-group">
          <label className="form-label">Scheduled Start (optional)</label>
          <input
            className="form-input"
            type="datetime-local"
            value={form.scheduledStartAt}
            onChange={(e) => handleChange('scheduledStartAt', e.target.value)}
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
            aria-checked={form.jitterEnabled}
            className={`${styles.toggle} ${form.jitterEnabled ? styles.toggleOn : ''}`}
            onClick={() => handleChange('jitterEnabled', !form.jitterEnabled)}
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
