export default async function postUser(requestData: {
  name: string;
  last_name: string;
  ci: string;
  user: string;
  password: string;
  su: boolean;
  pnf_id: string;
}) {
  const headersList = {
    Accept: "*/*",
    "Content-Type": "application/json",
  };
  const bodyContent = JSON.stringify(requestData);

  const url = import.meta.env.MODE === "development" ? "http://localhost:3000/user" : "/user";

  const response = await fetch(url, {
    method: "POST",
    body: bodyContent,
    headers: headersList,

  });

  const data = await response.json();
  return data;
}

