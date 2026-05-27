/**
 * @module controllers/accountController
 * @description Manages LinkedInAccount records — list, create (with Unipile
 * hosted auth URL generation), and delete. Access tokens are stored encrypted.
 */

import prisma from '../lib/prisma.js';
import { encrypt } from '../lib/crypto.js';
import { generateHostedAuthLink } from '../services/unipileClient.js';
import { config } from '../config/index.js';

/**
 * Lists all LinkedIn accounts belonging to the authenticated user.
 * The accessToken is deliberately omitted from the response for security.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function listAccounts(req, res, next) {
  try {
    const accounts = await prisma.linkedInAccount.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        label: true,
        status: true,
        accountId: true,
        unipileDsn: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { campaigns: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ data: accounts });
  } catch (err) {
    next(err);
  }
}

/**
 * Creates a new LinkedInAccount record, encrypts the access token, and
 * calls Unipile to generate a hosted authentication URL for the user to
 * authorise LinkedIn access.
 *
 * Expected request body:
 * - `dsn` {string} - Unipile DSN for the account's API server
 * - `accessToken` {string} - Unipile API access token (stored encrypted)
 * - `label` {string} [optional] - Human-readable label for this account
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function createAccount(req, res, next) {
  try {
    const { dsn, accessToken, label } = req.body;

    if (!dsn || !accessToken) {
      return res.status(400).json({
        error: 'Both `dsn` and `accessToken` are required.',
        code: 400,
      });
    }

    const encryptedToken = encrypt(accessToken);

    const account = await prisma.linkedInAccount.create({
      data: {
        userId: req.user.id,
        unipileDsn: dsn,
        accessToken: encryptedToken,
        label: label || null,
        status: 'PENDING',
      },
      select: {
        id: true,
        label: true,
        status: true,
        unipileDsn: true,
        createdAt: true,
      },
    });

    // Generate the Unipile hosted auth URL
    let authUrl = null;
    try {
      const successRedirectUrl = `${config.frontendUrl}/accounts?connected=1`;
      const failureRedirectUrl = `${config.frontendUrl}/accounts?connected=0`;

      const hosted = await generateHostedAuthLink(dsn, accessToken, {
        successRedirectUrl,
        failureRedirectUrl,
        name: label || `LinkedReach Account ${account.id.slice(-6)}`,
      });

      authUrl = hosted?.url || null;
    } catch (unipileErr) {
      // Non-fatal: account is created, but the auth URL failed. Client can retry.
      console.error('[AccountController] Failed to generate Unipile hosted auth link:', unipileErr.message);
    }

    return res.status(201).json({
      data: { account, authUrl },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Deletes a LinkedIn account by ID. Verifies ownership before deletion.
 * Cascades delete to associated campaigns via Prisma schema.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function deleteAccount(req, res, next) {
  try {
    const { id } = req.params;

    const account = await prisma.linkedInAccount.findUnique({ where: { id } });

    if (!account) {
      return res.status(404).json({ error: 'Account not found.', code: 404 });
    }

    if (account.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.', code: 403 });
    }

    await prisma.linkedInAccount.delete({ where: { id } });

    return res.status(200).json({ data: { message: 'Account deleted successfully.' } });
  } catch (err) {
    next(err);
  }
}
