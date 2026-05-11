export default async function getSubjects({
  pnfId,
  trayectoId,
  mayaId,
}: {
  pnfId?: unknown;
  trayectoId?: unknown;
  mayaId?: unknown;
} = {}) {
  // Construir params solo con valores definidos
  const params = new URLSearchParams();
  if (pnfId !== undefined && pnfId !== null) params.set("pnfId", String(pnfId));
  if (trayectoId !== undefined && trayectoId !== null) params.set("trayectoId", String(trayectoId));
  if (mayaId !== undefined && mayaId !== null) params.set("mayaId", String(mayaId));

  const base = import.meta.env.MODE === "development" ? "" : "";
  const url = `${base}/api/subjects/simple?${params.toString()}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      // Intentar parsear JSON de error, si falla usar texto
      let msg = "";
      try {
        const errJson = await res.json();
        msg = errJson?.message || JSON.stringify(errJson);
      } catch {
        msg = await res.text().catch(() => "");
      }
      throw new Error(`Fetch error ${res.status}: ${msg}`);
    }

    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    // En caso de cualquier fallo, devolver arreglo vacío (no propagar objetos inesperados)
    return [];
  }
}

