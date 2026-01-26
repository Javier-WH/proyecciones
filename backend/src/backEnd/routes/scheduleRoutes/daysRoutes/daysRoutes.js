import express from "express";
import Days from "#models/schedule/days.js";
import { v4 as uuidv4 } from "uuid";
import { Op } from "sequelize";
const Router = express.Router();

Router.get("/days", async (_, res) => {
  try {
    const days = await Days.findAll({ raw: true });
    if (days.length === 0) {
      return res.status(404).json({ error: true, message: "no se encontraron días de la semana" });
    }
    res.status(200).json(days);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: true, message: "ocurrió un error al intentar obtener los días de la semana" });
  }
});

Router.post("/day", express.json(), async (req, res) => {
  const { day, index } = req.body;
  if (!day || !index) {
    return res.status(401).json({ error: true, message: "no se suministró el dia o el indice" });
  }
  const id = uuidv4();
  try {
    const existingDaysOfWeek = await Days.findAll({ raw: true });

    if (existingDaysOfWeek.some((d) => d.day === day)) {
      return res.status(400).json({ error: true, message: "ya existe un dia de la semana con ese nombre" });
    }
    if (existingDaysOfWeek.length >= 7) {
      return res.status(400).json({ error: true, message: "ya se han creado los 7 días de la semana" });
    }
    if (index < 1 || index > 7) {
      return res.status(400).json({ error: true, message: "el indice debe estar entre 1 y 7" });
    }
    if (existingDaysOfWeek.some((d) => d.index == index)) {
      return res
        .status(400)
        .json({ error: true, message: "el indice ya está en uso por otro dia de la semana" });
    }
    await Days.create({ id, day, index });
    res.status(201).json({ message: "dia de la semana creado exitosamente" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: true, message: "ocurrio un error al intentar crear el dia de la semana" });
  }
});

Router.delete("/day/:id", async (req, res) => {
  const dayId = req.params.id;

  try {
    const day = await Days.findOne({ where: { id: dayId } });
    if (!day) {
      return res.status(404).json({ error: true, message: "dia de la semana no encontrado" });
    }
    await Days.destroy({ where: { id: dayId } });
    res.status(200).json({ message: "dia de la semana eliminado exitosamente" });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: true, message: "ocurrió un error al intentar eliminar el dia de la semana" });
  }
});

Router.put("/day/:id", express.json(), async (req, res) => {
  const dayId = req.params.id;
  const { day, index } = req.body;
  if (!day && !index) {
    return res.status(400).json({ error: true, message: "Se requiere un dia de la semana ó un indice." });
  }
  try {
    // 1. Verificar si el nombre del dia ya existe en OTRO dia
    const existingDayWithName = await Days.findOne({
      where: {
        day,
        id: {
          [Op.ne]: dayId,
        },
      },
    });

    if (existingDayWithName) {
      return res.status(409).json({ error: true, message: "Ya existe un dia de la semana con ese nombre." });
    }

    const params = {};
    if (day) {
      params.day = day;
    }
    if (index) {
      if (index < 1 || index > 7) {
        return res.status(400).json({ error: true, message: "El indice debe estar entre 1 y 7." });
      }
      params.index = index;
    }

    // 2. Intentar actualizar el dia
    const [updatedRowsCount] = await Days.update(params, { where: { id: dayId } });

    if (updatedRowsCount === 0) {
      return res
        .status(404)
        .json({ error: true, message: "No se encontró ningún dia con el ID proporcionado." });
    }

    res.status(200).json({ message: "Dia actualizado exitosamente." });
  } catch (error) {
    if (error.errors) {
      if (error.errors[0].type === "unique violation") {
        if (error.errors[0].path === "day") {
          // Si el error es por el nombre del dia
          return res
            .status(409)
            .json({ error: true, message: "Ya existe un dia de la semana con ese nombre." });
        }
        if (error.errors[0].path === "index") {
          // Si el error es por el indice
          return res
            .status(409)
            .json({ error: true, message: "Ya existe un dia de la semana con ese indice." });
        }
      }
    }
    console.error(error.errors);
    res.status(500).json({ error: true, message: "Ocurrió un error interno al intentar actualizar el dia." });
  }
});

export default Router;

