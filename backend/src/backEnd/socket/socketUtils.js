import ContractType from "#models/contractType.js";
import Perfil from "#models/perfil.js";
import Proyections from "#models/proyections.js";

export async function getTeacherData(teacher) {
  const contract = await ContractType.findAll({ raw: true });

  const subjectsInPerfil = await Perfil.findAll({
    where: { perfil_name_id: teacher.perfil_name_id },
    raw: true,
  });

  teacher.partTime = contract.find((c) => c.contractType === teacher.type).hours;
  teacher.perfil = subjectsInPerfil
    .filter((s) => s.perfil_name_id === teacher.perfil_name_id)
    .map((s) => s.subject_id);

  return teacher;
}

export async function checkIfProyectionExists(currentProyectionId = null) {
  const defaultResponse = {
    id: null,
    year: null,
    name: null,
    subjects: [],
    teachers: {
      q1: [],
      q2: [],
      q3: [],
    },
    proyectionsDone: [],
    createdAt: null,
    updatedAt: null,
  };

  if (!currentProyectionId) {
    return {
      error: true,
      message: "NO se suministró un identificador para buscar una proyección activa",
      data: defaultResponse,
    };
  }

  const proyection = await Proyections.findOne({ where: { id: currentProyectionId }, raw: true });

  if (!proyection) {
    return { error: true, message: "No se encontró una proyección activa", data: defaultResponse };
  }

  return { error: false, message: "No se encontró una proyección activa", data: proyection };
}

