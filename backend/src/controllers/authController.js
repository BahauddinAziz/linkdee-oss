/**
 * @module controllers/authController
 * @description Handles user registration, login, token refresh, and logout.
 */

import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../lib/jwt.js';
import { config } from '../config/index.js';

const BCRYPT_ROUNDS = 12;
const REFRESH_COOKIE_NAME = 'linkedreach_refresh';

/** Shared cookie options for the refresh token HttpOnly cookie */
const refreshCookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/',
};

/**
 * Validates that an email is well-formed.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Registers a new user account.
 * Validates email format and password length, hashes the password,
 * creates the user record, and returns a pair of JWTs.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function signup(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.', code: 400 });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.', code: 400 });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long.',
        code: 400,
      });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({
        error: 'An account with this email already exists.',
        code: 409,
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true, createdAt: true },
    });

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);

    return res.status(201).json({
      data: {
        user,
        accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Authenticates an existing user with email and password.
 * Returns a new access token and sets a refresh token cookie on success.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.', code: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Use a generic message to avoid user enumeration
      return res.status(401).json({ error: 'Invalid email or password.', code: 401 });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password.', code: 401 });
    }

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);

    return res.status(200).json({
      data: {
        user: { id: user.id, email: user.email, createdAt: user.createdAt },
        accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Issues a new access token using the refresh token stored in the HttpOnly cookie.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!token) {
      return res.status(401).json({ error: 'No refresh token provided.', code: 401 });
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
      return res.status(401).json({ error: 'Invalid or expired refresh token.', code: 401 });
    }

    // Ensure the user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true },
    });

    if (!user) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
      return res.status(401).json({ error: 'User not found.', code: 401 });
    }

    const accessToken = signAccessToken(user.id);

    return res.status(200).json({ data: { accessToken } });
  } catch (err) {
    next(err);
  }
}

/**
 * Logs out the user by clearing the refresh token HttpOnly cookie.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function logout(req, res, next) {
  try {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
    return res.status(200).json({ data: { message: 'Logged out successfully.' } });
  } catch (err) {
    next(err);
  }
}
