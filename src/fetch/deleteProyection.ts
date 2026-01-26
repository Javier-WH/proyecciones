export default async function deleteProyection(id: string) {
  const token = sessionStorage.getItem("token");
  const baseUrl = import.meta.env.MODE === 'development' ? "http://localhost:3000" : "";

  const response = await fetch(`${baseUrl}/proyeccion/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    return { error: errorData.error || "Error al eliminar la proyección" };
  }

  return response.json();
}
