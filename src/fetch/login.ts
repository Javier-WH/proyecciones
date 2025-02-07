export default async function login({ user, password }: { user: string , password: string }) {

  const headersList = {
    "Accept": "*/*",
    "Content-Type": "application/json"
  }

  const bodyContent = JSON.stringify({
    user,
    password
  });

  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/login" : "/login";

  const response = await fetch(url, {
    method: "POST",
    body: bodyContent,
    headers: headersList
  });

  const data = await response.json();
  return data

}