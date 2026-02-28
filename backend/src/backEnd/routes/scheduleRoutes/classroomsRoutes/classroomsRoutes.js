import express from "express";
import Classrooms from "#models/schedule/classrooms.js";
import { v4 as uuidv4 } from "uuid";
import { Op } from "sequelize";
const Router = express.Router();

Router.get("/classrooms", async (_, res) => {
  try {
    const classrooms = await Classrooms.findAll({ raw: true });
    if (classrooms.length === 0) {
      return res.status(404).json({ error: true, message: "no se encontraron aulas de clase" });
    }
    res.status(200).json(classrooms);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: true, message: "ocurrió un error al intentar obtener las aulas de clase" });
  }
});

Router.post("/classroom", express.json(), async (req, res) => {
  const classroom = req.body.classroom;
  if (!classroom) {
    return res.status(401).json({ error: true, message: "no se suministro un nombre de aula de clase" });
  }
  const id = uuidv4();
  try {
    const existingClassroom = await Classrooms.findOne({ where: { classroom } });
    if (existingClassroom) {
      return res.status(400).json({ error: true, message: "ya existe una aula de clase con ese nombre" });
    }
    const active = req.body.active !== undefined ? req.body.active : true;
    const exclusive = req.body.exclusive !== undefined ? req.body.exclusive : false;
    await Classrooms.create({ classroom, id, active, exclusive });
    res.status(201).json({ message: "aula de clase creada exitosamente" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: true, message: "ocurrió un error al intentar crear la aula de clase" });
  }
});

Router.delete("/classroom/:id", async (req, res) => {
  const classroomId = req.params.id;
  try {
    const classroom = await Classrooms.findOne({ where: { id: classroomId } });
    if (!classroom) {
      return res.status(404).json({ error: true, message: "aula de clase no encontrada" });
    }
    await Classrooms.destroy({ where: { id: classroomId } });
    res.status(200).json({ message: "aula de clase eliminada exitosamente" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: true, message: "ocurrio un error al intentar eliminar la aula de clase" });
  }
});

Router.put("/classroom/:id", express.json(), async (req, res) => {
  const classroomId = req.params.id;
  const { classroom, active, exclusive } = req.body;
  if (classroom === undefined && active === undefined && exclusive === undefined) {
    return res
      .status(400)
      .json({ error: true, message: "Se requiere un nombre, estado o exclusividad para el aula." });
  }
  try {
    // 1. Verificar si el nombre del aula ya existe en OTRA aula
    const existingClassroomWithName = await Classrooms.findOne({
      where: {
        classroom,
        id: {
          [Op.ne]: classroomId,
        },
      },
    });

    if (existingClassroomWithName) {
      return res.status(409).json({ error: true, message: "Ya existe un aula con ese nombre." });
    }

    // 2. Intentar actualizar el aula
    const updateData = {};
    if (classroom !== undefined) updateData.classroom = classroom;
    if (active !== undefined) updateData.active = active;
    if (exclusive !== undefined) updateData.exclusive = exclusive;

    const [updatedRowsCount] = await Classrooms.update(updateData, { where: { id: classroomId } });

    if (updatedRowsCount === 0) {
      return res
        .status(404)
        .json({ error: true, message: "No se encontró ningún aula con el ID proporcionado." });
    }

    res.status(200).json({ message: "Aula actualizada exitosamente." });
  } catch (error) {
    console.error("Error al actualizar el aula:", error);
    res
      .status(500)
      .json({ error: true, message: "Ocurrió un error interno al intentar actualizar el aula." });
  }
});

export default Router;

