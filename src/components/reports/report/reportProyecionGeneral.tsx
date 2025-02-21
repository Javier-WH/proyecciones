import React, { useState, useContext, useEffect, useRef, useMemo } from "react";
import { Button, Modal, Select } from "antd";
import { FaTable, FaPrint } from "react-icons/fa";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import { Teacher } from "../../../interfaces/teacher";
import { useReactToPrint } from "react-to-print";
import "./reportProyecion.css";

interface SelectOption {
  label: string;
  value: string;
}

interface SubjectData {
  teacherName: string;
  teacherLastName: string;
  teacherCi: string;
  teacherContractType: string;
  subject: string;
  trayectoName: string;
  seccion: string;
  hours: string;
  quarter: number[];
  turnoName: string;
}

const ReportProyectionGeneral: React.FC = () => {
  const { pnfList, teachers } = useContext(MainContext) as MainContextValues;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pnfOptions, setPnfOptions] = useState<SelectOption[]>();
  const [selectedPnf, setSelectedPnf] = useState<string>("");
  const [reportData, setReportData] = useState<Teacher[] | null>(null);

  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: "Reporte de proyecciones",
  });

  useEffect(() => {
    const cleanTeachers = teachers ? [
      ...(teachers.q1 || []),
      ...(teachers.q2 || []),
      ...(teachers.q3 || [])
    ].filter(teacher => teacher.load && teacher.load.length > 0) : [];
    
    const cleanData = cleanTeachers.filter((teacher) => {
      const load = teacher.load || [];
      return load.some((subject) => subject.pnfId === selectedPnf);
    })
  



    setReportData(cleanData);
  }, [teachers, selectedPnf]);


  const groupedData = useMemo(() => {
    if (!reportData) return [];
    const teacherMap = new Map<string, SubjectData[]>();

    reportData.forEach((teacher) => {
      teacher.load?.forEach((subject) => {
        const entry = {
          teacherName: teacher.name,
          teacherLastName: teacher.lastName,
          teacherCi: teacher.ci,
          teacherContractType: teacher.type,
          subject: subject.subject,
          trayectoName: subject.trayectoName,
          seccion: subject.seccion,
          hours: subject.hours.toString(),
          quarter: subject.quarter,
          turnoName: subject.turnoName,
        };

        if (teacherMap.has(teacher.name)) {
          teacherMap.get(teacher.name)?.push(entry);
        } else {
          teacherMap.set(teacher.name, [entry]);
        }
      });
    });

    // Convertir el Map a array y ordenar por cantidad de materias
    return Array.from(teacherMap)
      .sort((a, b) => a[1].length - b[1].length) // Orden ascendente por cantidad de materias
      .map(([name, subjects]) => ({
        name,
        lastName: subjects[0]?.teacherLastName,
        ci: subjects[0]?.teacherCi,
        contractType: subjects[0]?.teacherContractType,
        subjects,
      }));
  }, [reportData]);

  const chunks = useMemo(() => {
    const sheetWidth = 21.59;
    const rowHeight = 1;
    const rowCount = Math.floor(sheetWidth / rowHeight);

    const result: SubjectData[][] = [];
    let currentChunk: SubjectData[] = [];
    let currentCount = 0;
    let teacherSubjects: SubjectData[] = [];

    const addTeacherToChunk = () => {
      if (teacherSubjects.length === 0) return;

      if (currentCount + teacherSubjects.length > rowCount) {
        result.push(currentChunk);
        currentChunk = [];
        currentCount = 0;
      }

      currentChunk = currentChunk.concat(teacherSubjects);
      currentCount += teacherSubjects.length;
      teacherSubjects = [];
    };

    groupedData.forEach((teacherGroup) => {
      teacherSubjects = teacherGroup.subjects;

      if (teacherSubjects.length > rowCount) {
        if (currentCount > 0) {
          result.push(currentChunk);
          currentChunk = [];
          currentCount = 0;
        }

        for (let i = 0; i < teacherSubjects.length; i += rowCount) {
          result.push(teacherSubjects.slice(i, i + rowCount));
        }
        teacherSubjects = [];
      } else {
        addTeacherToChunk();
      }
    });

    if (currentChunk.length > 0) result.push(currentChunk);
    if (teacherSubjects.length > 0) result.push(teacherSubjects);

    return result;
  }, [groupedData]);

  useEffect(() => {
    if (!pnfList) return;
    setPnfOptions(pnfList.map((pnf) => ({ label: pnf.name, value: pnf.id.toString() })));
  }, [pnfList]);



  const iconStyle = { color: "white", fontSize: "2rem" };

  return (
    <>
      <Button type="link" shape="circle" icon={<FaTable />} onClick={() => setIsModalOpen(true)} style={iconStyle}>
        <span style={{ fontSize: "12px" }}>Reporte proyecciones por programa</span>
      </Button>

      <Modal
        footer={null}
        getContainer={false}
        width="100vw"
        height="100vh"
        style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        title="Reporte proyecciones por programa"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
      >
        <div>
          <div style={{
            backgroundColor: "#001529",
            height: "70px",
            display: "flex",
            justifyContent: "space-evenly",
            alignItems: "center",
            padding: "10px",
            borderRadius: "10px",
          }}>
            <div style={{ width: "100%", maxWidth: "400px" }}>
              <span style={{ color: "white" }}>Programa</span>
              <Select style={{ width: "100%" }} onChange={(value) => setSelectedPnf(value)} options={pnfOptions} />
            </div>

            <Button
              
              type="link"
              shape="circle"
              icon={<FaPrint />}
              style={iconStyle}
              onClick={() => handlePrint()}
            />
          </div>
        </div>

        <div style={{ width: "100%", height: "calc(100vh - 200px)", overflow: "auto" }}>
          <div className="report" ref={componentRef}>
            {chunks.map((chunk, chunkIndex) => {
              const teachersInChunk = groupChunkByTeacher(chunk);

              return (
                <div key={chunkIndex} className={chunkIndex > 0 ? "page-break" : ""}>
                  <Header
                    selectedPnf={pnfOptions?.find((p) => p.value === selectedPnf)?.label}
                    page={chunkIndex}
                  />

                  <table style={{ width: "100%", marginBottom: "20px" }}>
                    <HeadRow />
                    <tbody>
                      {teachersInChunk.map((teacherGroup, groupIndex) => {
                        const totals = {
                          q1: teacherGroup.subjects.reduce((acc, subject) =>
                            subject.quarter.includes(1) ? acc + Number(subject.hours) : acc, 0),
                          q2: teacherGroup.subjects.reduce((acc, subject) =>
                            subject.quarter.includes(2) ? acc + Number(subject.hours) : acc, 0),
                          q3: teacherGroup.subjects.reduce((acc, subject) =>
                            subject.quarter.includes(3) ? acc + Number(subject.hours) : acc, 0),
                        };

                        return teacherGroup.subjects.map((subject, subjectIndex) => (
                          <tr key={`${groupIndex}-${subjectIndex}`}>
                            {subjectIndex === 0 && (
                              <>
                                <td rowSpan={teacherGroup.subjects.length}>
                                  {`${teacherGroup.lastName} ${teacherGroup.name}`}
                                </td>
                                <td rowSpan={teacherGroup.subjects.length}>{subject.teacherCi}</td>
                              </>
                            )}
                            <td>{subject.subject}</td>
                            <td style={{ textAlign: "center" }}>{subject.trayectoName}</td>
                            <td style={{ textAlign: "center" }}>{`${subject.turnoName[0]}-0${subject.seccion}`}</td>

                            <td style={{ textAlign: "center" }}>
                              {subject.quarter.includes(1) ? subject.hours : 0}
                            </td>
                            {subjectIndex === 0 && (
                              <td rowSpan={teacherGroup.subjects.length} style={{ textAlign: "center" }}>{totals.q1}</td>
                            )}

                            <td style={{ textAlign: "center" }}>
                              {subject.quarter.includes (2) ? subject.hours : 0}
                            </td>
                            {subjectIndex === 0 && (
                              <td rowSpan={teacherGroup.subjects.length} style={{ textAlign: "center" }}>{totals.q2}</td>
                            )}
                            <td style={{ textAlign: "center" }}>
                              {subject.quarter.includes(3) ? subject.hours : 0}
                            </td>
                            {subjectIndex === 0 && (
                              <td rowSpan={teacherGroup.subjects.length} style={{ textAlign: "center" }}>{totals.q3}</td>
                            )}
                            {subjectIndex === 0 && (
                              <>
                                <td rowSpan={teacherGroup.subjects.length} style={{ textAlign: "center" }}>
                                  {teacherGroup.contractType}
                                </td>
                                <td rowSpan={teacherGroup.subjects.length}>{/* Observaciones */}</td>
                              </>
                            )}
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </>
  );
};

function Header({ selectedPnf, page }: { selectedPnf?: string; page: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
      <h3>PERSONAL DOCENTE</h3>
      <h3>{selectedPnf?.toUpperCase()}</h3>
      <h3>U.P.T. DE LOS LLANOS JUANA RAMÍREZ, EXTENCIÓN ALTAGRACIA DE ORITUCO</h3>
      <h3>CARGA ACADÉMICA TRIMESTRE I-II-III</h3>
      <h5>Pagina: {page + 1}</h5>
    </div>
  );
}

function HeadRow() {
  return (<>
    <tr>
      <th rowSpan={2} style={{ textAlign: "center" }}>Nombre</th>
      <th rowSpan={2} style={{ textAlign: "center" }}>C.I.</th>
      <th rowSpan={2} style={{ textAlign: "center" }}>Unidad Curricular</th>
      <th rowSpan={2} style={{ textAlign: "center" }}>Trayecto</th>
      <th rowSpan={2} style={{ textAlign: "center" }}>Sección</th>
      <th colSpan={2} style ={{ textAlign: "center", fontSize: "12px" }}>Trimestre I</th>
      <th colSpan={2} style={{ textAlign: "center", fontSize: "12px" }}>Trimestre II</th>
      <th colSpan={2} style={{ textAlign: "center", fontSize: "12px" }}>Trimestre III</th>
      <th rowSpan={2} style={{ textAlign: "center" }}>Tipo de Contrato</th>
      <th rowSpan={2} style={{ textAlign: "center" }}>Observación</th>
    </tr>
    
    <tr>
      <th>Horas</th>
      <th>Total</th>
      <th>Horas</th>
      <th>Total</th>
      <th>Horas</th>
      <th>Total</th>
    </tr>
  </>
  );
}

function groupChunkByTeacher(chunk: SubjectData[]) {
  const teacherMap = new Map<string, {
    name: string;
    lastName: string;
    ci: string;
    contractType: string;
    subjects: SubjectData[];
  }>();

  const uniqueSubjects = new Set<string>();

  chunk.forEach((subject) => {
    // Generar una clave única que incluya todos los campos relevantes de la materia
    const subjectKey = [
      subject.teacherCi,
      subject.subject,
      subject.quarter.join(','),
      subject.seccion,
      subject.hours,
      subject.trayectoName,
      subject.turnoName
    ].join('-');

    if (!uniqueSubjects.has(subjectKey)) {
      uniqueSubjects.add(subjectKey);

      const teacherKey = subject.teacherCi; // Usar teacherCi como clave única del profesor

      if (teacherMap.has(teacherKey)) {
        teacherMap.get(teacherKey)?.subjects.push(subject);
      } else {
        teacherMap.set(teacherKey, {
          name: subject.teacherName,
          lastName: subject.teacherLastName,
          ci: subject.teacherCi,
          contractType: subject.teacherContractType,
          subjects: [subject],
        });
      }
    }
  });

  return Array.from(teacherMap.values()).sort(
    (a, b) => a.subjects.length - b.subjects.length
  );
}

export default ReportProyectionGeneral;