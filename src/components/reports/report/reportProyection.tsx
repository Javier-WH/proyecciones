import React, { useState, useContext, useEffect, useRef, useMemo } from "react";
import { Button, Modal, Select } from "antd";
import { FaWpforms, FaPrint } from "react-icons/fa";
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
  turnoName: string;
}

const trayectoOpt: SelectOption[] = [
  { label: "Trimestre 1", value: "1" },
  { label: "Trimestre 2", value: "2" },
  { label: "Trimestre 3", value: "3" },
];

const ReportProyection: React.FC = () => {
  const rowHeight = 1.3; // Altura de la fila en centímetros
  const { pnfList, teachers } = useContext(MainContext) as MainContextValues;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pnfOptions, setPnfOptions] = useState<SelectOption[]>();
  const [trayectoOptions] = useState<SelectOption[]>(trayectoOpt);
  const [selectedTrayecto, setSelectedTrayecto] = useState<string>();
  const [selectedPnf, setSelectedPnf] = useState<string>("");
  const [selectedQuarter, setSelectedQuarter] = useState<Teacher[] | null>(null);
  const [reportData, setReportData] = useState<Teacher[] | null>(null);

  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: "Reporte de proyecciones",
  });

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
          turnoName: subject.turnoName,
        };

        if (teacherMap.has(teacher.name)) {
          teacherMap.get(teacher.name)?.push(entry);
        } else {
          teacherMap.set(teacher.name, [entry]);
        }
      });
    });

    return Array.from(teacherMap, ([name, subjects]) => ({
      name,
      lastName: subjects[0]?.teacherLastName,
      ci: subjects[0]?.teacherCi,
      contractType: subjects[0]?.teacherContractType,
      subjects,
    }));
  }, [reportData]);

  const chunks = useMemo(() => {
    const sheetWidth = 21.59; // Ancho de la hoja en centímetros (horizontal)
    //const rowHeight = 1.3; // Altura de la fila en centímetros
    const rowCount = Math.floor(sheetWidth / rowHeight); // Calcula filas por página

    const result: SubjectData[][] = [];
    let currentChunk: SubjectData[] = [];
    let currentCount = 0;
    let teacherSubjects: SubjectData[] = [];

    const addTeacherToChunk = () => {
      if (teacherSubjects.length === 0) return;

      // Verificar espacio disponible en chunk actual
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

      // Manejar profesores que exceden el tamaño de una página
      if (teacherSubjects.length > rowCount) {
        if (currentCount > 0) {
          result.push(currentChunk);
          currentChunk = [];
          currentCount = 0;
        }

        // Dividir en chunks del tamaño máximo
        for (let i = 0; i < teacherSubjects.length; i += rowCount) {
          result.push(teacherSubjects.slice(i, i + rowCount));
        }
        teacherSubjects = [];
      } else {
        addTeacherToChunk();
      }
    });

    // Agregar elementos restantes
    if (currentChunk.length > 0) result.push(currentChunk);
    if (teacherSubjects.length > 0) result.push(teacherSubjects);

    return result;
  }, [groupedData]);

  const groupChunkByTeacher = (chunk: SubjectData[]) => {
    const teacherMap = new Map<
      string,
      {
        name: string;
        lastName: string;
        ci: string;
        contractType: string;
        subjects: SubjectData[];
        turnoName: string;
      }
    >();

    chunk.forEach((subject) => {
      if (teacherMap.has(subject.teacherName)) {
        teacherMap.get(subject.teacherName)?.subjects.push(subject);
      } else {
        teacherMap.set(subject.teacherName, {
          name: subject.teacherName,
          lastName: subject.teacherLastName,
          ci: subject.teacherCi,
          contractType: subject.teacherContractType,
          subjects: [subject],
          turnoName: subject.turnoName,
        });
      }
    });

    return Array.from(teacherMap.values());
  };

  useEffect(() => {
    if (!pnfList) return;
    setPnfOptions(pnfList.map((pnf) => ({ label: pnf.name, value: pnf.id.toString() })));
  }, [pnfList]);

  const showModal = () => {

    setIsModalOpen(true);
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const onChageTrayecto = (value: string) => {
    setSelectedTrayecto(value);
  };
  const onChangePnf = (value: string) => {
    setSelectedPnf(value);
    setSelectedTrayecto(trayectoOpt[0].value);
  };

  // Filtrar por trayecto
  useEffect(() => {
    if (selectedTrayecto === "2") {
      setSelectedQuarter(teachers?.q2 || null);
      return;
    }
    if (selectedTrayecto === "3") {
      setSelectedQuarter(teachers?.q3 || null);
      return;
    }
    setSelectedQuarter(teachers?.q1 || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrayecto]);

  // Filtrar por pnf
  useEffect(() => {
    const cleanTeachers = selectedQuarter?.filter((teacher) => teacher.load && teacher.load.length > 0);
    const cleanData = cleanTeachers?.filter((teacher) => {
      const load = teacher.load || [];
      return load.some((subject) => subject.pnfId === selectedPnf);
    });
    setReportData(cleanData || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuarter, selectedPnf]);

  const iconStyle = { color: "white", fontSize: "2rem" };

  return (
    <>
      <Button type="link" shape="circle" icon={<FaWpforms />} onClick={showModal} style={iconStyle}>
        <span style={{ fontSize: "12px" }}>Por trimestre</span>
      </Button>

      <Modal
        footer={null}
        getContainer={false}
        width="100vw"
        height="100vh"
        style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        title="Proyecciones"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}>
        <div>
          <div
            style={{
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
              <Select style={{ width: "100%" }} onChange={onChangePnf} options={pnfOptions} />
            </div>

            <div style={{ width: "100%", maxWidth: "400px" }}>
              <span style={{ color: "white" }}>Trayecto</span>
              <Select
                style={{ width: "100%" }}
                onChange={onChageTrayecto}
                value={selectedTrayecto}
                options={trayectoOptions}
              />
            </div>

            <Button
              disabled={!reportData || reportData.length === 0}
              type="link"
              shape="circle"
              icon={<FaPrint />}
              style={iconStyle}
              onClick={() => handlePrint()}
            />
          </div>
        </div>

        {/* Tabla */}

        <div
          style={{
            width: "100%",
            height: "calc(100vh - 200px)",
            overflow: "auto",
          }}>
          <div className="report" ref={componentRef}>
            {chunks.map((chunk, chunkIndex) => {
              const teachersInChunk = groupChunkByTeacher(chunk);

              return (
                <div key={chunkIndex} className={chunkIndex > 0 ? "page-break" : ""}>
                  <Header
                    selectedPnf={pnfOptions?.find((p) => p.value === selectedPnf)?.label}
                    selectedTrayecto={trayectoOptions.find((t) => t.value === selectedTrayecto)?.label}
                    page={chunkIndex}
                  />

                  <table style={{ width: "100%", marginBottom: "20px" }}>
                    <HeadRow />
                    <tbody>
                      {teachersInChunk.map((teacherGroup, groupIndex) =>
                        teacherGroup.subjects.map((subject, subjectIndex) => (
                          <tr key={`${groupIndex}-${subjectIndex}`}>
                            {subjectIndex === 0 && (
                              <>
                                <td rowSpan={teacherGroup.subjects.length}>
                                  {`${teacherGroup.lastName} ${teacherGroup.name}`}
                                </td>
                                <td rowSpan={teacherGroup.subjects.length}>{subject.teacherCi}</td>
                              </>
                            )}
                            <td style={{ maxHeight: `${rowHeight}cm` }}>{subject.subject}</td>
                            <td style={{ maxHeight: `${rowHeight}cm`, textAlign: "center" }}>
                              {subject.trayectoName}
                            </td>
                            <td style={{ maxHeight: `${rowHeight}cm`, textAlign: "center" }}>
                              {`${subject.turnoName[0]}-0${subject.seccion}`}
                            </td>
                            <td style={{ maxHeight: `${rowHeight}cm`, textAlign: "center" }}>
                              {subject.hours}
                            </td>
                            {subjectIndex === 0 && (
                              <>
                                <td rowSpan={teacherGroup.subjects.length} style={{ textAlign: "center" }}>
                                  {teacherGroup.subjects.reduce(
                                    (total, subject) => Number(total) + Number(subject.hours),
                                    0
                                  )}
                                </td>
                                <td rowSpan={teacherGroup.subjects.length} style={{ textAlign: "center" }}>
                                  {teacherGroup.contractType}
                                </td>
                                <td rowSpan={teacherGroup.subjects.length}>
                                  {/* Espacio para observaciones */}
                                </td>
                              </>
                            )}
                          </tr>
                        ))
                      )}
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

export default ReportProyection;

interface HeaderProps {
  selectedPnf?: string;
  selectedTrayecto?: string;
  page: number;
}

function Header({ selectedPnf, selectedTrayecto, page }: HeaderProps) {
  return (
    <div
      className="header"
      style={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
      <h3>PERSONAL DOCENTE</h3>
      <h3>U.P.T. DE LOS LLANOS JUANA RAMÍREZ, EXTENCIÓN ALTAGRACIA DE ORITUCO</h3>
      <h3>
        {selectedPnf?.toUpperCase()} - {selectedTrayecto}
      </h3>
      <h5>Pagina: {page + 1}</h5>
    </div>
  );
}

function HeadRow() {
  return (
    <tr>
      <th>Nombre</th>
      <th>C.I.</th>
      <th>Unidad Curricular</th>
      <th>Trayecto</th>
      <th>Sección</th>
      <th>Horas</th>
      <th>Total Horas</th>
      <th>Tipo de Contrato</th>
      <th>Observación</th>
    </tr>
  );
}

