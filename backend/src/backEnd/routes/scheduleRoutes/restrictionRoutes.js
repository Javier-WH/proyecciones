import express from "express";
import SubjectRestrictions from "#models/schedule/subjectsRestrictions.js";
import TeachersRestrictions from "#models/schedule/teacherRestrictions.js";
import Teachers from "#models/teachers.js";
import Proyections from "#models/proyections.js";
import ScheduleConfig from "#models/schedule/scheduleConfig.js";
import sequelize from "#dataBaseConnection";

const Router = express.Router();

const toMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

function normalizeSubjectKey(value) {
  if (typeof value !== "string") return null;
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 36);

  return normalized || null;
}

function normalizeClassroomIds(input) {
  if (!Array.isArray(input)) return null;

  const normalized = [
    ...new Set(
      input.map((value) => {
        if (value === null || value === undefined) return "";
        return value.toString().trim();
      }),
    ),
  ].filter((value) => Boolean(value));

  return normalized.length ? normalized : null;
}

function sanitizeSubjectName(name) {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  return trimmed || null;
}

function formatSubjectRestriction(restriction) {
  let cIds = restriction.classroom_ids;
  if (typeof cIds === "string") {
    try {
      cIds = JSON.parse(cIds);
    } catch (e) {
      // ignore
    }
  }
  return {
    subject_key: restriction.subject_key,
    subject_name: restriction.subject_name,
    classroom_ids: Array.isArray(cIds) ? cIds : [],
    pnf_id: restriction.pnf_id || undefined,
    is_exclusive: Boolean(restriction.is_exclusive),
    split_hours: Boolean(restriction.split_hours),
  };
}

function normalizeHour(value) {
  if (typeof value === "number") {
    value = value.toString();
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(":");
  if (parts.length > 2) return null;

  const hour = Number(parts[0]);
  const minute = parts[1] !== undefined ? Number(parts[1]) : 0;

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function normalizeRestrictedDays(daysInput, validDays = [1, 2, 3, 4, 5]) {
  if (daysInput === undefined || daysInput === null) return [];
  if (!Array.isArray(daysInput)) return null;

  const normalized = [...new Set(daysInput.map((day) => Number(day)))];
  if (normalized.some((day) => !Number.isInteger(day) || !validDays.includes(day))) {
    return null;
  }

  return normalized.sort((a, b) => a - b);
}

function normalizeHourEntry(entry, validDays = [1, 2, 3, 4, 5]) {
  if (!entry || typeof entry !== "object") return null;
  const day = Number(entry.day);

  if (!Number.isInteger(day) || !validDays.includes(day)) {
    return null;
  }

  const start = normalizeHour(entry.start);
  const end = normalizeHour(entry.end);

  if (!start || !end) return null;
  if (toMinutes(start) >= toMinutes(end)) return null;

  return { day, start, end };
}

function normalizeRestrictedHours(hoursInput, validDays = [1, 2, 3, 4, 5]) {
  if (hoursInput === undefined || hoursInput === null) return [];
  if (!Array.isArray(hoursInput)) return null;

  const normalized = [];
  for (const entry of hoursInput) {
    const normalizedEntry = normalizeHourEntry(entry, validDays);
    if (!normalizedEntry) return null;
    normalized.push(normalizedEntry);
  }

  return normalized.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return a.start.localeCompare(b.start);
  });
}

function formatRestriction(record, teacherId) {
  if (!record) {
    return {
      teacher_id: teacherId ?? null,
      restricted_days: [],
      restricted_hours: [],
    };
  }

  let rDays = record.restricted_days;
  if (typeof rDays === "string") {
    try {
      rDays = JSON.parse(rDays);
    } catch (e) {
      /* ignore */
    }
  }
  let rHours = record.restricted_hours;
  if (typeof rHours === "string") {
    try {
      rHours = JSON.parse(rHours);
    } catch (e) {
      /* ignore */
    }
  }

  return {
    teacher_id: record.teacher_id ?? teacherId ?? null,
    restricted_days: Array.isArray(rDays) ? rDays : [],
    restricted_hours: Array.isArray(rHours) ? rHours : [],
  };
}

Router.post("/teacher-restrictions", express.json(), async (req, res) => {
  try {
    const {
      teacher_id: teacherId,
      restricted_days: restrictedDaysInput,
      restricted_hours: restrictedHoursInput,
    } = req.body || {};

    if (!teacherId) {
      return res
        .status(400)
        .json({ error: true, message: "Debe suministrar un ID para el profesor (teacher_id)" });
    }

    const teacherExists = await Teachers.findByPk(teacherId, { attributes: ["id"], raw: true });
    if (!teacherExists) {
      return res.status(404).json({ error: true, message: "El profesor indicado no existe" });
    }

    const config = await ScheduleConfig.findOne({ where: { active: true }, raw: true });
    const validDays = config
      ? typeof config.days === "string"
        ? JSON.parse(config.days)
        : config.days
      : [1, 2, 3, 4, 5];

    const restrictedDays = normalizeRestrictedDays(restrictedDaysInput, validDays);
    if (restrictedDays === null) {
      return res.status(400).json({
        error: true,
        message: `restricted_days debe ser un arreglo de enteros contenidos en: ${validDays.join(", ")}`,
      });
    }

    console.log(restrictedHoursInput);
    const restrictedHours = normalizeRestrictedHours(restrictedHoursInput, validDays);
    console.log(restrictedHours);
    if (restrictedHours === null) {
      return res.status(400).json({
        error: true,
        message:
          "restricted_hours debe ser un arreglo de objetos { day, start, end } con horarios válidos congruente con los días configurados",
      });
    }

    await TeachersRestrictions.upsert({
      teacher_id: teacherId,
      restricted_days: restrictedDays,
      restricted_hours: restrictedHours,
      restrictions: JSON.stringify({ restricted_days: restrictedDays, restricted_hours: restrictedHours }),
    });

    const updated = await TeachersRestrictions.findOne({ where: { teacher_id: teacherId }, raw: true });

    return res.json({
      message: "Restricciones del profesor guardadas correctamente",
      data: formatRestriction(updated),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al intentar crear o actualizar una restricción para profesor" });
  }
});

Router.get("/teacher-restrictions/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (!teacherId) {
      return res
        .status(400)
        .json({ error: true, message: "Debe suministrar el ID del profesor (teacherId)" });
    }

    const restriction = await TeachersRestrictions.findOne({ where: { teacher_id: teacherId }, raw: true });
    return res.json(formatRestriction(restriction, teacherId));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor al buscar la restricción" });
  }
});

