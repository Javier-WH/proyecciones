import express from "express";
import ClassroomOverrides from "#models/schedule/classroomOverrides.js";

const Router = express.Router();

// GET - Obtener todos los overrides para una proyección
Router.get("/classroom-overrides/:proyectionId", async (req, res) => {
  try {
    const { proyectionId } = req.params;

    if (!proyectionId) {
      return res.status(400).json({ message: "proyectionId es requerido" });
    }

    const overrides = await ClassroomOverrides.findAll({
      where: { proyection_id: proyectionId },
      raw: true,
    });

    return res.status(200).json({ overrides });
  } catch (error) {
    console.error("Error al obtener classroom overrides:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

// POST - Crear o actualizar overrides (bulk)
Router.post("/classroom-overrides", express.json(), async (req, res) => {
  try {
    const { proyection_id, overrides } = req.body;

    if (!proyection_id) {
      return res.status(400).json({ message: "proyection_id es requerido" });
    }

    if (!Array.isArray(overrides)) {
      return res.status(400).json({ message: "overrides debe ser un array" });
    }

    // Eliminar todos los existentes y reemplacerlos
    await ClassroomOverrides.destroy({
      where: { proyection_id },
    });

    if (overrides.length > 0) {
      const records = overrides.map((ov) => ({
        proyection_id,
        subject_name: ov.subject_name,
        day: ov.day,
        start_time: ov.start_time,
        end_time: ov.end_time,
        classroom_id: ov.classroom_id,
        seccion: ov.seccion || null,
        pnf_id: ov.pnf_id || null,
        trayecto_id: ov.trayecto_id || null,
      }));

      await ClassroomOverrides.bulkCreate(records);
    }

    return res.status(200).json({ message: "Overrides guardados correctamente" });
  } catch (error) {
    console.error("Error al guardar classroom overrides:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

// DELETE - Eliminar un override específico por ID
Router.delete("/classroom-overrides/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await ClassroomOverrides.destroy({ where: { id } });

    if (!deleted) {
      return res.status(404).json({ message: "Override no encontrado" });
    }

    return res.status(200).json({ message: "Override eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar classroom override:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

// DELETE - Eliminar todos los overrides de una proyección
Router.delete("/classroom-overrides/all/:proyectionId", async (req, res) => {
  try {
    const { proyectionId } = req.params;

    await ClassroomOverrides.destroy({ where: { proyection_id: proyectionId } });

    return res.status(200).json({ message: "Todos los overrides eliminados" });
  } catch (error) {
    console.error("Error al eliminar classroom overrides:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default Router;

