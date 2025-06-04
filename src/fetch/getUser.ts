export default async function getUser(ci: string) {
  const url =
    import.meta.env.MODE === "development" ? `http://localhost:3000/user?ci=${ci}` : `/user?ci=${ci}`;
  const headersList = {
    Accept: "*/*",
  };

  const response = await fetch(url, {
    method: "GET",
    headers: headersList,
  });

  if (response.status !== 200) {
    return await response.json();
  }

  const data = await response.json();
  return data;
}

