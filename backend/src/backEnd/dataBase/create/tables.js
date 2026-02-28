import PerfilNames from "#models/perfilNames.js";
import Subjects from "#models/subjects.js";
import Perfil from "#models/perfil.js";
import Pnf from "#models/pnf.js";
import Pensum from "#models/pensum.js";
import ContractType from "#models/contractType.js";
import Teacher from "#models/teachers.js";
import Gender from "#models/gender.js";
import Trayecto from "#models/trayecto.js";
import Turnos from "#models/turnos.js";
import Proyections from "#models/proyections.js";
import Config from "#models/config.js";
import Users from "#models/users.js";
import Pnf_teacher from "#models/pnf_teacher.js";
// importación de las tablas de los horarios
import Days from "#models/schedule/days.js";
import Hours from "#models/schedule/hours.js";
import Classrooms from "#models/schedule/classrooms.js";
import Schedule from "#models/schedule/schedule.js";
import SubjectRestrictions from "#models/schedule/subjectsRestrictions.js";
import TeachersRestrictions from "#models/schedule/teacherRestrictions.js";
import ScheduleConfig from "#models/schedule/scheduleConfig.js";
import ClassroomOverrides from "#models/schedule/classroomOverrides.js";
/*
 * No se debe cambiar el orden de las tablas, ya que se crearía un error de foreign key
 */
const tableList = [
  Turnos,
  Trayecto,
  Gender,
  Subjects,
  Pnf,
  ContractType,
  PerfilNames,
  Pensum,
  Perfil,
  Teacher,
  Pnf_teacher,
  Proyections,
  Config,
  Users,
  // horarios
  Days,
  Hours,
  Classrooms,
  Schedule,
  SubjectRestrictions,
  TeachersRestrictions,
  ScheduleConfig,
  ClassroomOverrides,
];

export default tableList;

