/**
 * @module lib/jwt
 * @description Utilities for signing and verifying JSON Web Tokens.
 * Access tokens are short-lived (15m); refresh tokens are long-lived (7d).
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Signs a short-lived access token for the given user ID.
 *
 * @param {string} userId - The user's unique identifier (cuid).
 * @returns {string} Signed JWT access token.
 */
export function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Signs a long-lived refresh token for the given user ID.
 *
 * @param {string} userId - The user's unique identifier (cuid).
 * @returns {string} Signed JWT refresh token.
 */
export function signRefreshToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtRefreshSecret, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Verifies a JWT access token and returns its decoded payload.
 *
 * @param {string} token - The JWT access token string.
 * @returns {{ sub: string, iat: number, exp: number }} Decoded token payload.
 * @throws {jwt.JsonWebTokenError} If the token is invalid or expired.
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

/**
 * Verifies a JWT refresh token and returns its decoded payload.
 *
 * @param {string} token - The JWT refresh token string.
 * @returns {{ sub: string, iat: number, exp: number }} Decoded token payload.
 * @throws {jwt.JsonWebTokenError} If the token is invalid or expired.
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwtRefreshSecret);
}
