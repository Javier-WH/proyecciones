/* eslint-disable react-hooks/exhaustive-deps */
import { Subject } from "../../../interfaces/subject";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import { useContext, useEffect, useState } from "react";
import { Button, message, Select, Tag, Table, Card, Row, Col, Space, Tooltip, Typography } from "antd";
import { FaUserPen } from "react-icons/fa6";
import { TbTopologyStar3 } from "react-icons/tb";
import AddSubjectToTeacherModal from "./addTeacherSubject";
import { normalizeText } from "../../../utils/textFilter";
import { EditOutlined, FilterOutlined, DatabaseOutlined, BookOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface props {
  searchByUserPerfil: boolean;
}

interface SelectOption {
  value: string;
  label: string;
}

function unasignedSubject(obj: { q1?: string | null; q2?: string | null; q3?: string | null }): boolean {
  return Object.values(obj).some((value) => value === null);
}

export default function SubjectTab({ searchByUserPerfil }: props) {
  const { subjects, subjectColors, teachers, setEditSubjectQuarter, userData, userPNF, isAuthenticated } =
    useContext(MainContext) as MainContextValues;
  const [subjectList, setSubjectList] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [pnfOptions, setPnfOptions] = useState<SelectOption[]>([]);
  const [selectedPnf, setSelectedPnf] = useState<string | undefined>(undefined);
  const [subjectsOptions, setSubjectsOptions] = useState<SelectOption[]>([]);
  const [selectedSubjectOption, setSelectedSubjectOption] = useState<string | undefined>(undefined);
  const [showUnasignedSubject, setShowUnasignedSubject] = useState<boolean>(false);
  const [trayectoOptions, setTrayectoOptions] = useState<SelectOption[]>([]);
  const [selectedTrayectoOption, setSelectedTrayectoOption] = useState<string | undefined>(undefined);
  const [turnoOptions, setTurnoOptions] = useState<SelectOption[]>([]);
  const [selectedTurnoOption, setSelectedTurnoOption] = useState<string | undefined>(undefined);

  // limpia los selectores
  useEffect(() => {
    setSelectedPnf(undefined);
  }, [searchByUserPerfil]);

  // se llenan filtros
  useEffect(() => {
    if (!subjects) return;

    let filteredSubjects = JSON.parse(JSON.stringify(subjects)) as Subject[];
    if (searchByUserPerfil) {
      const pnfId = userPNF?.replace(/"/g, "");
      filteredSubjects = filteredSubjects.filter((subject) => subject.pnfId === pnfId);
    }

    if (selectedPnf) {
      filteredSubjects = filteredSubjects.filter((subject) => subject.pnfId === selectedPnf);
    }

    if (selectedSubjectOption) {
      filteredSubjects = filteredSubjects.filter((subject) => subject.subject === selectedSubjectOption);
    }

    if (selectedTrayectoOption) {
      filteredSubjects = filteredSubjects.filter((subject) => subject.trayectoId === selectedTrayectoOption);
    }

    if (selectedTurnoOption) {
      filteredSubjects = filteredSubjects.filter((subject) => subject.turnoName === selectedTurnoOption);
    }

    if (showUnasignedSubject) {
      filteredSubjects = filteredSubjects.filter((subject) => {
        const quarter = subject.quarter;
        // eslint-disable-next-line array-callback-return
        if (unasignedSubject(quarter)) {
          return subject;
        }
        return false;
      });
    }

    // Hide linked subjects
    filteredSubjects = filteredSubjects.filter(student => !student.linkedToSection);

    setSubjectList(filteredSubjects);
  }, [
    searchByUserPerfil,
    subjects,
    selectedPnf,
    selectedSubjectOption,
    showUnasignedSubject,
    selectedTrayectoOption,
    selectedTurnoOption,
    userPNF,
    isAuthenticated,
  ]);

  // llena nos selectores de busqueda
  useEffect(() => {
    if (!subjects) return;

    // llena los pnf
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

    // llena los trayectos
    const uniqueTrayectos = subjects?.filter(
      (subject, index, self) => index === self.findIndex((s) => s.trayectoId === subject.trayectoId)
    );

    const trayectoList = uniqueTrayectos?.map((subject) => {
      return {
        value: subject.trayectoId,
        label: subject.trayectoName,
      };
    });
    setTrayectoOptions(trayectoList as SelectOption[]);

    const turnoList = Array.from(new Set(subjects?.map((subject) => subject.turnoName) || [])).map(
      (subject) => ({
        value: subject,
        label: subject,
      })
    );
    setTurnoOptions(turnoList as SelectOption[]);
  }, [subjects]);

  // llena el selector de materia condicional
  useEffect(() => {
    if (!subjects) return;
    if (!selectedTrayectoOption) {
      const subjectList = Array.from(new Set(subjects?.map((subject) => subject.subject) || [])).map(
        (subject) => ({
          value: subject,
          label: subject,
        })
      );
      setSubjectsOptions(subjectList as SelectOption[]);
      return;
    }

    const subjectList = Array.from(
      new Set(
        subjects
          ?.filter((subject) => subject.trayectoId === selectedTrayectoOption)
          .map((subject) => subject.subject) || []
      )
    ).map((subject) => ({
      value: subject,
      label: subject,
    }));
    setSubjectsOptions(subjectList as SelectOption[]);
  }, [selectedTrayectoOption]);

  const handleChangeTeacher = (subject: Subject) => {
    if (!userData?.su && userPNF !== subject.pnfId) {
      message.error("No puede asignar materias de otros programas");
      return;
    }
    setSelectedSubject(subject);
  };

  const columns = [
    {
      title: 'Programa',
      dataIndex: 'pnf',
      key: 'pnf',
      render: (text: string, record: Subject) => {
        const color = subjectColors?.[record.pnfId] || "#1890ff";
        return <Tag color={color}>{text}</Tag>
      }
    },
    {
      title: 'Materia',
      dataIndex: 'subject',
      key: 'subject',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Trayecto',
      dataIndex: 'trayectoName',
      key: 'trayectoName',
    },
    {
      title: 'Turno',
      dataIndex: 'turnoName',
      key: 'turnoName',
    },
    {
      title: 'Horas',
      key: 'horas',
      render: (_: unknown, record: Subject) => (
        <Text>{`${record.hours?.q1 || 0} / ${record.hours?.q2 || 0} / ${record.hours?.q3 || 0}`}</Text>
      ),
    },
    {
      title: 'Trimestre',
      key: 'trimestre',
      render: (_: unknown, record: Subject) => {
        const q1Assigned = !!record.quarter.q1;
        const q2Assigned = !!record.quarter.q2;
        const q3Assigned = !!record.quarter.q3;

        const Box = ({ active, label }: { active: boolean, label: string }) => (
          <div style={{
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            backgroundColor: active ? '#e6f7ff' : '#f5f5f5',
            border: `1px solid ${active ? '#1890ff' : '#d9d9d9'}`,
            color: active ? '#1890ff' : '#bfbfbf',
            fontWeight: 'bold',
            fontSize: '12px',
            marginRight: '4px'
          }}>
            {label}
          </div>
        );

        return (
          <div style={{ display: 'flex' }}>
            <Tooltip title={q1Assigned ? "Asignado" : "Sin asignar"}><Box active={q1Assigned} label="1" /></Tooltip>
            <Tooltip title={q2Assigned ? "Asignado" : "Sin asignar"}><Box active={q2Assigned} label="2" /></Tooltip>
            <Tooltip title={q3Assigned ? "Asignado" : "Sin asignar"}><Box active={q3Assigned} label="3" /></Tooltip>
          </div>
        )
      }
    },
    {
      title: 'Sección',
      dataIndex: 'seccion',
      key: 'seccion',
      render: (text: string) => <Tag>{text}</Tag>
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: unknown, record: Subject) => (
        <Space size="small">
          <Button
            onClick={() => handleChangeTeacher(record)}
            type="primary"
            shape="circle"
            icon={<FaUserPen />}
            title="Asignar Docente"
          />
          {(record.quarter?.q1 != null ||
            record.quarter?.q2 != null ||
            record.quarter?.q3 != null) && (
              <Button
                onClick={() => {
                  if (!userData?.su && userPNF !== record.pnfId) {
                    message.error("No puede modificar materias asignadas de otros programas");
                    return;
                  }
                  setEditSubjectQuarter(record);
                }}
                shape="circle"
                style={{ color: "#faad14", borderColor: "#faad14" }}
                icon={<TbTopologyStar3 />}
                title="Editar Asignación"
              />
            )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <AddSubjectToTeacherModal subject={selectedSubject} setSelectedSubject={setSelectedSubject} />

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          <Title level={2} style={{ margin: 0 }}>Materias en la Proyección</Title>
        </div>

        <Card bordered={false} style={{ marginBottom: '24px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <Row gutter={[16, 16]}>
            {!searchByUserPerfil && (
              <Col xs={24} sm={12} md={6}>
                <Select
                  allowClear
                  showSearch
                  placeholder="Filtrar por PNF"
                  style={{ width: "100%" }}
                  filterOption={(input, option) =>
                    normalizeText(option?.label ?? "").includes(normalizeText(input))
                  }
                  options={pnfOptions}
                  onChange={setSelectedPnf}
                  value={selectedPnf}
                />
              </Col>
            )}
            <Col xs={24} sm={12} md={6}>
              <Select
                allowClear
                showSearch
                placeholder="Filtrar por materia"
                style={{ width: "100%" }}
                filterOption={(input, option) =>
                  normalizeText(option?.label ?? "").includes(normalizeText(input))
                }
                options={subjectsOptions}
                onChange={setSelectedSubjectOption}
                value={selectedSubjectOption}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                allowClear
                showSearch
                placeholder="Filtrar por trayecto"
                style={{ width: "100%" }}
                filterOption={(input, option) =>
                  normalizeText(option?.label ?? "").includes(normalizeText(input))
                }
                options={trayectoOptions}
                onChange={setSelectedTrayectoOption}
                value={selectedTrayectoOption}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                allowClear
                showSearch
                placeholder="Filtrar por turno"
                style={{ width: "100%" }}
                filterOption={(input, option) =>
                  normalizeText(option?.label ?? "").includes(normalizeText(input))
                }
                options={turnoOptions}
                onChange={setSelectedTurnoOption}
                value={selectedTurnoOption}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Button
                type={showUnasignedSubject ? "primary" : "default"}
                onClick={() => setShowUnasignedSubject(!showUnasignedSubject)}
                icon={<FilterOutlined />}
                block
              >
                {showUnasignedSubject ? "Mostrar todas" : "Mostrar sin asignar"}
              </Button>
            </Col>
            <Col xs={24} sm={12} md={6} style={{ marginLeft: 'auto' }}>
              {/* This could be a place for additional primary actions if needed */}
            </Col>
          </Row>
        </Card>

        <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }} bodyStyle={{ padding: 0 }}>
          <Table
            columns={columns}
            dataSource={subjectList}
            rowKey="innerId"
            pagination={{ pageSize: 10, showSizeChanger: true }}
          />
        </Card>
      </div>
    </div>
  );
}

