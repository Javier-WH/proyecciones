
export function normalizeText(text: string | null): string {
    if (!text) return ""; // Si el texto es nulo, devuelve una cadena vacía
    return text
      .normalize("NFD") // Normaliza los caracteres acentuados a su forma descompuesta
      .replace(/[\u0300-\u036f]/g, "") // Elimina las marcas diacríticas
      .replace(/[^a-zA-Z0-9\s]/g, "") // Elimina caracteres no alfanuméricos excepto espacios
      .toLowerCase() // Convierte todo a minúsculas
      .replace(/\s/g, ""); // Elimina todos los espacios en blanco
  }