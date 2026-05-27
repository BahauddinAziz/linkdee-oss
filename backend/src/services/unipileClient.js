/**
 * @module services/unipileClient
 * @description HTTP client for the Unipile API. Provides typed methods for
 * every operation LinkedReach needs: hosted auth, connection requests,
 * direct messages, and profile lookups.
 *
 * Base URL is derived from the account's DSN so this works across
 * self-hosted and cloud Unipile deployments.
 *
 * @see https://unipile.com/docs
 */

/**
 * Builds the base URL for the Unipile API from a DSN string.
 * The DSN is typically in the format `api1.unipile.com:443`.
 *
 * @param {string} dsn - Unipile Data Source Name.
 * @returns {string} Full HTTPS base URL, e.g. `https://api1.unipile.com:443`.
 */
function buildBaseUrl(dsn) {
  if (dsn.startsWith('http://') || dsn.startsWith('https://')) return dsn.replace(/\/$/, '');
  return `https://${dsn}`;
}

/**
 * Performs a fetch request against the Unipile API with shared headers and
 * error handling. Throws a descriptive error for non-2xx responses.
 *
 * @param {string} dsn - Unipile DSN.
 * @param {string} accessToken - Unipile access token (decrypted).
 * @param {string} path - API path, e.g. `/api/v1/connections`.
 * @param {RequestInit} [options={}] - Additional fetch options.
 * @returns {Promise<any>} Parsed JSON response body.
 * @throws {Error} On non-2xx HTTP status or network failure.
 */
async function request(dsn, accessToken, path, options = {}) {
  const url = `${buildBaseUrl(dsn)}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': accessToken,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let body = '';
    try {
      body = await response.text();
    } catch {
      // ignore parse errors
    }
    throw new Error(
      `[UnipileClient] ${options.method || 'GET'} ${path} failed with status ${response.status}: ${body}`
    );
  }

  // Some endpoints return 204 No Content
  const contentType = response.headers.get('content-type') || '';
  if (response.status === 204 || !contentType.includes('application/json')) {
    return null;
  }

  return response.json();
}

/**
 * Generates a Unipile hosted authentication URL for a LinkedIn account.
 * The user must open this URL to grant LinkedReach access to their LinkedIn.
 *
 * @param {string} dsn - Unipile DSN.
 * @param {string} accessToken - Unipile API access token.
 * @param {Object} options - Options for the hosted auth link.
 * @param {string} [options.successRedirectUrl] - URL to redirect after successful auth.
 * @param {string} [options.failureRedirectUrl] - URL to redirect after failed auth.
 * @param {string} [options.name] - Display name for the account in Unipile.
 * @returns {Promise<{ url: string, object: string }>} Object containing the hosted auth URL.
 */
export async function generateHostedAuthLink(dsn, accessToken, options = {}) {
  const body = {
    type: 'create',
    providers: ['LINKEDIN'],
    ...(options.successRedirectUrl && { success_redirect_url: options.successRedirectUrl }),
    ...(options.failureRedirectUrl && { failure_redirect_url: options.failureRedirectUrl }),
    ...(options.name && { name: options.name }),
  };

  return request(dsn, accessToken, '/api/v1/hosted/accounts/link', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Sends a LinkedIn connection request with an optional message.
 *
 * @param {string} dsn - Unipile DSN.
 * @param {string} accessToken - Unipile API access token.
 * @param {string} accountId - The Unipile account ID to send from.
 * @param {string} profileProviderId - LinkedIn provider-specific profile ID.
 * @param {string} [message=''] - Optional note to attach to the connection request.
 * @returns {Promise<any>} Unipile API response.
 */
export async function sendConnectionRequest(
  dsn,
  accessToken,
  accountId,
  profileProviderId,
  message = ''
) {
  const body = {
    account_id: accountId,
    provider_id: profileProviderId,
    ...(message && { message }),
  };

  return request(dsn, accessToken, '/api/v1/connections', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Sends a direct message to a LinkedIn chat thread.
 *
 * @param {string} dsn - Unipile DSN.
 * @param {string} accessToken - Unipile API access token.
 * @param {string} accountId - The Unipile account ID to send from.
 * @param {string} chatId - The Unipile chat/thread ID.
 * @param {string} text - The message text to send.
 * @returns {Promise<any>} Unipile API response.
 */
export async function sendDirectMessage(dsn, accessToken, accountId, chatId, text) {
  const body = {
    account_id: accountId,
    chat_id: chatId,
    text,
  };

  return request(dsn, accessToken, '/api/v1/messages', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Retrieves a LinkedIn profile by profile URL or provider ID to enrich lead data.
 *
 * @param {string} dsn - Unipile DSN.
 * @param {string} accessToken - Unipile API access token.
 * @param {string} accountId - The Unipile account ID to use for the lookup.
 * @param {string} profileIdentifier - LinkedIn profile URL or provider ID.
 * @returns {Promise<any>} Unipile user/profile object.
 */
export async function getProfile(dsn, accessToken, accountId, profileIdentifier) {
  const params = new URLSearchParams({
    account_id: accountId,
    linkedin_url: profileIdentifier,
  });

  return request(dsn, accessToken, `/api/v1/users/me/linkedin-profile?${params.toString()}`, {
    method: 'GET',
  });
}

/**
 * Gets or creates a Unipile chat with a LinkedIn member so we can send them a DM.
 * If a chat already exists, Unipile returns the existing one.
 *
 * @param {string} dsn - Unipile DSN.
 * @param {string} accessToken - Unipile API access token.
 * @param {string} accountId - The Unipile account ID to initiate the chat from.
 * @param {string} profileProviderId - LinkedIn provider-specific profile ID of the recipient.
 * @returns {Promise<{ id: string }>} Chat object containing at minimum the chat `id`.
 */
export async function getOrCreateChat(dsn, accessToken, accountId, profileProviderId) {
  const body = {
    account_id: accountId,
    provider_id: profileProviderId,
  };

  return request(dsn, accessToken, '/api/v1/chats', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
