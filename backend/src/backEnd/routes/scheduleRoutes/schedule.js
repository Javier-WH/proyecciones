import express from "express";
import Schedule from "#models/schedule/schedule.js";

const Router = express.Router();

const checkSchedulePatams = ({ id, name, schedule, proyection_id }, checkId = false) => {
  if (checkId && !id) {
    return { error: true, message: "no se suministro un id" };
  }

  if (!name && !schedule && !proyection_id) {
    return {
      error: true,
      message: "debe suministrar al menos uno de estos datos: name, schedule, proyection_id",
    };
  }

  return { error: false };
};

Router.post("/schedule", express.json({ limit: "50mb" }), async (req, res) => {
  try {
    const { id, name, schedule, proyection_id } = req.body;

    // si no tiene id entonces se inserta
    if (!id) {
      const { error, message } = checkSchedulePatams({ name, schedule, proyection_id });
      if (error) {
        return res.status(400).json({ error, message });
      }

      await Schedule.create({ name, schedule, proyection_id });
      return res.status(201).json({ message: "Horario creado correctamente" });
    } else {
      const { error, message } = checkSchedulePatams({ id, name, schedule, proyection_id }, true);
      if (error) {
        return res.status(400).json({ error, message });
      }
      await Schedule.update({ name, schedule, proyection_id }, { where: { id } });
      return res.status(200).json({ message: "Horario actualizado correctamente" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al intentar actaulizar o crear el horario" });
  }
});

Router.get("/schedule", async (req, res) => {
  const { id } = req.query;

  if (id) {
    const schedule = await Schedule.findOne({ where: { id } });
    if (!schedule) {
      return res.status(404).json({ error: true, message: "horario no encontrado" });
    }
    return res.json(schedule);
  }
  const schedule = await Schedule.findAll({ raw: true });
  if (schedule.length === 0) {
    return res.status(404).json({ error: true, message: "no se encontraron horarios" });
  }
  res.json(schedule);
});

export default Router;

