/* eslint-disable @typescript-eslint/no-explicit-any */
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import { Button, Tabs, message, Divider, Popconfirm, Spin, Tag, Modal, Select, Checkbox } from "antd";
import getPensum from "../../../fetch/getPensum";
import getInscriptionData from "../../../fetch/getInscriptionData";
import { useContext, useEffect, useState } from "react";
import { Subject, InlineQuarter, InlineHours } from "../../../interfaces/subject";
import { v4 as uuidv4 } from "uuid";
import TabSubject from "./tabs/tabSubject";
import TabStudent from "./tabs/tabStudent";
import TabProyection from "./tabs/tabProyection";
import TabConf from "./tabs/tabConf";
import { ExclamationCircleOutlined, QuestionCircleOutlined, PlusOutlined } from "@ant-design/icons";
import getConfig from "../../../fetch/getConfig";
import { useNavigate } from "react-router-dom";
import getMaya from "../../../fetch/getMaya";
import { normalizeText } from "../../../utils/textFilter";

interface TabPanelProps {
  selectedPnf: string | null;
  selectedTrayecto: string | null;
  selectedMaya: string | null;
}

export interface Student {
  ci: string;
  id: string;
  last_name: string;
  name: string;
  sex: string;
}

export interface StudentList {
  pass: Student[];
  fail: Student[];
}

