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
  return (
    <>
      <Button type="link" shape="circle" icon={<FaWpforms />} onClick={showModal} style={iconStyle} />
     

      <Modal
        footer={null}
        getContainer={false}
        width="100vw"
        height="100vh"
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
            
            <Button disabled={!reportData || reportData.length === 0} type="link" shape="circle" icon={<FaPrint />} style={iconStyle} onClick={()=>handlePrint()} />
            

          </div>
        </div>
 {/* tabla*/}
          

        <div className="report" ref={componentRef} style={{ marginTop: "20px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "20px", flexDirection: "column" }}>
            <h3>PERSONAL DOCENTE</h3>
            <h3>U.P.T. DE LOS LLANOS JUANA RAMIRÉZ, EXTENCIÓN ALTAGRACIA DE ORITUCO</h3>
            <h3>{pnfOptions?.find((pnf) => pnf.value === selectedPnf)?.label.toUpperCase()} TRIMESTRE {selectedTrayecto}</h3>
          </div>

          <div style={{ border: "1px solid black", borderBottom: "none" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 3fr",
            }}>
              <span style={{ borderRight: "1px solid black", borderBottom: "1px solid black", textAlign: "center", fontWeight: "bold" }}>Docente</span>
              <div style={{
                display: "grid",
                gridTemplateColumns: "3fr 3fr 1fr 1fr", 
                borderBottom: "1px solid black",
              }}>
                <span style={{ borderRight: "1px solid black", textAlign: "center", fontWeight: "bold" }}>Unidad Curricular</span>
                <span style={{ borderRight: "1px solid black", textAlign: "center", fontWeight: "bold" }}>Trayecto</span>
                <span style={{ borderRight: "1px solid black", textAlign: "center", fontWeight: "bold" }}>Seccion</span>
                <span style={{ textAlign: "center", fontWeight: "bold" }}>Horas</span>
              </div>
            </div>
            {
              !reportData || reportData.length === 0
              ? <Tag color="warning" >{`No hay docentes con carga academica`}</Tag>
              :reportData.map((teacher: Teacher) => {
                
                return <div key={teacher.id} style={{ display: "grid", gridTemplateColumns: "1fr 3fr"}}>
                  <div
                  style={{
                    borderRight: "1px solid black",
                    display: "flex",
                    alignItems: "center",
                    borderBottom: "1px solid black",
                    height: (teacher.load?.length || 0) * 40,
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
                          <div style={{paddingLeft: "10px", borderRight: "1px solid black", borderBottom: "1px solid black", height: "100%", display: "flex", alignItems: "center" }}>{subject.subject}</div>
                          <div style={{paddingLeft: "10px", borderRight: "1px solid black", borderBottom: "1px solid black", height: "100%", display: "flex", alignItems: "center" }}>{subject.trayectoName}</div>
                          <div style={{paddingLeft: "10px", borderRight: "1px solid black", borderBottom: "1px solid black", height: "100%", display: "flex", alignItems: "center" }}>{`${subject.trayectoName[0]}-${subject.seccion}`}</div>
                          <div style={{ paddingLeft: "10px", borderBottom: "1px solid black", height: "100%", display: "flex", alignItems: "center" }}>{subject.hours}</div>
                        </>
                      })
                    }
                  </div>
                </div>
                
              })
            }
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
