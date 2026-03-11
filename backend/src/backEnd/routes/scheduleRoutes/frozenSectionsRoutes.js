import express from "express";
import FrozenSections from "#models/schedule/frozenSections.js";
import Proyections from "#models/proyections.js";
import sequelize from "#dataBaseConnection";

const Router = express.Router();

// GET - Obtener todas las secciones congeladas para una proyección
Router.get("/frozen-sections/:proyectionId", async (req, res) => {
  try {
    const { proyectionId } = req.params;

    if (!proyectionId) {
      return res.status(400).json({ message: "proyectionId es requerido" });
    }

    const records = await FrozenSections.findAll({
      where: { proyection_id: proyectionId },
      raw: true,
    });

    // Convert array of records into a Record<string, Event[]> object
    const frozenSections = {};
    for (const record of records) {
      let events = record.events;
      if (typeof events === "string") {
        try {
          events = JSON.parse(events);
        } catch (e) {
          events = [];
        }
      }
      frozenSections[record.section_key] = Array.isArray(events) ? events : [];
    }

    return res.status(200).json({ frozenSections });
  } catch (error) {
    console.error("Error al obtener frozen sections:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

// POST - Guardar/actualizar secciones congeladas (bulk replace)
Router.post("/frozen-sections", express.json({ limit: "10mb" }), async (req, res) => {
  try {
    const { proyection_id, frozen_sections } = req.body;

    if (!proyection_id) {
      return res.status(400).json({ message: "proyection_id es requerido" });
    }

    if (!frozen_sections || typeof frozen_sections !== "object") {
      return res.status(400).json({ message: "frozen_sections debe ser un objeto" });
    }

    const proyection = await Proyections.findByPk(proyection_id, { attributes: ["id"], raw: true });
    if (!proyection) {
      return res.status(404).json({ message: "La proyección indicada no existe" });
    }

    const transaction = await sequelize.transaction();
    try {
      // Eliminar todas las secciones congeladas de esta proyección
      await FrozenSections.destroy({
        where: { proyection_id },
        transaction,
      });

      // Crear nuevos registros
      const records = [];
      for (const [sectionKey, events] of Object.entries(frozen_sections)) {
        if (Array.isArray(events) && events.length > 0) {
          records.push({
            proyection_id,
            section_key: sectionKey,
            events: events,
          });
        }
      }

      if (records.length > 0) {
        await FrozenSections.bulkCreate(records, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    return res.status(200).json({ message: "Secciones congeladas guardadas correctamente" });
  } catch (error) {
    console.error("Error al guardar frozen sections:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

// PUT - Actualizar una sección congelada individual (sin reemplazar todo)
Router.put("/frozen-sections", express.json({ limit: "10mb" }), async (req, res) => {
  try {
    const { proyection_id, section_key, events } = req.body;

    if (!proyection_id) {
      return res.status(400).json({ message: "proyection_id es requerido" });
    }
    if (!section_key) {
      return res.status(400).json({ message: "section_key es requerido" });
    }

    const proyection = await Proyections.findByPk(proyection_id, { attributes: ["id"], raw: true });
    if (!proyection) {
      return res.status(404).json({ message: "La proyección indicada no existe" });
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      // Si no hay events, eliminar esta sección congelada
      await FrozenSections.destroy({
        where: { proyection_id, section_key },
      });
      return res.status(200).json({ message: "Sección descongelada correctamente" });
    }

    // Upsert: crear o actualizar
    await FrozenSections.upsert({
      proyection_id,
      section_key,
      events,
    });

    return res.status(200).json({ message: "Sección congelada actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar frozen section:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

// DELETE - Eliminar una sección congelada específica
Router.delete("/frozen-sections/:proyectionId/:sectionKey", async (req, res) => {
  try {
    const { proyectionId, sectionKey } = req.params;

    const deleted = await FrozenSections.destroy({
      where: { proyection_id: proyectionId, section_key: sectionKey },
    });

    if (!deleted) {
      return res.status(404).json({ message: "Sección congelada no encontrada" });
    }

    return res.status(200).json({ message: "Sección descongelada correctamente" });
  } catch (error) {
    console.error("Error al eliminar frozen section:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

// DELETE - Eliminar todas las secciones congeladas de una proyección
Router.delete("/frozen-sections/all/:proyectionId", async (req, res) => {
  try {
    const { proyectionId } = req.params;

    await FrozenSections.destroy({ where: { proyection_id: proyectionId } });

    return res.status(200).json({ message: "Todas las secciones descongeladas" });
  } catch (error) {
    console.error("Error al eliminar frozen sections:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default Router;
