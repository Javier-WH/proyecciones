export default async function getReport({ pnfId, type }: { pnfId: string; type: number }) {
  const headersList = {
    Accept: "*/*",
    "Content-Type": "application/json",
  };

  const bodyContent = JSON.stringify({
    pnfId,
    type,
  });

  const url = import.meta.env.MODE === "development" ? `http://localhost:3000/excelreport` : `/excelreport`;

  try {
    const response = await fetch(url, {
      method: "POST",
      body: bodyContent,
      headers: headersList,

    });

    if (!response.ok) {
      return await response.json();
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "reporte.xlsx";

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      } else {
        // Intentar un patrón alternativo para nombres no entrecomillados
        const basicFilenameMatch = contentDisposition.match(/filename=([^;]+)/);
        if (basicFilenameMatch && basicFilenameMatch[1]) {
          filename = basicFilenameMatch[1].trim();
        }
      }
    }

    // Crear una URL temporal para el Blob
    const downloadUrl = window.URL.createObjectURL(blob);

    // Crear un enlace (<a>) oculto para simular la descarga
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename; // Usa el nombre de archivo extraído o el por defecto

    // Añadir el enlace al DOM temporalmente y hacer clic en él
    document.body.appendChild(link);
    link.click();

    // Limpiar: eliminar el enlace y revocar la URL temporal
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    return { success: true, filename };
  } catch (error) {
    return { error: error };
  }
}
