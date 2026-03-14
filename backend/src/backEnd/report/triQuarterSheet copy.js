/* eslint-disable no-unused-vars */
import { getTeacherHous } from "./utils.js";
export default function generateTriQuarterSheet({
  sheetNumber,
  workbook,
  pnfArray,
  proyectionDate,
  contracts,
  targetPnfId
}) {
  let pageNumber = Number.parseInt(sheetNumber);

  for (const pnf of pnfArray) {
    const modalities = [
      { isSemestral: false, label: 'I-II-III', title: 'TRIMESTRE I-II-III' },
      { isSemestral: true, label: 'SEMESTRES', title: 'SEMESTRE I-II' }
    ];

    for (const modality of modalities) {
      const teachers = groupSubjectsByTeacher(pnf, targetPnfId, modality.isSemestral);
      if (!teachers.some(t => t.load.length > 0)) continue;

      const sheetName = `${pnf[0].pnf} ${modality.label}`
        .replace("P.N.F. en ", "")
        .replace("P.N.F en ", "")
        .toUpperCase();
      const sheet = workbook.addSheet(sheetName);

      let row = 1;
      // encabezado
      const rangeLine1 = sheet.range(`A${row}:N${row}`);
      sheet.cell(`A${row}`).value("PERSONAL DOCENTE");
      rangeLine1.merged(true);
      rangeLine1.style("horizontalAlignment", "center");
      rangeLine1.style("verticalAlignment", "center");
      row++;

      const rangeLine2 = sheet.range(`A${row}:N${row}`);
      sheet.cell(`A${row}`).value(`${pnf[0].pnf}`.toUpperCase());
      rangeLine2.merged(true);
      rangeLine2.style("horizontalAlignment", "center");
      rangeLine2.style("verticalAlignment", "center");
      row++;

      const rangeLine3 = sheet.range(`A${row}:N${row}`);
      sheet.cell(`A${row}`).value("U.P.T. DE LOS LLANOS JUANA RAMIREZ, EXTENSIÓN ALTAGRACIA DE ORITUCO");
      rangeLine3.merged(true);
      rangeLine3.style("horizontalAlignment", "center");
      rangeLine3.style("verticalAlignment", "center");
      row++;

      const rangeLine4 = sheet.range(`A${row}:N${row}`);
      sheet.cell(`A${row}`).value(`CARGA ACADÉMICA ${modality.title}`);
      rangeLine4.merged(true);
      rangeLine4.style("horizontalAlignment", "center");
      rangeLine4.style("verticalAlignment", "center");
      row++;

      const rangeLine5 = sheet.range(`A${row}:N${row}`);
      sheet.cell(`A${row}`).value(proyectionDate);
      rangeLine5.merged(true);
      rangeLine5.style("horizontalAlignment", "center");
      rangeLine5.style("verticalAlignment", "center");
      row++;
      row++;

      // encabezado de la tabla
      const boldHeaderRange = sheet.range(`A${row}:N${row + 1}`);
      boldHeaderRange.style("bold", true);

      const rangeLine6A = sheet.range(`A${row}:A${row + 1}`);
      sheet.cell(`A${row}`).value("Profesor");
      rangeLine6A.merged(true);
      rangeLine6A.style("horizontalAlignment", "center");
      rangeLine6A.style("verticalAlignment", "center");
      rangeLine6A.style("border", true);

      const rangeLine6B = sheet.range(`B${row}:B${row + 1}`);
      sheet.cell(`B${row}`).value("Unidad Curricular");
      rangeLine6B.merged(true);
      rangeLine6B.style("horizontalAlignment", "center");
      rangeLine6B.style("verticalAlignment", "center");
      rangeLine6B.style("border", true);

      // Nueva columna PNF
      const rangeLine6PNF = sheet.range(`C${row}:C${row + 1}`);
      sheet.cell(`C${row}`).value("PNF");
      rangeLine6PNF.merged(true);
      rangeLine6PNF.style("horizontalAlignment", "center");
      rangeLine6PNF.style("verticalAlignment", "center");
      rangeLine6PNF.style("border", true);

      const rangeLine6C = sheet.range(`D${row}:D${row + 1}`);
      sheet.cell(`D${row}`).value("Trayecto");
      rangeLine6C.merged(true);
      rangeLine6C.style("horizontalAlignment", "center");
      rangeLine6C.style("verticalAlignment", "center");
      rangeLine6C.style("border", true);

      const rangeLine6D = sheet.range(`E${row}:E${row + 1}`);
      sheet.cell(`E${row}`).value("Sección");
      rangeLine6D.merged(true);
      rangeLine6D.style("horizontalAlignment", "center");
      rangeLine6D.style("verticalAlignment", "center");
      rangeLine6D.style("border", true);

      const rangeLine6E = sheet.range(`F${row}:F${row + 1}`);
      sheet.cell(`F${row}`).value("Turno");
      rangeLine6E.merged(true);
      rangeLine6E.style("horizontalAlignment", "center");
      rangeLine6E.style("verticalAlignment", "center");
      rangeLine6E.style("border", true);

      const rangeLine6FG = sheet.range(`G${row}:H${row}`);
      sheet.cell(`G${row}`).value(modality.isSemestral ? "SEMESTRE I" : "TRIMESTRE I");
      rangeLine6FG.merged(true);
      rangeLine6FG.style("horizontalAlignment", "center");
      rangeLine6FG.style("verticalAlignment", "center");
      rangeLine6FG.style("border", true);

      sheet.cell(`G${row + 1}`).value("Horas por U/C");
      sheet.cell(`G${row + 1}`).style("horizontalAlignment", "center");
      sheet.cell(`G${row + 1}`).style("verticalAlignment", "center");
      sheet.cell(`G${row + 1}`).style("border", true);
      sheet.cell(`G${row + 1}`).style("wrapText", true);

      sheet.cell(`H${row + 1}`).value("Total de Horas");
      sheet.cell(`H${row + 1}`).style("horizontalAlignment", "center");
      sheet.cell(`H${row + 1}`).style("verticalAlignment", "center");
      sheet.cell(`H${row + 1}`).style("border", true);
      sheet.cell(`H${row + 1}`).style("wrapText", true);

      const rangeLine6HI = sheet.range(`I${row}:J${row}`);
      sheet.cell(`I${row}`).value(modality.isSemestral ? "" : "TRIMESTRE II");
      rangeLine6HI.merged(true);
      rangeLine6HI.style("horizontalAlignment", "center");
      rangeLine6HI.style("verticalAlignment", "center");
      rangeLine6HI.style("border", true);

      sheet.cell(`I${row + 1}`).value(modality.isSemestral ? "" : "Horas por U/C");
      sheet.cell(`I${row + 1}`).style("horizontalAlignment", "center");
      sheet.cell(`I${row + 1}`).style("verticalAlignment", "center");
      sheet.cell(`I${row + 1}`).style("border", true);
      sheet.cell(`I${row + 1}`).style("wrapText", true);

      sheet.cell(`J${row + 1}`).value(modality.isSemestral ? "" : "Total de Horas");
      sheet.cell(`J${row + 1}`).style("horizontalAlignment", "center");
      sheet.cell(`J${row + 1}`).style("verticalAlignment", "center");
      sheet.cell(`J${row + 1}`).style("border", true);
      sheet.cell(`J${row + 1}`).style("wrapText", true);

      const rangeLine6JK = sheet.range(`K${row}:L${row}`);
      sheet.cell(`K${row}`).value(modality.isSemestral ? "SEMESTRE II" : "TRIMESTRE III");
      rangeLine6JK.merged(true);
      rangeLine6JK.style("horizontalAlignment", "center");
      rangeLine6JK.style("verticalAlignment", "center");
      rangeLine6JK.style("border", true);

      sheet.cell(`K${row + 1}`).value("Horas por U/C");
      sheet.cell(`K${row + 1}`).style("horizontalAlignment", "center");
      sheet.cell(`K${row + 1}`).style("verticalAlignment", "center");
      sheet.cell(`K${row + 1}`).style("border", true);
      sheet.cell(`K${row + 1}`).style("wrapText", true);

      sheet.cell(`L${row + 1}`).value("Total de Horas");
      sheet.cell(`L${row + 1}`).style("horizontalAlignment", "center");
      sheet.cell(`L${row + 1}`).style("verticalAlignment", "center");
      sheet.cell(`L${row + 1}`).style("border", true);
      sheet.cell(`L${row + 1}`).style("wrapText", true);

      const rangeLine6H = sheet.range(`M${row}:M${row + 1}`);
      sheet.cell(`M${row}`).value("Dedicación");
      rangeLine6H.merged(true);
      rangeLine6H.style("horizontalAlignment", "center");
      rangeLine6H.style("verticalAlignment", "center");
      rangeLine6H.style("border", true);

      const rangeLine6I = sheet.range(`N${row}:N${row + 1}`);
      sheet.cell(`N${row}`).value("Observación");
      rangeLine6I.merged(true);
      rangeLine6I.style("horizontalAlignment", "center");
      rangeLine6I.style("verticalAlignment", "center");
      rangeLine6I.style("border", true);

      row++;
      row++;

      // datos de la tabla
      for (const [teacherIndex, teacher] of teachers.entries()) {
        const teacherHours = getTeacherHous(teacher.load, teacher.id);
        sheet.cell(`A${row}`).value(`${teacher.last_name || ""} ${teacher.name || ""}`.trim().toUpperCase());
        sheet.cell(`A${row}`).style("wrapText", true);
        const initRange = row;
        for (const [subjectIndex, subject] of teacher.load.entries()) {
          const teacherContractType =
            contracts.find((contract) => contract.id === teacher.contractTypes_id)?.contractType ||
            "Sin contrato";

          sheet.cell(`B${row}`).value(subject.subject);
          sheet
            .cell(`C${row}`)
            .value(subject?.pnf?.replace("P.N.F. en ", "").replace("P.N.F en ", "").toUpperCase());
          sheet.cell(`C${row}`).style("horizontalAlignment", "center");
          sheet.cell(`D${row}`).value(subject.trayectoName);
          sheet.cell(`D${row}`).style("horizontalAlignment", "center");
          sheet.cell(`E${row}`).value(`${subject.turnoName[0]}-0${subject.seccion}`);
          sheet.cell(`F${row}`).value(subject.turnoName);

          // Columna 1 (Q1 o Semestre I)
          subject?.quarter?.q1 === teacher.id
            ? sheet.cell(`G${row}`).value(subject?.hours?.q1 || 0)
            : sheet.cell(`G${row}`).value(0);
          sheet.cell(`G${row}`).style("horizontalAlignment", "center");
          subjectIndex === 0 && sheet.cell(`H${row}`).value(teacherHours.q1);
          sheet.cell(`H${row}`).style("horizontalAlignment", "center");

          // Columna 2 (Q2 - vacía para semestre)
          if (modality.isSemestral) {
            sheet.cell(`I${row}`).value("");
            sheet.cell(`J${row}`).value("");
          } else {
            subject?.quarter?.q2 === teacher.id
              ? sheet.cell(`I${row}`).value(subject?.hours?.q2 || 0)
              : sheet.cell(`I${row}`).value(0);
            subjectIndex === 0 && sheet.cell(`J${row}`).value(teacherHours.q2);
          }
          sheet.cell(`I${row}`).style("horizontalAlignment", "center");
          sheet.cell(`J${row}`).style("horizontalAlignment", "center");

          // Columna 3 (Q3 o Q2 para Semestre II)
          if (modality.isSemestral) {
            if (subject?.quarter?.q3 === teacher.id) {
              sheet.cell(`K${row}`).value(subject?.hours?.q3 || 0);
            } else if (subject?.quarter?.q2 === teacher.id) {
              sheet.cell(`K${row}`).value(subject?.hours?.q2 || 0);
            } else {
              sheet.cell(`K${row}`).value(0);
            }
          } else {
            subject?.quarter?.q3 === teacher.id
              ? sheet.cell(`K${row}`).value(subject?.hours?.q3 || 0)
              : sheet.cell(`K${row}`).value(0);
          }
          sheet.cell(`K${row}`).style("horizontalAlignment", "center");
          subjectIndex === 0 && sheet.cell(`L${row}`).value(teacherHours.q3);
          sheet.cell(`L${row}`).style("horizontalAlignment", "center");

          sheet.cell(`M${row}`).value(teacherContractType);

          // Agregar observación
          if (modality.isSemestral) {
            sheet.cell(`N${row}`).value("Semestral");
          }

          sheet.row(row).height(25);
          sheet.row(row).style("verticalAlignment", "center");
          row++;
        }
        const teacherCellRange = sheet.range(`A${initRange}:A${initRange + teacher.load.length - 1}`);
        teacher.load.length > 1 && teacherCellRange.merged(true);
        teacherCellRange.style("verticalAlignment", "center");

        const totalHourCellRangeI = sheet.range(`H${initRange}:H${initRange + teacher.load.length - 1}`);
        teacher.load.length > 1 && totalHourCellRangeI.merged(true);
        totalHourCellRangeI.style("horizontalAlignment", "center");
        totalHourCellRangeI.style("verticalAlignment", "center");

        const totalHourCellRangeII = sheet.range(`J${initRange}:J${initRange + teacher.load.length - 1}`);
        teacher.load.length > 1 && totalHourCellRangeII.merged(true);
        totalHourCellRangeII.style("horizontalAlignment", "center");
        totalHourCellRangeII.style("verticalAlignment", "center");

        const totalHourCellRangeIII = sheet.range(`L${initRange}:L${initRange + teacher.load.length - 1}`);
        teacher.load.length > 1 && totalHourCellRangeIII.merged(true);
        totalHourCellRangeIII.style("horizontalAlignment", "center");
        totalHourCellRangeIII.style("verticalAlignment", "center");

        const dedicationCellRange = sheet.range(`M${initRange}:M${initRange + teacher.load.length - 1}`);
        teacher.load.length > 1 && dedicationCellRange.merged(true);
        dedicationCellRange.style("horizontalAlignment", "center");
        dedicationCellRange.style("verticalAlignment", "center");

        const observationCellRange = sheet.range(`N${initRange}:N${initRange + teacher.load.length - 1}`);
        teacher.load.length > 1 && observationCellRange.merged(true);
        observationCellRange.style("horizontalAlignment", "center");
        observationCellRange.style("verticalAlignment", "center");

        sheet.range(`A${initRange}:N${row - 1}`).style("border", true);
      }
      // ajustar el ancho de las columnas
      sheet.column("A").width(50);
      sheet.column("B").width(50);
      sheet.column("C").width(18);
      sheet.column("D").width(18);
      sheet.column("M").width(25);
      sheet.column("N").width(18);

      // ajustar el alto a filas extra
      for (let i = 0; i < 50; i++) {
        sheet.row(row).height(25);
        row++;
      }
      pageNumber++;
    }
  }

  if (workbook.sheets().length > 1) {
    workbook.deleteSheet(0);
  }
  return {
    sheetNumber: pageNumber,
    workbook,
  };
}

