import express from "express";
import ScheduleVersion from "#models/schedule/scheduleVersion.js";

const Router = express.Router();

// GET /schedule-versions/detail/:id
// Returns the full state snapshot for a specific version.
// NOTE: must be registered BEFORE the generic /:proyectionId/:trimestre route,
// otherwise "detail" would be matched as a proyectionId.
Router.get("/schedule-versions/detail/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const version = await ScheduleVersion.findByPk(id, {
      attributes: ["state_snapshot"],
      raw: true,
    });
    if (!version) {
      return res.status(404).json({ error: true, message: "Versión no encontrada" });
    }
    return res.json(version);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener la versión del horario" });
  }
});

// GET /schedule-versions/:proyectionId/:trimestre
// Returns the last 100 version snapshots for a (proyection, trimestre) pair.
Router.get("/schedule-versions/:proyectionId/:trimestre", async (req, res) => {
  try {
    const { proyectionId, trimestre } = req.params;
    const rowName = `schedule-${proyectionId}-${trimestre}`;
    const versions = await ScheduleVersion.findAll({
      where: { row_name: rowName },
      order: [["version_number", "DESC"]],
      limit: 100,
      attributes: ["id", "version_number", "change_type", "description", "created_at"],
      raw: true,
    });
    return res.json(versions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las versiones del horario" });
  }
});

export default Router;
