/* eslint-disable camelcase */
import Users from "#models/users.js";

async function createUser(data) {
  const { id, name, last_name, ci, user, password, pnf_id, su } = data;
  if (!id || !name || !last_name || !ci || !user || !password || !pnf_id || su === undefined) {
    return { error: true, message: "faltan datos para poder crear el usuario" };
  }

  try {
    const userCreated = await Users.create({ id, name, last_name, ci, user, password, pnf_id, su });
    return { error: false, message: userCreated };
  } catch (error) {
    return { error: true, message: error.errors[0].message };
  }
}

export { createUser };