function groupSubjectsByTeacher(subjects, targetPnfId, isSemestralMode) {
  const teachersMap = {};

  subjects.forEach((subject) => {
    const teacherData = subject.teacherData;
    if (teacherData) {
      const teacherId = teacherData.id;
      if (!teachersMap[teacherId]) {
        teachersMap[teacherId] = {
          ...teacherData,
          load: [],
        };
      }
      const subjectWithoutTeacherData = { ...subject };
      delete subjectWithoutTeacherData.teacherData;
      teachersMap[teacherId].load.push(subjectWithoutTeacherData);
    }
  });

  const teachersArray = Object.values(teachersMap);

  const cleanTeachersArray = teachersArray.map((teacher) => {
    // Filtrar por modalidad
    teacher.load = teacher.load.filter((item) => {
      const isSubjectSemestral = item.isSemestral === true;
      return isSubjectSemestral === isSemestralMode;
    });

    // Eliminar duplicados
    teacher.load = teacher.load.filter((item, index, self) => {
      const isDuplicate = self.findIndex((obj) => obj.innerId === item.innerId) < index;
      return !isDuplicate;
    });
    return teacher;
  });

  // Filtrar los profesores: Si es de otro PNF, solo incluir si tiene al menos una materia del PNF objetivo
  const qualifiedTeachers = cleanTeachersArray.filter(profesor => {
    if (profesor.load.length === 0) return false;
    if (profesor.PNF === targetPnfId) return true;
    return profesor.load.some(s => s.pnfId === targetPnfId);
  });

  return Object.values(qualifiedTeachers);
}

