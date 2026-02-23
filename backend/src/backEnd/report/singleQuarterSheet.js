/* eslint-disable no-unused-vars */
import { getTeacherHous } from "./utils.js";
export default function generateSingleQuarterSheet({
  sheetNumber,
  workbook,
  pnfArray,
  proyectionDate,
  contracts,
}) {
  let pageNumber = Number.parseInt(sheetNumber);

  for (const pnf of pnfArray) {
    for (let quarter = 1; quarter <= 3; quarter++) {
      const teachers = groupSubjectsByTeacher(pnf, quarter);
      const sheetName = `${pnf[0].pnf} T-${quarter}`
        .replace("P.N.F. en ", "")
        .replace("P.N.F en ", "")
        .toUpperCase();
      const sheet = workbook.addSheet(sheetName);

      let row = 1;
      // encabezado

      const rangeLine1 = sheet.range(`A${row}:J${row}`);
      sheet.cell(`A${row}`).value("PERSONAL DOCENTE");
      rangeLine1.merged(true);
      rangeLine1.style("horizontalAlignment", "center");
      rangeLine1.style("verticalAlignment", "center");
      row++;

      const rangeLine2 = sheet.range(`A${row}:J${row}`);
      sheet.cell(`A${row}`).value(`${pnf[0].pnf}`.toUpperCase());
      rangeLine2.merged(true);
      rangeLine2.style("horizontalAlignment", "center");
      rangeLine2.style("verticalAlignment", "center");
      row++;

      const rangeLine3 = sheet.range(`A${row}:J${row}`);
      sheet.cell(`A${row}`).value("U.P.T. DE LOS LLANOS JUANA RAMIREZ, EXTENSIÓN ALTAGRACIA DE ORITUCO");
      rangeLine3.merged(true);
      rangeLine3.style("horizontalAlignment", "center");
      rangeLine3.style("verticalAlignment", "center");
      row++;

      const rangeLine4 = sheet.range(`A${row}:J${row}`);
      sheet.cell(`A${row}`).value(`CARGA ACADÉMICA ${getQuaterName(quarter)}`);
      rangeLine4.merged(true);
      rangeLine4.style("horizontalAlignment", "center");
      rangeLine4.style("verticalAlignment", "center");
      row++;

      const rangeLine5 = sheet.range(`A${row}:J${row}`);
      sheet.cell(`A${row}`).value(proyectionDate);
      rangeLine5.merged(true);
      rangeLine5.style("horizontalAlignment", "center");
      rangeLine5.style("verticalAlignment", "center");
      row++;
      row++;

      // encabezado de la tabla
      const boldHeaderRange = sheet.range(`A${row}:J${row + 1}`);
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
      sheet.cell(`G${row}`).value(getQuaterName(quarter));
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

      const rangeLine6H = sheet.range(`I${row}:I${row + 1}`);
      sheet.cell(`I${row}`).value("Dedicación");
      rangeLine6H.merged(true);
      rangeLine6H.style("horizontalAlignment", "center");
      rangeLine6H.style("verticalAlignment", "center");
      rangeLine6H.style("border", true);

      const rangeLine6I = sheet.range(`J${row}:J${row + 1}`);
      sheet.cell(`J${row}`).value("Observación");
      rangeLine6I.merged(true);
      rangeLine6I.style("horizontalAlignment", "center");
      rangeLine6I.style("verticalAlignment", "center");
      rangeLine6I.style("border", true);

      row++;
      row++;

      // datos de la tabla
      for (const [teacherIndex, teacher] of teachers.entries()) {
        if (teacher.load.length === 0) continue;
        const teacherHours = getTeacherHous(teacher.load, teacher.id);

        const fullName = `${teacher.last_name || ""} ${teacher.name || ""}`.trim().toUpperCase();
        sheet.cell(`A${row}`).value(fullName);
        sheet.cell(`A${row}`).style("wrapText", true);
        const initRange = row;
        for (const [subjectIndex, subject] of teacher.load.entries()) {
          // Para semestrales: en Q1 usar horas de q1, en Q3 usar horas de q3
          let UCHours;
          if (subject.isSemestral) {
            UCHours = quarter === 3 ? (subject.hours.q3 || 0) : (subject.hours.q1 || subject.hours.q2 || 0);
          } else {
            UCHours = subject.hours[`q${quarter}`] || 0;
          }

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
          sheet.cell(`G${row}`).value(UCHours);
          sheet.cell(`G${row}`).style("horizontalAlignment", "center");
          subjectIndex === 0 && sheet.cell(`H${row}`).value(teacherHours[`q${quarter}`]);
          sheet.cell(`H${row}`).style("horizontalAlignment", "center");
          sheet.cell(`I${row}`).value(teacherContractType);
          // Agregar observación para materias semestrales
          if (subject.isSemestral) {
            sheet.cell(`J${row}`).value(quarter === 1 ? "Semestre I" : "Semestre II");
          }
          sheet.row(row).height(25);
          sheet.row(row).style("verticalAlignment", "center");
          row++;
        }
        const teacherCellRange = sheet.range(`A${initRange}:A${initRange + teacher.load.length - 1}`);
        teacher.load.length > 1 && teacherCellRange.merged(true);
        teacherCellRange.style("verticalAlignment", "center");

        const totalHourCellRange = sheet.range(`H${initRange}:H${initRange + teacher.load.length - 1}`);
        teacher.load.length > 1 && totalHourCellRange.merged(true);
        totalHourCellRange.style("horizontalAlignment", "center");
        totalHourCellRange.style("verticalAlignment", "center");

        const dedicationCellRange = sheet.range(`I${initRange}:I${initRange + teacher.load.length - 1}`);
        teacher.load.length > 1 && dedicationCellRange.merged(true);
        dedicationCellRange.style("horizontalAlignment", "center");
        dedicationCellRange.style("verticalAlignment", "center");

        const observationCellRange = sheet.range(`J${initRange}:J${initRange + teacher.load.length - 1}`);
        teacher.load.length > 1 && observationCellRange.merged(true);
        observationCellRange.style("horizontalAlignment", "center");
        observationCellRange.style("verticalAlignment", "center");

        sheet.range(`A${initRange}:J${row - 1}`).style("border", true);
      }
      // ajustar el ancho de las columnas
      sheet.column("A").width(50);
      sheet.column("B").width(50);
      sheet.column("C").width(18);
      sheet.column("D").width(18);
      sheet.column("I").width(25);
      sheet.column("J").width(18);

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

function getQuaterName(number) {
  switch (number) {
    case 1:
      return "TRIMESTRE I";
    case 2:
      return "TRIMESTRE II";
    case 3:
      return "TRIMESTRE III";
    default:
      return "DESCONOCIDO";
  }
}

function groupSubjectsByTeacher(subjects, quarter) {
  const teachersMap = {};

  subjects.forEach((subject) => {
    const teacherData = subject.teacherData;

    if (teacherData) {
      const teacherId = teacherData.id;

      // Si el profesor no está en el mapa, agregarlo
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
    teacher.load = teacher.load.filter((item, index, self) => {
      const isDuplicate = self.findIndex((obj) => obj.innerId === item.innerId) < index;
      return !isDuplicate;
    });
    return teacher;
  });

  const filteredSubjectsByQuarter = cleanTeachersArray.map((profesor) => {
    const load = profesor.load;
    const filteredLoad = load.filter((subject) => {
      // Para materias semestrales: Q1+Q2 = Semestre 1, Q3 = Semestre 2
      // Excluir semestrales del trimestre 2 (ya se muestran en trimestre 1 como Semestre 1)
      if (subject.isSemestral && quarter === 2) {
        return false
      }

      const isAssignedToThisProfessor = subject.quarter?.[`q${quarter}`] === profesor.id
      // A subject is unassigned for this quarter if:
      // 1. We are processing the 'UNASIGNED' list
      // 2. The subject has no teacher assigned for this quarter (!subject.quarter.qN)
      // 3. The subject DOES exist in this quarter (it has hours defined: subject.hours.qN)
      const hasHoursForQuarter = subject.hours && subject.hours[`q${quarter}`]
      const isUnassigned = profesor.id === 'UNASIGNED' && !subject.quarter?.[`q${quarter}`] && hasHoursForQuarter
      return isAssignedToThisProfessor || isUnassigned
    })
    profesor.load = filteredLoad;
    return profesor;
  });

  return Object.values(filteredSubjectsByQuarter);
}

