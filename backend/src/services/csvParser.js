/**
 * @module services/csvParser
 * @description Parses CSV files containing LinkedIn lead data and validates
 * each row before returning usable lead objects.
 *
 * Expected CSV columns (case-insensitive headers):
 *   - `profile_url` or `profileurl` (required)
 *   - `first_name` or `firstname` (optional)
 *   - `last_name` or `lastname` (optional)
 *   - `company` (optional)
 */

import { parse } from 'csv-parse/sync';

/** Regex to loosely validate LinkedIn profile URLs */
const LINKEDIN_URL_REGEX = /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_%-]+\/?/;

/**
 * Normalises a CSV header key by lowercasing and removing underscores/hyphens/spaces.
 * @param {string} key
 * @returns {string}
 */
function normaliseKey(key) {
  return key.toLowerCase().replace(/[\s_-]/g, '');
}

/**
 * Extracts the value from a row object using any of the possible key variants.
 * @param {Record<string, string>} normalisedRow
 * @param {string[]} variants
 * @returns {string|undefined}
 */
function pick(normalisedRow, variants) {
  for (const v of variants) {
    if (normalisedRow[v] !== undefined && normalisedRow[v] !== '') {
      return normalisedRow[v].trim();
    }
  }
  return undefined;
}

/**
 * Parses a CSV buffer into a list of valid lead objects.
 * Rows missing a valid LinkedIn `profileUrl` are silently skipped and counted.
 *
 * @param {Buffer} buffer - Raw CSV file contents as a Buffer.
 * @returns {{ leads: Array<{ profileUrl: string, firstName?: string, lastName?: string, company?: string }>, skipped: number }}
 */
export function parseLeadsCSV(buffer) {
  const records = parse(buffer, {
    columns: true,        // Use the first row as headers
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const leads = [];
  let skipped = 0;

  for (const record of records) {
    // Normalise keys so we can handle various column naming conventions
    const normRow = {};
    for (const [k, v] of Object.entries(record)) {
      normRow[normaliseKey(k)] = typeof v === 'string' ? v.trim() : '';
    }

    const profileUrl = pick(normRow, ['profileurl', 'linkedinurl', 'linkedin', 'url', 'profile']);
    const firstName = pick(normRow, ['firstname', 'first', 'fname', 'givenname']);
    const lastName = pick(normRow, ['lastname', 'last', 'lname', 'surname', 'familyname']);
    const company = pick(normRow, ['company', 'organisation', 'organization', 'employer', 'companyname']);

    if (!profileUrl || !LINKEDIN_URL_REGEX.test(profileUrl)) {
      skipped++;
      continue;
    }

    leads.push({
      profileUrl,
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(company && { company }),
    });
  }

  return { leads, skipped };
}