Router.get("/teacher-restrictions", async (_req, res) => {
  try {
    const restrictions = await TeachersRestrictions.findAll({ raw: true });
    return res.json(restrictions.map((restriction) => formatRestriction(restriction)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor al listar las restricciones" });
  }
});

Router.get("/subject-restrictions/:proyectionId", async (req, res) => {
  try {
    const { proyectionId } = req.params;

    if (!proyectionId) {
      return res.status(400).json({ error: true, message: "Debe suministrar el ID de la proyección" });
    }

    const proyection = await Proyections.findByPk(proyectionId, { attributes: ["id"], raw: true });
    if (!proyection) {
      return res.status(404).json({ error: true, message: "La proyección indicada no existe" });
    }

    const restrictions = await SubjectRestrictions.findAll({
      where: { proyection_id: proyectionId },
      attributes: ["subject_key", "subject_name", "classroom_ids", "pnf_id", "is_exclusive", "split_hours"],
      raw: true,
    });

    return res.json({ restrictions: restrictions.map(formatSubjectRestriction) });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: true, message: "Error interno del servidor al consultar las restricciones" });
  }
});

Router.post("/subject-restrictions", express.json(), async (req, res) => {
  try {
    const { proyection_id: proyectionId, restrictions } = req.body || {};

    if (!proyectionId) {
      return res.status(400).json({ error: true, message: "El campo proyection_id es requerido" });
    }

    const proyection = await Proyections.findByPk(proyectionId, { attributes: ["id"], raw: true });
    if (!proyection) {
      return res.status(404).json({ error: true, message: "La proyección indicada no existe" });
    }

    if (!Array.isArray(restrictions)) {
      return res.status(400).json({
        error: true,
        message: "El campo restrictions debe ser un arreglo de materias",
      });
    }

    const normalizedRestrictions = [];

    for (const restriction of restrictions) {
      const subjectKeyInput = restriction?.subject_key ?? restriction?.subjectKey ?? restriction?.subject;
      const subjectNameInput = restriction?.subject_name ?? restriction?.subjectName ?? "";
      const classroomIdsInput = restriction?.classroom_ids ?? restriction?.classroomIds;
      const isExclusiveInput = restriction?.is_exclusive ?? restriction?.isExclusive ?? false;
      const splitHoursInput = restriction?.split_hours ?? restriction?.splitHours ?? false;

      const subjectKey = normalizeSubjectKey(subjectKeyInput);
      if (!subjectKey) {
        return res.status(400).json({
          error: true,
          message: "Cada restricción debe incluir un subject_key válido (36 caracteres, sin espacios)",
        });
      }

      const subjectName = sanitizeSubjectName(subjectNameInput) ?? subjectKeyInput ?? subjectKey;

      const classroomIds = normalizeClassroomIds(classroomIdsInput);
      if (!classroomIds) {
        return res.status(400).json({
          error: true,
          message: "Cada restricción debe incluir classroom_ids como arreglo con al menos un ID de aula",
        });
      }

      const pnfIdInput = restriction?.pnf_id ?? restriction?.pnfId;

      const normalizedPnfId = pnfIdInput || null;
      const uniqueKey = `${proyectionId}-${subjectKey}-${normalizedPnfId}`;

      const existingIndex = normalizedRestrictions.findIndex(
        (r) => `${r.proyection_id}-${r.subject_key}-${r.pnf_id}` === uniqueKey,
      );

      const newRestriction = {
        proyection_id: proyectionId,
        subject_key: subjectKey,
        subject_name: subjectName,
        classroom_ids: classroomIds,
        pnf_id: normalizedPnfId,
        is_exclusive: Boolean(isExclusiveInput),
        split_hours: Boolean(splitHoursInput),
      };

      if (existingIndex >= 0) {
        normalizedRestrictions[existingIndex] = newRestriction;
      } else {
        normalizedRestrictions.push(newRestriction);
      }
    }

    const transaction = await sequelize.transaction();
    try {
      await SubjectRestrictions.destroy({ where: { proyection_id: proyectionId }, transaction });
      if (normalizedRestrictions.length > 0) {
        await SubjectRestrictions.bulkCreate(normalizedRestrictions, { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    return res.json({
      message: "Restricciones de materias actualizadas correctamente",
      restrictions: normalizedRestrictions.map(formatSubjectRestriction),
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: true, message: "Error al intentar actualizar las restricciones de materias" });
  }
});

export default Router;

