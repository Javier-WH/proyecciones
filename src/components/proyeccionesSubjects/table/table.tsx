import React, { useContext, useState } from "react";
import { DeleteOutlined, EditOutlined, CloseCircleOutlined, QuestionCircleOutlined, DisconnectOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { Button, Table, Tag, message, Popconfirm } from "antd";
import { Subject } from "../../../interfaces/subject";
import EditProyeccionesSubjectModal from "../editProyeccionesSubjectModal/editProyeccionesSubjectModal";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";

const TablePensum: React.FC<{ subjects: Subject[] | null | undefined }> = ({ subjects }) => {
  const { handleSubjectChange, subjects: allSubjects } = useContext(MainContext) as MainContextValues;

  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const getRowStyle = (value: string | null | undefined): React.CSSProperties => {
    const error = value === null || value === undefined;
    return {
      textAlign: error ? "center" : "left",
    };
  };
  const getRowContent = (value: string | null | undefined | React.ReactNode[]): React.ReactNode | string => {
    return (
      value ?? (
        <Tag icon={<CloseCircleOutlined />} color="error">
          Vacío
        </Tag>
      )
    );
  };

  const onDelete = (_record: Subject) => {
    if (!allSubjects) return;
    const subjectid = _record.innerId;
    const updatedSubjects = allSubjects?.filter((subject) => subject.innerId !== subjectid);
    handleSubjectChange(updatedSubjects);
    message.success("La asignatura fue eliminada de la proyección");
  };

  const onEdit = (record: Subject) => {
    setSelectedSubject(record);
    setOpenEditModal(true);
  };

  const onUnlink = (record: Subject) => {
    if (!allSubjects) return;
    const updatedSubjects = allSubjects.map((subject) => {
      if (subject.innerId === record.innerId) {
        // Remove the linkedToSection property
        const { linkedToSection, ...rest } = subject;
        return rest;
      }
      return subject;
    });
    handleSubjectChange(updatedSubjects);
    message.success("La asignatura ha sido desvinculada exitosamente.");
  };

  const columns: TableColumnsType<Subject> = [
    {
      title: "Programa",
      dataIndex: "pnf",
      key: "pnf",
      width: 200,
      align: "center",
      onFilter: (value, record) => {
        const pnfValue = typeof record.pnf === "string" ? record.pnf : "";
        return pnfValue.toLowerCase().includes((String(value) || "").toLowerCase());
      },
      sorter: (a, b) => a?.subject?.localeCompare(b?.subject),
      sortDirections: ["descend", "ascend"],
      render: (value) => {
        return <div style={getRowStyle(value)}>{getRowContent(value)}</div>;
      },
    },
    {
      title: "Materia",
      dataIndex: "subject",
      key: "subject",
      width: 250,
      align: "center",
      //...getColumnSearchProps("subject"),
      onFilter: (value, record) => {
        const subjectValue = typeof record.subject === "string" ? record.subject : "";
        return subjectValue.toLowerCase().includes((String(value) || "").toLowerCase());
      },
      sorter: (a, b) => a?.subject?.localeCompare(b?.subject),
      sortDirections: ["descend", "ascend"],
      render: (value) => {
        return <div style={getRowStyle(value)}>{getRowContent(value)}</div>;
      },
    },
    {
      title: "Trayecto",
      dataIndex: "trayectoName",
      key: "trayectoName",
      width: 150,
      align: "center",
      //...getColumnSearchProps("trayectoName"),
      onFilter: (value, record) => {
        const trayectoValue = typeof record.trayectoName === "string" ? record.trayectoName : "";
        return trayectoValue.toLowerCase().includes((String(value) || "").toLowerCase());
      },
      sorter: (a, b) => a?.trayectoName?.localeCompare(b?.trayectoName),
      sortDirections: ["descend", "ascend"],
      render: (value) => {
        return <div style={getRowStyle(value)}>{getRowContent(value)}</div>;
      },
    },
    {
      title: "Turno",
      dataIndex: "turnoName",
      key: "turnoName",
      width: 100,
      align: "center",
      render: (value) => {
        return <div style={getRowStyle(value)}>{getRowContent(value)}</div>;
      },
    },
    {
      title: "Horas",
      dataIndex: "hours",
      width: 100,
      key: "hours",
      align: "center",
      render: (value, record) => {
        if (record.isSemestral) {
          // For semester 1, use q1 (or q2) hours. For semester 2, use q3 hours.
          const sem1 = value?.q1 || value?.q2 || 0;
          const sem2 = value?.q3 || 0;
          return <div>{`${sem1} / ${sem2}`}</div>;
        }
        return <div>{`${value?.q1 || 0} / ${value?.q2 || 0} / ${value?.q3 || 0}`}</div>;
      },
    },
    {
      title: "Lapso",
      dataIndex: "quarter",
      width: 150,
      align: "center",
      key: "quarter",
      render: (value, record) => {
        const data: React.ReactNode[] = [];
        const valueKeys = Object.keys(value);

        if (record.isSemestral) {
          if (valueKeys.includes("q1") || valueKeys.includes("q2")) {
            data.push(<Tag color="purple" key={"s1"}>Sem 1</Tag>);
          }
          if (valueKeys.includes("q3")) {
            data.push(<Tag color="purple" key={"s2"}>Sem 2</Tag>);
          }
        } else {
          if (valueKeys.includes("q1")) {
            data.push(<Tag color="blue" key={"q1"}>{`1`}</Tag>);
          }
          if (valueKeys.includes("q2")) {
            data.push(<Tag color="blue" key={"q2"}>{`2`}</Tag>);
          }
          if (valueKeys.includes("q3")) {
            data.push(<Tag color="blue" key={"q3"}>{`3`}</Tag>);
          }
        }
        return <div>{getRowContent(data)}</div>;
      },
    },
    {
      title: "Sección",
      dataIndex: "seccion",
      width: 100,
      key: "seccion",
      align: "center",
      render: (value) => {
        return <div>{getRowContent(value)}</div>;
      },
    },
    {
      title: "Acciones",
      dataIndex: "seccion",
      width: 120,
      key: "seccion",
      align: "center",
      render: (_value, record) => {
        return (
          <div style={{ display: "flex", justifyContent: "space-evenly" }}>
            <Popconfirm
              title="¿Deseas borrar esta materia?"
              description="Esta operación no se puede deshacer"
              onConfirm={() => onDelete(record)}
              onCancel={() => { }}
              okText="Borrar"
              cancelText="Cancelar"
              icon={<QuestionCircleOutlined style={{ color: "red" }} />}
              okButtonProps={{ danger: true }}>
              <Button type="link" danger shape="circle" icon={<DeleteOutlined />} />
            </Popconfirm>

            <Button type="link" shape="circle" icon={<EditOutlined />} onClick={() => onEdit(record)} />

            {record.linkedToSection && (
              <Popconfirm
                title="¿Deseas desvincular esta materia?"
                description="La materia dejará de estar sincronizada con la sección original."
                onConfirm={() => onUnlink(record)}
                onCancel={() => { }}
                okText="Desvincular"
                cancelText="Cancelar"
                icon={<QuestionCircleOutlined style={{ color: "orange" }} />}
              >
                <Button type="link" shape="circle" icon={<DisconnectOutlined style={{ color: "orange" }} />} title="Desvincular" />
              </Popconfirm>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Table
        pagination={{
          position: ["topLeft", "none"],
          defaultCurrent: 1,
          showSizeChanger: true,
        }}
        rowKey={(record) => record.innerId}
        columns={columns}
        dataSource={subjects ?? []}
        scroll={{ x: 'max-content', y: 'calc(100vh - 380px)' }}
      />

      <EditProyeccionesSubjectModal
        open={openEditModal}
        setOpen={setOpenEditModal}
        subject={selectedSubject}
        setSelectedSubject={setSelectedSubject}
      />
    </>
  );
};

export default TablePensum;

