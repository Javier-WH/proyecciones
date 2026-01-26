import Teacher from "#models/teachers.js";
import { v4 as uuidv4 } from "uuid";
import { setTeacherList } from "../../../socket/socket.js";

export default async function postTeacher(req, res) {
  /* eslint-disable camelcase */
  const { id, name, last_name, ci, gender_id, contractTypes_id, title, perfil_name_id, PNF, active } =
    req.body;

  if (!name && !last_name && !ci && !gender_id && !contractTypes_id && !title && !perfil_name_id && !active) {
    return res.status(401).json({ error: "no hay datos para crear o actualizar el profesor" });
  }

  const teacherData = {};
  if (name) teacherData.name = name;
  if (last_name) teacherData.last_name = last_name;
  if (ci) teacherData.ci = ci;
  if (gender_id) teacherData.gender_id = gender_id;
  if (contractTypes_id) teacherData.contractTypes_id = contractTypes_id;
  if (title) teacherData.title = title;
  if (perfil_name_id) teacherData.perfil_name_id = perfil_name_id;
  if (PNF) teacherData.PNF = PNF;
  if (active) teacherData.active = active;

  if (!id) {
    try {
      const id = uuidv4();
      teacherData.id = id;
      await Teacher.create(teacherData);
      // Actualizar la lista de profesores en el socket
      setTeacherList();
      return res.status(201).json({ message: "Profesor creado con éxito" });
    } catch (error) {
      console.error("Error al crear el profesor:", error);
      return res.status(500).json({ error: "Error al crear el profesor" });
    }
  }

  try {
    await Teacher.update(teacherData, { where: { id } });
    // Actualizar la lista de profesores en el socket
    setTeacherList();
    return res.status(200).json({ message: "Profesor actualizado con éxito" });
  } catch (error) {
    console.error("Error al actualizar el profesor:", error);
    return res.status(500).json({ error: "Error al actualizar el profesor" });
  }
}