export default function TabPanel({ selectedPnf, selectedTrayecto, selectedMaya }: TabPanelProps) {
  const {
    turnosList: defaultTurnos,
    subjects,
    handleSubjectChange,
    userData,
    pnfList,
  } = useContext(MainContext) as MainContextValues;
  const [subjectList, setSubjectList] = useState<Subject[]>([]);
  const [studentList, setStudentList] = useState<StudentList | null>(null);
  const [turnosList, setTurnosList] = useState<string[]>([]);
  const [turnos, setTurnos] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isActiveProyection, setIsActiveProyection] = useState<boolean | null>(null);
  const navigate = useNavigate();

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMayaOptions, setModalMayaOptions] = useState<any[]>([]);
  const [modalSelectedMaya, setModalSelectedMaya] = useState<string | null>(null);
  const [modalSelectedTurno, setModalSelectedTurno] = useState<string | null>(null);
  const [modalLoadingMaya, setModalLoadingMaya] = useState(false);
  const [addingSection, setAddingSection] = useState(false);

  // Linking States
  const [isLinked, setIsLinked] = useState(false);
  const [selectedLinkSection, setSelectedLinkSection] = useState<string | null>(null);
  const [linkableSections, setLinkableSections] = useState<any[]>([]);

  // Helper function to format subjects
  // Helper function to format subjects
  const formatSubjects = (
    pensums: any[],
    pnfName: string,
    pnfId: string,
    trayectoId: string,
    trayectoName: string,
    turnoName: string = "undefined",
    linkedToSection?: string,
    seccion: string = "undefined",
    targetSubjects: Subject[] = []
  ) => {
    return pensums.map((subject: any) => {
      const quarter: InlineQuarter = {};
      const hours: InlineHours = { q1: 0, q2: 0, q3: 0 };
      const subjectedQuarter = JSON.parse(subject.quarter.toString());

      [1, 2, 3].forEach((q) => {
        if (subjectedQuarter.includes(q)) {
          quarter[`q${q}` as keyof InlineQuarter] = null;
          hours[`q${q}` as keyof InlineHours] = Number(subject.hours) || 0;
        }
      });

      // Calculate the pensum_id for the current subject being processed
      const currentPensumId = subject.pensum_id ? subject.pensum_id.toString() : subject.id.toString();

      // Check if this subject exists in the target section to establish a valid link
      let effectiveLink = undefined;
      if (linkedToSection && targetSubjects.length > 0) {
        // Match strictly by Subject Name as requested
        const match = targetSubjects.find((t) => normalizeText(t.subject) === normalizeText(subject.subject));

        if (match) {
          effectiveLink = linkedToSection;
        }
      }

      return {
        innerId: uuidv4(),
        id: uuidv4(),
        subject: subject.subject,
        hours: hours,
        pnf: pnfName,
        pnfId: pnfId.toString(),
        seccion: seccion,
        quarter: quarter,
        pensum_id: currentPensumId,
        turnoName: turnoName,
        trayectoId: trayectoId.toString(),
        trayectoName: trayectoName,
        trayecto_saga_id: subject.trayecto_saga_id.toString(),
        linkedToSection: effectiveLink,
      };
    });
  };

  // Fetch Mayas for Modal
  useEffect(() => {
    if (isModalOpen && selectedPnf && pnfList) {
      const sagaPNFID = pnfList?.find((pnf) => pnf.id.toString() === selectedPnf)?.saga_id?.toString();
      if (!sagaPNFID) return;

      setModalLoadingMaya(true);
      setModalMayaOptions([]);
      setModalSelectedMaya(null);

      // Calculate linkable sections
      if (subjects && subjects.length > 0) {
        const unique = new Set();
        const opts: any[] = [];
        subjects.forEach((s) => {
          // Filter by current context if needed, though subjects might already be filtered contextually?
          // The context 'subjects' usually contains ALL subjects for the active projection (or filtered by PNF/Trayecto if the context handles it)
          // But let's be safe and check PNF/Trayecto
          if (
            String(s.pnfId) === String(selectedPnf) &&
            String(s.trayectoId) === String(selectedTrayecto) &&
            s.seccion !== "undefined" &&
            s.seccion
          ) {
            const key = `${s.seccion} - ${s.turnoName}`;
            if (!unique.has(key)) {
              unique.add(key);
              opts.push({ value: key, label: `Sección ${s.seccion} (${s.turnoName})` });
            }
          }
        });
        setLinkableSections(opts);
      } else {
        setLinkableSections([]);
      }

      setIsLinked(false);
      setSelectedLinkSection(null);

      getMaya({ sagaPNFID })
        .then((data) => {
          const mayadata = data?.data?.mayas;
          if (!mayadata) return;

          const sortedMayas = mayadata.sort((a: any, b: any) => Number(b.id) - Number(a.id));
          //const filteredMayas = sortedMayas.filter((maya: any) => maya.tipopensum_id === 1);

          const mayaOpt = sortedMayas.map(
            (maya: { id: { toString: () => any }; descripcion: { toString: () => any } }) => ({
              value: maya.id.toString(),
              label: maya.descripcion.toString(),
            })
          );

          setModalMayaOptions(mayaOpt);
          if (mayaOpt.length > 0) {
            setModalSelectedMaya(mayaOpt[0].value);
          }
        })
        .finally(() => {
          setModalLoadingMaya(false);
        });
    }
  }, [isModalOpen, selectedPnf, pnfList, subjects, selectedTrayecto]);

  const handleAddSection = async () => {
    if (!modalSelectedMaya || !modalSelectedTurno || !selectedPnf || !selectedTrayecto) {
      message.warning("Debe seleccionar una maya y un turno.");
      return;
    }

    if (isLinked && !selectedLinkSection) {
      message.warning("Debe seleccionar una sección para vincular.");
      return;
    }

    setAddingSection(true);
    try {
      const pensumData = await getPensum({
        programaId: selectedPnf,
        trayectoId: selectedTrayecto,
        mayaId: modalSelectedMaya,
      });

      if (pensumData.error) {
        message.error("Error al obtener las materias para la maya seleccionada.");
      } else {
        const { pnfName, trayectoName, pensums } = pensumData.data;

        // Calculate next section number
        let nextSection = "1";
        if (subjects && subjects.length > 0) {
          let relevantSections: number[] = [];
          if (modalSelectedTurno === "noche") {
            // Para noche, solo considerar secciones de noche
            relevantSections = subjects
              .filter(
                (s) =>
                  String(s.pnfId) === String(selectedPnf) &&
                  String(s.trayectoId) === String(selectedTrayecto) &&
                  s.turnoName === "noche"
              )
              .map((s) => parseInt(s.seccion, 10))
              .filter((n) => !isNaN(n));
          } else {
            // Para mañana y tarde, considerar ambas como continuas
            relevantSections = subjects
              .filter(
                (s) =>
                  String(s.pnfId) === String(selectedPnf) &&
                  String(s.trayectoId) === String(selectedTrayecto) &&
                  (s.turnoName === "mañana" || s.turnoName === "tarde")
              )
              .map((s) => parseInt(s.seccion, 10))
              .filter((n) => !isNaN(n));
          }

          if (relevantSections.length > 0) {
            const maxSection = Math.max(...relevantSections);
            nextSection = (maxSection + 1).toString();
          }
        }

        let targetSubjects: Subject[] = [];
        if (isLinked && selectedLinkSection && subjects) {
          targetSubjects = subjects.filter((s) => {
            const key = `${s.seccion} - ${s.turnoName}`;
            return (
              key === selectedLinkSection &&
              String(s.pnfId) === String(selectedPnf) &&
              String(s.trayectoId) === String(selectedTrayecto)
            );
          });
        }

        const newSubjects = formatSubjects(
          pensums,
          pnfName,
          selectedPnf,
          selectedTrayecto,
          trayectoName,
          modalSelectedTurno,
          isLinked && selectedLinkSection ? selectedLinkSection : undefined,
          nextSection,
          targetSubjects
        );

        if (subjects) {
          if (newSubjects.length === 0) {
            message.warning("No se encontraron materias en la maya seleccionada.");
          } else {
            handleSubjectChange([...subjects, ...newSubjects]);
            message.success(`Sección agregada exitosamente con ${newSubjects.length} materias.`);
            setIsModalOpen(false);
            setModalSelectedMaya(null);
            setModalSelectedTurno(null);
            setIsLinked(false);
            setSelectedLinkSection(null);
          }
        }
      }
    } catch (e) {
      console.error(e);
      message.error("Ocurrió un error al agregar la sección.");
    } finally {
      setAddingSection(false);
    }
  };

  // obtener la proyeccion activa
  useEffect(() => {
    getConfig()
      .then((config) => setIsActiveProyection(config.active_proyection))
      .catch((error) => {
        console.error(error);
        setIsActiveProyection(null);
      });
  }, []);

  //  llena los turnos que son utilizados en la pestana de proyeccion
  useEffect(() => {
    if (!turnosList) return;
    setTurnos(turnosList);
  }, [turnosList]);

  // llena el array de turnos con los valores de defaultTurnos
  useEffect(() => {
    if (!defaultTurnos) return;
    const turnos = defaultTurnos.map((turno: any) => turno.name);
    setTurnosList(turnos);
  }, [defaultTurnos]);

  useEffect(() => {
    if (!selectedPnf || !selectedTrayecto) return;

    setLoading(true);

    const fetchAllData = async () => {
      try {
        // Ejecutamos ambas peticiones en paralelo
        const [pensumData, inscriptionData] = await Promise.all([
          getPensum({ programaId: selectedPnf, trayectoId: selectedTrayecto, mayaId: selectedMaya }),
          getInscriptionData({ programId: selectedPnf, trayectoId: selectedTrayecto }),
        ]);

        // Procesamiento de materias
        if (pensumData.error) {
          setSubjectList([]);
        } else {
          const { pnfId, pnfName, trayectoId, trayectoName, pensums } = pensumData.data;
          const pensumList: Subject[] = formatSubjects(pensums, pnfName, pnfId, trayectoId, trayectoName);
          setSubjectList(pensumList);
        }

        // Procesamiento de estudiantes
        if (inscriptionData.error) {
          message.error(inscriptionData.message);
          setStudentList(null);
        } else {
          const studentsPassedObject = inscriptionData?.data?.passed || {};
          const turnos = Object.keys(studentsPassedObject);
          setTurnosList(turnos);

          const studentPassedList = turnos.map((turno) => studentsPassedObject[turno].inscriptionData).flat();

          const studentFailedList =
            inscriptionData?.data?.fails?.map((student: any) => student.student_info) || [];

          setStudentList({ pass: studentPassedList, fail: studentFailedList });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        message.error("Error al cargar los datos");
      } finally {
        setLoading(false); // Desactivamos el loading al final
      }
    };

    fetchAllData();
  }, [selectedPnf, selectedTrayecto, selectedMaya]);

  // funcion que se encarga revisar si una proyeccion ya existe
  const checkIfProyected = () => {
    const isProyected = subjects?.some((subject) => {
      if (
        String(subject.pnfId) === String(selectedPnf) &&
        String(subject.trayectoId) === String(selectedTrayecto)
      ) {
        return true;
      }
    });
    return isProyected;
  };

  const handleDeleteProyected = () => {
    if (!subjects || !selectedPnf || !selectedTrayecto) return;
    const subjectsCopy = JSON.parse(JSON.stringify(subjects));
    const filteredSubjects = subjectsCopy.filter((subject: Subject) => {
      return subject.pnfId !== selectedPnf || subject.trayectoId !== selectedTrayecto;
    });

    handleSubjectChange(filteredSubjects);
  };

  if (!isActiveProyection) {
    return (
      <div>
        <h2 style={{ color: "red" }}>No hay ninguna proyección activa</h2>
        <Divider />
        {userData?.su ? (
          <Button type="primary" onClick={() => navigate("/app/active")}>
            Crear proyección
          </Button>
        ) : (
          <p>Solo los administradores del sistema pueden crear una proyección, habla con uno de ellos</p>
        )}
      </div>
    );
  }

  if (checkIfProyected()) {
    return (
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "32px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          border: "1px solid #f0f0f0",
          maxWidth: "800px",
          margin: "20px auto",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}>
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "16px",
              padding: "8px 16px",
              background: "#f6ffed",
              border: "1px solid #b7eb8f",
              borderRadius: "20px",
            }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#52c41a",
                boxShadow: "0 0 0 4px rgba(82, 196, 26, 0.2)",
              }}></span>
            <span style={{ color: "#389e0d", fontWeight: 600 }}>Proyección Activa</span>
          </div>
          <h2 style={{ margin: 0, color: "#1f1f1f", fontSize: "1.8rem" }}>
            Esta proyección ya está creada
          </h2>
          <p style={{ color: "#8c8c8c", marginTop: "12px", fontSize: "1rem", maxWidth: "600px", marginInline: "auto" }}>
            Los datos para este programa y trayecto ya han sido generados. Puede agregar nuevas secciones o eliminar la proyección completa si desea comenzar de nuevo.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            marginTop: "12px",
          }}>
          <Button
            size="large"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              height: "44px",
              padding: "0 24px",
              borderRadius: "8px",
            }}>
            Agregar Sección
          </Button>

          <Popconfirm
            placement="bottom"
            title="¿Eliminar proyección permanentemente?"
            description="Esta acción borrará todos los datos asociados y no se puede deshacer."
            icon={<QuestionCircleOutlined style={{ color: "red" }} />}
            okText="Sí, Eliminar"
            cancelText="Cancelar"
            okType="danger"
            onConfirm={handleDeleteProyected}>
            <Button
              danger
              size="large"
              type="primary"
              style={{
                display: "flex",
                alignItems: "center",
                height: "44px",
                padding: "0 24px",
                borderRadius: "8px",
              }}>
              Eliminar Proyección
            </Button>
          </Popconfirm>
        </div>

        <Modal
          title="Agregar Nueva Sección"
          open={isModalOpen}
          onOk={handleAddSection}
          onCancel={() => setIsModalOpen(false)}
          confirmLoading={addingSection}
          okText="Agregar"
          cancelText="Cancelar"
          centered>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "10px 0" }}>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#595959",
                  fontSize: "13px",
                  fontWeight: 500,
                }}>
                Maya Curricular
              </label>
              <Select
                style={{ width: "100%" }}
                size="large"
                placeholder="Seleccione la maya"
                options={modalMayaOptions}
                loading={modalLoadingMaya}
                disabled={modalLoadingMaya}
                value={modalSelectedMaya}
                onChange={setModalSelectedMaya}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#595959",
                  fontSize: "13px",
                  fontWeight: 500,
                }}>
                Turno
              </label>
              <Select
                style={{ width: "100%" }}
                size="large"
                placeholder="Seleccione el turno"
                value={modalSelectedTurno}
                onChange={setModalSelectedTurno}
                options={defaultTurnos?.map((t: any) => ({ value: t.name, label: t.name }))}
              />
            </div>

            <div
              style={{
                backgroundColor: "#fafafa",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #f0f0f0",
              }}>
              <Checkbox checked={isLinked} onChange={(e) => setIsLinked(e.target.checked)}>
                Vincular a otra sección existente
              </Checkbox>

              {isLinked && (
                <div style={{ marginTop: "12px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      color: "#595959",
                      fontSize: "13px",
                      fontWeight: 500,
                    }}>
                    Sección a vincular
                  </label>
                  <Select
                    style={{ width: "100%" }}
                    size="large"
                    placeholder="Seleccione la sección"
                    value={selectedLinkSection}
                    onChange={setSelectedLinkSection}
                    options={linkableSections}
                    disabled={linkableSections.length === 0}
                  />
                  {linkableSections.length === 0 && (
                    <span style={{ color: "#faad14", fontSize: "12px", display: "block", marginTop: "4px" }}>
                      No hay secciones disponibles para vincular en este trayecto.
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          columnGap: "20px",
        }}>
        <Spin size="large" />
        <h2 style={{ color: "#1890ff" }}>Espere...</h2>
      </div>
    );
  }

  if (selectedPnf === null || selectedTrayecto === null) {
    return (
      <div>
        <h2 style={{ color: "gray" }}>Seleccione un programa y trayecto</h2>
      </div>
    );
  }

  if (subjectList.length === 0 || subjectList === null) {
    return (
      <div>
        <h2 style={{ color: "gray" }}>
          No hay materias registradas para este programa y trayecto en esta maya
        </h2>
      </div>
    );
  }

  return (
    <div>
      {studentList?.pass?.length === 0 && (
        <Tag icon={<ExclamationCircleOutlined />} color="red">
          No hay estudiantes inscritos en este trayecto
        </Tag>
      )}
      <Tabs
        defaultActiveKey="1"
        items={[
          {
            label: "Proyección",
            key: "1",
            children: <TabProyection subjectList={subjectList} turnos={turnos} />,
          },
          {
            label: "Materias",
            key: "2",
            children: <TabSubject subjects={subjectList} />,
          },
          {
            label: "Alumnos",
            key: "3",
            children: <TabStudent students={studentList} />,
          },
          {
            label: "Configuración",
            key: "4",
            children: (
              <TabConf
                turnosList={defaultTurnos?.map((turno: any) => turno.name) || []}
                turnos={turnos}
                setTurnos={setTurnos}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

