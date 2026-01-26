export function getRandomNumber (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
export function normalizeString (str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim()
}
