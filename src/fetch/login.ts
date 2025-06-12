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


export async function logout() {

  const headersList = {
    "Accept": "*/*"
  }


  const url = import.meta.env.MODE === 'development' ? "http://localhost:3000/logout" : "/logout";

  const response = await fetch(url, {
    method: "GET",
    headers: headersList,
    credentials: 'include'
  });

  const data = await response.json();
  console.log(data);
  return data

}