import { UserData } from "../components/createUser/createUserPanel";
export default async function putUser(user: UserData) {
  const headersList = {
    Accept: "*/*",
    "Content-Type": "application/json",
  };
  const body = user;

  const url = import.meta.env.MODE === "development" ? "http://localhost:3000/user" : "/user";

  const response = await fetch(url, {
    method: "PUT",
    headers: headersList,
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return data;
}
