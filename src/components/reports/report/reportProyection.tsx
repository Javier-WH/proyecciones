import { useState, useContext, useEffect, useRef } from "react";
import { Button, Modal, Select, Tag } from "antd";
import { FaWpforms, FaPrint } from "react-icons/fa";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import { Teacher } from "../../../interfaces/teacher";
import { useReactToPrint } from 'react-to-print';

interface SelectOption {
  label: string;
  value: string;
}

const trayectoOpt: SelectOption[] = [
  { label: "Trayecto 1", value: "1" },
  { label: "Trayecto 2", value: "2" },
  { label: "Trayecto 3", value: "3" },
];

const ReportProyection: React.FC = () => {
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

  // se filtra por trayecto
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

  // se filtra por pnf
  useEffect(() => {
    //se filtra que tengan carga academica
    const cleanTeachers = selectedQuarter?.filter((teacher) => teacher.load && teacher.load.length > 0);

    //se filtra por pnf
    const cleanData = cleanTeachers?.filter((teacher) => {
      const load = teacher.load || [];
      return load.some((subject) => subject.pnfId === selectedPnf);
    });
    setReportData(cleanData || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuarter, selectedPnf]);

  const iconStyle = { color: "white", fontSize: "2rem" };
  const border = "1px solid black";
  return (
    <>
      <Button type="link" shape="circle" icon={<FaWpforms />} onClick={showModal} style={iconStyle} />


      <Modal
        footer={null}
        getContainer={false}
        width="100vw"
        height="100vh"
        style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        title="Proyeciones"
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

            <Button disabled={!reportData || reportData.length === 0} type="link" shape="circle" icon={<FaPrint />} style={iconStyle} onClick={() => handlePrint()} />


          </div>
        </div>
        {/* tabla*/}

        <style>
          {`
              @media print {
                @page {
                  size: Letter;
                  margin: 1cm;
                  size: landscape; 
                }
                .header {
                  position: fixed;
                  top: 0;
                  left: 0;
                  right: 0;
                  text-align: center;
                  background: white;
                  z-index: 1000;
                  padding-bottom: 20px;
                  background-color: white !important;
                  width: 110%;
                  height: 90px;
           
                }
                .content {
                 
                }
                .page-break {
                  page-break-before: always;
                  margin-bottom: 100px !important;
                  background-color: red;
                  width: 100%;
                  height: 100px;
                }
                .teacher-row {
                  page-break-inside: avoid;
                }
              }
            `}
        </style>

        <div style={{ 
            width: "100%",
            height: "calc(100vh - 200px)",
            overflow: "auto" 
          }}>
          <div className="report" ref={componentRef} >
            <div className="header" style={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
              <h3>PERSONAL DOCENTE</h3>
              <h3>U.P.T. DE LOS LLANOS JUANA RAMIRÉZ, EXTENCIÓN ALTAGRACIA DE ORITUCO</h3>
              <h3>{pnfOptions?.find((pnf) => pnf.value === selectedPnf)?.label.toUpperCase()} TRIMESTRE {selectedTrayecto}</h3>
            </div>

            <div className="content" style={{ marginTop: "100px" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 3fr",
              }}>
                <span style={{ border: border, textAlign: "center", fontWeight: "bold" }}>Docente</span>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "3fr 3fr 1fr 1fr",
                  borderBottom: border,
                  borderTop: border,
                  borderRight: border
                }}>
                  <span style={{  textAlign: "center", fontWeight: "bold" }}>Unidad Curricular</span>
                  <span style={{ borderLeft: "1px solid black", textAlign: "center", fontWeight: "bold" }}>Trayecto</span>
                  <span style={{ borderLeft: "1px solid black", textAlign: "center", fontWeight: "bold" }}>Seccion</span>
                  <span style={{ borderLeft: "1px solid black", textAlign: "center", fontWeight: "bold" }}>Horas</span>
                </div>
              </div>
              {
                !reportData || reportData.length === 0
                  ? <Tag color="warning" >{`No hay docentes con carga academica`}</Tag>
                  : reportData.map((teacher: Teacher) => {
                    const rowHeight = 1.2; // en cm
                    // Altura total de las filas de load.map para este docente
                    const totalLoadHeight = (teacher.load?.length || 0) * rowHeight;
                    // Verificar si la altura acumulada supera el límite de la hoja (21.5cm para carta)
                    const pageHeight = 21.5;
                    const shouldBreak = totalLoadHeight > (pageHeight - rowHeight);

                    return <div className="teacher-row" key={teacher.id} style={{ display: "grid", gridTemplateColumns: "1fr 3fr" }}>
                      <div
                        style={{
                          borderRight: border,
                          borderBottom: border,
                          borderLeft: border,
                          display: "flex",
                          alignItems: "center",
                          height: `${totalLoadHeight}cm`,
                          paddingLeft: "10px",
                        }}
                      >
                        {`${teacher.lastName} ${teacher.name}`}
                      </div>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "3fr 3fr 1fr 1fr",
                      }}>
                        {
                          teacher.load?.map((subject) => {
                            return <>
                              <div style={{ height: `${rowHeight}cm`, paddingLeft: "10px", borderRight: border, borderBottom: border, display: "flex", alignItems: "center" }}>{subject.subject}</div>
                              <div style={{ height: `${rowHeight}cm`, paddingLeft: "10px", borderRight: border, borderBottom: border, display: "flex", alignItems: "center" }}>{subject.trayectoName}</div>
                              <div style={{ height: `${rowHeight}cm`, paddingLeft: "10px", borderRight: border, borderBottom: border, display: "flex", alignItems: "center" }}>{`${subject.trayectoName[0]}-${subject.seccion}`}</div>
                              <div style={{ height: `${rowHeight}cm`, paddingLeft: "10px", borderRight: border, borderBottom: border, display: "flex", alignItems: "center" }}>{subject.hours}</div>
                            </>
                          })
                        }
                      </div>

                      {/* Forzar salto de página después de cada docente si es necesario */}
                      {shouldBreak && <div className="page-break" />}</div>
                  })

              }
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ReportProyection;



/*
 <style>
        {`
          @media print {
            @page {
              size: landscape; 
              margin: 1cm; 
            }
            .report {
              width: 100 %;
              height: 100 %;
            }
          }
        `}
      </style>

*/
