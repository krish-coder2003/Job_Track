/**
 * Utility helpers for query sanitization, regex escaping, and discovery constants
 */

export const MAX_PAGE_SIZE = 50;
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Escapes special regex characters in user search inputs to prevent regex injection or SyntaxErrors.
 *
 * @param {string} string - Raw user input string
 * @returns {string} - Escaped string safe to use with RegExp
 */
export const escapeRegex = (string = '') => {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export default {
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  escapeRegex,
};
