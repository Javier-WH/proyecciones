import express from "express";
import { updateHoursTable } from "../../dataBase/syncScheduleTables/syncSchedule.js";
import Hours from "#models/schedule/hours.js";
import { Op } from "sequelize";

const Router = express.Router();

Router.get("/hours", async (_, res) => {
  const hours = await Hours.findAll({
    where: { hours: { [Op.ne]: null } },
    order: [["index", "ASC"]],
    raw: true,
  });
  if (hours.length === 0) {
    return res.status(404).json({ error: true, message: "no se encontraron horas" });
  }
  res.status(200).json(hours);
});

Router.post("/updatehours", express.json(), async (req, res) => {
  const { stepMinutes, initialStartTime, totalSlots } = req.body;
  if (!stepMinutes || !initialStartTime || !totalSlots) {
    return res
      .status(400)
      .json({ error: "Missing required fields (stepMinutes, initialStartTime, totalSlots)" });
  }
  const updated = await updateHoursTable(Number(stepMinutes), initialStartTime, totalSlots);

  if (updated) {
    return res.status(200).json({ message: "Hours updated successfully" });
  } else {
    return res.status(500).json({ error: "Failed to update hours" });
  }
});

export default Router;

