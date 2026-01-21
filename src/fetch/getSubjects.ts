export default async function getSubjects({
  pnfId,
  trayectoId,
  mayaId,
}: {
  pnfId?: unknown;
  trayectoId?: unknown;
  mayaId?: unknown;
}) {
  // Validación mínima requerida
  if (mayaId === undefined || mayaId === null) throw new Error("Se requiere mayaId");

  const params = new URLSearchParams({
    pnfId: String(pnfId ?? ""),
    trayectoId: String(trayectoId ?? ""),
    mayaId: String(mayaId),
  });

  const base = import.meta.env.MODE === "development" ? "http://localhost:3000" : "";
  const url = `${base}/api/subjects/simple?${params.toString()}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
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
