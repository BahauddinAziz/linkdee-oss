import React, { useState, useRef, useCallback } from 'react';
import styles from './CSVUploader.module.css';

/**
 * CSVUploader — Drag-and-drop CSV import area.
 * @prop {function} onUpload(file) - Called with the selected File object
 * @prop {object} result - { imported, skipped } from last upload
 * @prop {boolean} isUploading
 */
const CSVUploader = ({ onUpload, result, isUploading = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        alert('Please upload a .csv file.');
        return;
      }
      setSelectedFile(file);
      onUpload(file);
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div className={styles.wrapper}>
      {/* Drop Zone */}
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''} ${isUploading ? styles.uploading : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !isUploading && inputRef.current?.click()}
        aria-label="Upload CSV file"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleInputChange}
          hidden
        />

        {isUploading ? (
          <div className={styles.uploadingState}>
            <span className="spinner spinner-lg" />
            <p className={styles.uploadingText}>Processing CSV...</p>
          </div>
        ) : (
          <div className={styles.idleState}>
            <div className={styles.uploadIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/>
              </svg>
            </div>
            <p className={styles.dropText}>
              {selectedFile ? (
                <><strong>{selectedFile.name}</strong> — click to replace</>
              ) : (
                <>Drop your <strong>CSV file</strong> here, or click to browse</>
              )}
            </p>
            <p className={styles.hint}>Columns: profileUrl, firstName, lastName, company</p>
          </div>
        )}
      </div>

      {/* Result Banner */}
      {result && !isUploading && (
        <div className={`${styles.result} ${result.error ? styles.resultError : styles.resultSuccess}`}>
          {result.error ? (
            <span>⚠ {result.error}</span>
          ) : (
            <span>
              ✓ <strong>{result.imported}</strong> lead{result.imported !== 1 ? 's' : ''} imported
              {result.skipped > 0 && (
                <>, <strong>{result.skipped}</strong> skipped (duplicates / invalid)</>
              )}
            </span>
          )}
        </div>
      )}

      {/* Format hint */}
      <div className={styles.formatHint}>
        <span className={styles.formatTitle}>Expected CSV format:</span>
        <code className={styles.formatCode}>profileUrl,firstName,lastName,company</code>
      </div>
    </div>
  );
};

export default CSVUploader;
