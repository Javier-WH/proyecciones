/* eslint-disable @typescript-eslint/no-explicit-any */
import "./proyeccionesSubjects.css";
import { useContext, useEffect, useState } from "react";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { Button, Divider, message, Modal, Select } from "antd";
import TablePensum from "./table/table";
import { GiAutoRepair } from "react-icons/gi";
import { useNavigate } from "react-router-dom";
import { InlineHours, InlineQuarter, Subject } from "../../interfaces/subject";
import { normalizeText } from "../../utils/textFilter";
import getPensum from "../../fetch/getPensum";
import { Forbidden } from "../../utils/messageComponents";
import { v4 as uuidv4 } from "uuid";

interface SelectOption {
  value: string;
  label: string;
}

export default function ProyeccionesSubjects() {
  const { subjects, proyectionsDone, handleSubjectChange, userData, userPNF } = useContext(
    MainContext
  ) as MainContextValues;
  const navigate = useNavigate();
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [pnfOptions, setPnfOptions] = useState<SelectOption[]>([]);
  const [selectedPnf, setSelectedPnf] = useState<string | undefined>(undefined);
  const [subjectOptions, setSubjectOptions] = useState<SelectOption[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>(undefined);
  const [trayectoOptions, setTrayectoOptions] = useState<SelectOption[]>([]);
  const [selectedTrayecto, setSelectedTrayecto] = useState<string | undefined>(undefined);
  const [turnoOptions, setTurnoOptions] = useState<SelectOption[]>([]);
  const [selectedTurno, setSelectedTurno] = useState<string | undefined>(undefined);
  const [seccionOptions, setSeccionOptions] = useState<SelectOption[]>([]);
  const [selectedSeccion, setSelectedSeccion] = useState<string | undefined>(undefined);
  const [selectedModalPnf, setSelectedModalPnf] = useState<string | undefined>(undefined);
  const [selectedModalTrayecto, setSelectedModalTrayecto] = useState<string | undefined>(undefined);
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [modalPensumList, setModalPensumList] = useState<Subject[]>([]);
  const [aviableModalSubjects, setAviableModalSubjects] = useState<Subject[]>([]);
  const [modalSelectedSubject, setModalSelectedSubject] = useState<Subject | null>(null);
  const [seccionExist, setSeccionExist] = useState<boolean>(false);

  const showAddSubjectModal = () => {
    setIsAddSubjectModalOpen(true);
  };

  const handleOkSubjectModal = () => {
    if (
      !subjects ||
      !modalSelectedSubject ||
      !selectedSeccion ||
      !selectedTurno ||
      !selectedModalPnf ||
      !selectedModalTrayecto
    ) {
      return;
    }

    const subjectCopy = JSON.parse(JSON.stringify(subjects));
    subjectCopy.push(modalSelectedSubject);

    message.success(`Materia ${modalSelectedSubject.subject} agregada correctamente al pensum`);
    handleSubjectChange(subjectCopy);
    handleCancelSubjectModal();
  };

  const handleCancelSubjectModal = () => {
    setModalSelectedSubject(null);
    setAviableModalSubjects([]);
    setSelectedModalPnf(undefined);
    setSelectedModalTrayecto(undefined);
    setSelectedTurno(undefined);
    setSelectedSeccion(undefined);
    setModalSelectedSubject(null);
    setIsAddSubjectModalOpen(false);
  };

  ///
  useEffect(() => {
    if (!subjects) return;
    setModalSelectedSubject(null);
    // opciones para el select de PNF
    const uniquePnf = subjects?.filter(
      (subject, index, self) => index === self.findIndex((s) => s.pnfId === subject.pnfId)
    );

    const pnfList = uniquePnf?.map((subject) => {
      return {
        value: subject.pnfId,
        label: subject.pnf,
      };
    });
    setPnfOptions(pnfList as SelectOption[]);

    // opcones para el select de materias
    const uniqueSubject = subjects?.filter(
      (subject, index, self) => index === self.findIndex((s) => s.subject === subject.subject)
    );

    const subjectList = uniqueSubject?.map((subject) => {
      return {
        value: subject.subject,
        label: subject.subject,
      };
    });
    setSubjectOptions(subjectList as SelectOption[]);

    // opciones para el select de trayectos
    const uniqueTrayecto = subjects?.filter(
      (subject, index, self) => index === self.findIndex((s) => s.trayectoId === subject.trayectoId)
    );
    const trayectoList = uniqueTrayecto?.map((subject) => {
      return {
        value: subject.trayectoId,
        label: subject.trayectoName,
      };
    });
    setTrayectoOptions(trayectoList as SelectOption[]);

    // opciones para el select de turnos
    const uniqueTurno = subjects?.filter(
      (subject, index, self) => index === self.findIndex((s) => s.turnoName === subject.turnoName)
    );

    const turnoList = uniqueTurno?.map((subject) => {
      return {
        value: subject.turnoName,
        label: subject.turnoName,
      };
    });
    setTurnoOptions(turnoList as SelectOption[]);

    const uniqueSeccion = subjects?.filter(
      (subject, index, self) => index === self.findIndex((s) => s.seccion === subject.seccion)
    );

    const seccionList = uniqueSeccion?.map((subject) => {
      return {
        value: subject.seccion,
        label: subject.seccion,
      };
    });
    setSeccionOptions(seccionList as SelectOption[]);

    // lista de materias
    setFilteredSubjects(subjects);
  }, [subjects]);

  useEffect(() => {
    if (!subjects) return;
    setModalSelectedSubject(null);
    let filteredSubjectsCopy = [...subjects];

    if (!userData?.su) {
      filteredSubjectsCopy = filteredSubjectsCopy?.filter((subject) => subject.pnfId === userPNF);
    }

    // filtrdo por pnf
    if (selectedPnf) {
      filteredSubjectsCopy = filteredSubjectsCopy?.filter((subject) => subject.pnfId === selectedPnf);
    }

    // filtrado por materia
    if (selectedSubject) {
      filteredSubjectsCopy = filteredSubjectsCopy?.filter((subject) => subject.subject === selectedSubject);
    }

    // filtrado por trayecto
    if (selectedTrayecto) {
      filteredSubjectsCopy = filteredSubjectsCopy?.filter(
        (subject) => subject.trayectoId === selectedTrayecto
      );
    }

    setFilteredSubjects(filteredSubjectsCopy as Subject[]);
  }, [selectedPnf, selectedSubject, selectedTrayecto, subjects]);

  // obtiene las materias para el modal

  useEffect(() => {
    if (!selectedModalPnf || !selectedModalTrayecto || !selectedTurno || !selectedSeccion) return;

    getPensum({ programaId: selectedModalPnf, trayectoId: selectedModalTrayecto })
      .then((data) => {
        if (data.error) {
          message.error(data.message);
          return;
        }
        const { pnfId, pnfName, trayectoId, trayectoName, pensums } = data.data;

        ///

        const pensumList: Subject[] = pensums.map((subject: any) => {
          const quarter: InlineQuarter = {};
          const hours: InlineHours = { q1: 0, q2: 0, q3: 0 };
          const subjectedQuarter = JSON.parse(subject.quarter.toString());

          [1, 2, 3].forEach((q) => {
            if (subjectedQuarter.includes(q)) {
              quarter[`q${q}` as keyof InlineQuarter] = null;
              hours[`q${q}` as keyof InlineHours] = Number(subject.hours) || 0;
            }
          });

          return {
            innerId: uuidv4(),
            id: subject.subject_id,
            subject: subject.subject,
            hours: hours,
            pnf: pnfName,
            pnfId: pnfId,
            seccion: selectedSeccion,
            quarter: quarter,
            pensum_id: subject.id,
            turnoName: selectedTurno,
            trayectoId: trayectoId,
            trayectoName: trayectoName,
            trayecto_saga_id: subject.trayecto_saga_id.toString(),
          };
        });
        setModalPensumList(pensumList);
      })
      .catch((error) => {
        console.log(error);
      });
  }, [selectedModalPnf, selectedModalTrayecto, selectedTurno, selectedSeccion]);

  useEffect(() => {
    setModalSelectedSubject(null);
    if (
      !modalPensumList ||
      !selectedTurno ||
      !selectedSeccion ||
      !selectedModalPnf ||
      !selectedModalTrayecto
    ) {
      setModalSelectedSubject(null);
      setAviableModalSubjects([]);
      return;
    }

    // revisa que al menos exista la combinacion el turno, trayecto, seccion y pnf seleccionados
    const selectionExist = subjects?.some(
      (subjects) =>
        subjects.pnfId === selectedModalPnf &&
        subjects.trayectoId === selectedModalTrayecto &&
        normalizeText(subjects.turnoName) === normalizeText(selectedTurno) &&
        normalizeText(subjects.seccion) === normalizeText(selectedSeccion)
    );

    if (!selectionExist) {
      setSeccionExist(false);
      setAviableModalSubjects([]);
      return;
    }
    setSeccionExist(true);

    const getMissingSubjects = (standardSubjects: Subject[], currentSubjects: Subject[] = []) => {
      const currentKeys = currentSubjects.map((subject) => subject.subject);
      return standardSubjects.filter((subject) => !currentKeys.includes(subject.subject));
    };

    const currentSubjects =
      subjects?.filter(
        (subject) =>
          subject.pnfId === selectedModalPnf &&
          subject.trayectoId === selectedModalTrayecto &&
          normalizeText(subject.turnoName) === normalizeText(selectedTurno) &&
          normalizeText(subject.seccion) === normalizeText(selectedSeccion)
      ) || [];

    const missingSubjects = getMissingSubjects(modalPensumList, currentSubjects);

    setAviableModalSubjects(missingSubjects);
  }, [modalPensumList, selectedTurno, selectedSeccion, selectedModalPnf, selectedModalTrayecto, subjects]);

  /*if (!userData?.su) {
    return <Forbidden />;
  }*/

  const iconStyle = { color: "white", fontSize: "2rem" };
  // si no hay proyecciones
  if (subjects?.length === 0 && proyectionsDone?.length === 0) {
    return (
      <div
        className="proyecciones-container"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: "20px",
        }}>
        <h1>No se ha encontrado ninguna proyección</h1>
        <Button
          style={{ height: "60px", width: "300px", fontSize: "20px" }}
          type="primary"
          icon={<GiAutoRepair style={iconStyle} />}
          onClick={() => navigate("/app/proyecciones/create")}>
          Crear proyección
        </Button>
      </div>
    );
  }

  // contenido del modal

  const getModalContent = () => {
    const styles: React.CSSProperties = {
      display: "flex",
      flexDirection: "column",
      rowGap: "10px",
      marginTop: "20px",
      height: "400px",
      overflow: "auto",
    };
    if (!selectedModalPnf || !selectedModalTrayecto || !selectedTurno || !selectedSeccion) {
      return (
        <>
          <span style={{ color: "gray", fontSize: "14px" }}>
            Seleccione un PNF, Trayecto, Turno y Sección
          </span>
          ;<div style={styles}></div>
        </>
      );
    }

    if (!seccionExist) {
      return (
        <>
          <span style={{ color: "red", fontSize: "14px" }}>
            No existe la combinación de PNF, Trayecto, Turno y Sección seleccionada
          </span>
          <div style={styles}></div>
        </>
      );
    }

    if (aviableModalSubjects.length <= 0) {
      return (
        <>
          <span style={{ color: "gray", fontSize: "14px" }}>No hay materias disponibles</span>
          <div style={styles}></div>
        </>
      );
    }

    return (
      <>
        <span style={{ color: "gray", fontSize: "14px" }}>Materias disponibles</span>
        <div style={styles}>
          {aviableModalSubjects.map((subject, i) => (
            <div
              key={i}
              onClick={() => setModalSelectedSubject(subject)}
              style={{
                cursor: "pointer",
                backgroundColor: modalSelectedSubject?.subject === subject.subject ? "#1890ff" : "white",
                color: modalSelectedSubject?.subject === subject.subject ? "white" : "black",
                padding: "5px",
                borderRadius: "5px",
              }}>
              {subject.subject}
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <>
      <div
        className="title-bar-container"
        style={{
          gridArea: "header",
          display: "flex",
          alignItems: "center",
          justifyContent: "start",
          columnGap: "3rem",
        }}>
        <h1>Materias en la Proyección</h1>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "20px",
          marginTop: "20px",
        }}>
        {userData?.su && (
          <Select
            allowClear
            showSearch
            style={{ width: 200 }}
            placeholder="Filtrar por PNF"
            optionFilterProp="label"
            filterOption={(input, option) =>
              normalizeText(option?.label ?? "").includes(normalizeText(input))
            }
            filterSort={(optionA, optionB) =>
              normalizeText(optionA?.label ?? "").localeCompare(normalizeText(optionB?.label ?? ""))
            }
            options={pnfOptions}
            onChange={(value) => {
              setSelectedPnf(value);
            }}
            value={selectedPnf}
          />
        )}

        <Select
          allowClear
          showSearch
          style={{ width: 200 }}
          placeholder="Filtrar por materia"
          optionFilterProp="label"
          filterOption={(input, option) => normalizeText(option?.label ?? "").includes(normalizeText(input))}
          filterSort={(optionA, optionB) =>
            normalizeText(optionA?.label ?? "").localeCompare(normalizeText(optionB?.label ?? ""))
          }
          options={subjectOptions}
          onChange={(value) => {
            setSelectedSubject(value);
          }}
          value={selectedSubject}
        />

        <Select
          allowClear
          showSearch
          style={{ width: 200 }}
          placeholder="Filtrar por trayecto"
          optionFilterProp="label"
          filterOption={(input, option) => normalizeText(option?.label ?? "").includes(normalizeText(input))}
          filterSort={(optionA, optionB) =>
            normalizeText(optionA?.label ?? "").localeCompare(normalizeText(optionB?.label ?? ""))
          }
          options={trayectoOptions}
          onChange={(value) => {
            setSelectedTrayecto(value);
          }}
          value={selectedTrayecto}
        />

        <Button type="primary" onClick={showAddSubjectModal}>
          Agregar materia
        </Button>
      </div>

      <Modal
        title="Agregar Materia"
        closable={{ "aria-label": "Custom Close Button" }}
        open={isAddSubjectModalOpen}
        onOk={handleOkSubjectModal}
        okText="Agregar"
        cancelText="Cancelar"
        destroyOnClose={true}
        width={800}
        centered
        className="add-subject-modal"
        maskClosable={false}
        onCancel={handleCancelSubjectModal}>
        <div style={{ display: "flex", flexDirection: "row", gap: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "gray", fontSize: "10px" }}>Programa</span>
            <Select
              allowClear
              showSearch
              style={{ width: 200 }}
              placeholder="Seleccione un PNF"
              optionFilterProp="label"
              filterOption={(input, option) =>
                normalizeText(option?.label ?? "").includes(normalizeText(input))
              }
              filterSort={(optionA, optionB) =>
                normalizeText(optionA?.label ?? "").localeCompare(normalizeText(optionB?.label ?? ""))
              }
              options={pnfOptions}
              onChange={(value) => {
                setSelectedModalPnf(value);
              }}
              value={selectedModalPnf}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "gray", fontSize: "10px" }}>Trayecto</span>
            <Select
              allowClear
              showSearch
              style={{ width: 200 }}
              placeholder="Seleccione trayecto"
              optionFilterProp="label"
              filterOption={(input, option) =>
                normalizeText(option?.label ?? "").includes(normalizeText(input))
              }
              filterSort={(optionA, optionB) =>
                normalizeText(optionA?.label ?? "").localeCompare(normalizeText(optionB?.label ?? ""))
              }
              options={trayectoOptions}
              onChange={(value) => {
                setSelectedModalTrayecto(value);
              }}
              value={selectedModalTrayecto}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "gray", fontSize: "10px" }}>Turno</span>
            <Select
              allowClear
              showSearch
              style={{ width: 200 }}
              placeholder="Seleccione un turno"
              optionFilterProp="label"
              filterOption={(input, option) =>
                normalizeText(option?.label ?? "").includes(normalizeText(input))
              }
              filterSort={(optionA, optionB) =>
                normalizeText(optionA?.label ?? "").localeCompare(normalizeText(optionB?.label ?? ""))
              }
              options={turnoOptions}
              onChange={(value) => {
                setSelectedTurno(value);
              }}
              value={selectedTurno}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "gray", fontSize: "10px" }}>Sección</span>
            <Select
              allowClear
              showSearch
              style={{ width: 50 }}
              placeholder="Seleccione una sección"
              optionFilterProp="label"
              filterOption={(input, option) =>
                normalizeText(option?.label ?? "").includes(normalizeText(input))
              }
              filterSort={(optionA, optionB) =>
                normalizeText(optionA?.label ?? "").localeCompare(normalizeText(optionB?.label ?? ""))
              }
              options={seccionOptions}
              onChange={(value) => {
                setSelectedSeccion(value);
              }}
              value={selectedSeccion}
            />
          </div>
        </div>
        <Divider />
        {getModalContent()}
      </Modal>

      <TablePensum subjects={filteredSubjects} />
    </>
  );
}

