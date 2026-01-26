import Pnf from "#models/pnf.js";
import { v4 as uuidv4 } from "uuid";

export default async function postPNF(req, res) {
  const { id, name, active, sagaId, color } = req.body;

  if (!name && (active === undefined || active === null)) {
    return res.status(401).json({ error: "Faltan campos por llenar" });
  }

  const params = {};
  if (name) params.name = name;
  if (active !== undefined || active !== null) params.active = active;
  if (sagaId) params.saga_id = sagaId;
  if (color) params.color = color;

  try {
    if (id) {
      await Pnf.update(params, { where: { id } });
      return res.status(200).json({ message: "Pnf actualizada" });
    }

    params.id = uuidv4();
    await Pnf.create(params);
    res.status(201).json({ message: "Pnf creada" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al intentar actaulizar o crear el pnf" });
  }
}

