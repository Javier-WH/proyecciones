export default async function getUsers() {
  const url =
    import.meta.env.MODE === "development" ? `/users` : `/users`;
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
