// Importa los modelos
import Pensum from "#models/pensum.js";
import Pnf from "#models/pnf.js";
import Subject from "#models/subjects.js";
import Gender from "#models/gender.js";
import Teacher from "#models/teachers.js";
import ContractType from "#models/contractType.js";
import PerfilNames from "#models/perfilNames.js";
import Perfil from "#models/perfil.js";
import Trayecto from "#models/trayecto.js";

export default function setTableRelations() {
  // Establece las asociaciones entre pnf y subject atraves de la tabla pensum
  Pnf.belongsToMany(Subject, {
    through: Pensum,
    foreignKey: "pnf_id",
  });

  Subject.belongsToMany(Pnf, {
    through: Pensum,
    foreignKey: "subject_id",
  });

  // Relación entre Pensum y Pnf
  Pensum.belongsTo(Pnf, {
    foreignKey: "pnf_id",
  });

  Pnf.hasMany(Pensum, {
    foreignKey: "pnf_id",
  });

  // Relación entre Pensum y Subject
  Pensum.belongsTo(Subject, {
    foreignKey: "subject_id",
  });

  Subject.hasMany(Pensum, {
    foreignKey: "subject_id",
  });
  // Relación entre Pensum y Trayecto
  Pensum.belongsTo(Trayecto, {
    foreignKey: "trayecto_id",
  });

  Trayecto.hasMany(Pensum, {
    foreignKey: "trayecto_id",
  });

  // Relacion entre gender y teacher
  Gender.hasMany(Teacher, {
    foreignKey: "gender_id",
  });
  Teacher.belongsTo(Gender, {
    foreignKey: "gender_id",
  });

  // Relacion entre contractType y teacher
  ContractType.hasMany(Teacher, {
    foreignKey: "contractTypes_id",
  });
  Teacher.belongsTo(ContractType, {
    foreignKey: "contractTypes_id",
  });

  // Relacion entre teacher y perfil atraves de la tabla perfilNames
  /*PerfilNames.hasMany(Teacher, {
    foreignKey: "perfil_name_id",
  });
  Teacher.belongsTo(PerfilNames, {
    foreignKey: "perfil_name_id",
  });

  // Relacion entre perfil y perfilNames
  Perfil.hasMany(PerfilNames, {
    foreignKey: "perfil_name_id",
  });
  PerfilNames.belongsTo(Perfil, {
    foreignKey: "perfil_name_id",
  });*/
}
//
// En el modelo Profile
Perfil.belongsTo(PerfilNames, { foreignKey: "perfil_name_id" });

// En el modelo ProfileNames
PerfilNames.hasMany(Perfil, { foreignKey: "perfil_name_id" });

// En el modelo Profile
Perfil.belongsTo(Subject, { foreignKey: "subject_id" });

// En el modelo ProfileNames
Subject.hasMany(Perfil, { foreignKey: "subject_id" });

