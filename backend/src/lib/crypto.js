/**
 * @module lib/crypto
 * @description AES-256-CBC encryption/decryption utilities for sensitive data
 * stored in the database (e.g., LinkedIn access tokens).
 *
 * The IV is randomly generated per encryption and is prepended (as hex) to the
 * ciphertext, separated by a colon: `<iv_hex>:<ciphertext_hex>`.
 */

import crypto from 'crypto';
import { config } from '../config/index.js';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES block size in bytes

/** Derive the 32-byte Buffer key from the hex ENCRYPTION_KEY env var */
const KEY = Buffer.from(config.encryptionKey, 'hex');

/**
 * Encrypts a plaintext string using AES-256-CBC.
 * A random 16-byte IV is generated for each call and stored as a prefix.
 *
 * @param {string} text - The plaintext string to encrypt.
 * @returns {string} Encrypted value in the format `<iv_hex>:<ciphertext_hex>`.
 * @throws {Error} If encryption fails.
 */
export function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an AES-256-CBC encrypted string produced by `encrypt()`.
 *
 * @param {string} encryptedText - The encrypted string in `<iv_hex>:<ciphertext_hex>` format.
 * @returns {string} The original plaintext string.
 * @throws {Error} If the format is invalid or decryption fails.
 */
export function decrypt(encryptedText) {
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    throw new Error('[Crypto] Invalid encrypted text format. Expected "<iv_hex>:<ciphertext_hex>".');
  }
  const [ivHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
