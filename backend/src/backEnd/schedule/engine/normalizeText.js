/**
 * Normalize a text string: strip diacritics, non-alphanumerics, lowercase,
 * and remove whitespace.
 * Port of `src/utils/textFilter.ts#normalizeText` for backend use.
 * @param {string | null | undefined} text
 * @returns {string}
 */
export function normalizeText (text) {
  if (!text) return ''
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .toLowerCase()
    .replace(/\s/g, '')
}
