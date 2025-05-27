import React, { useContext, useState } from "react";
import { DeleteOutlined, EditOutlined, CloseCircleOutlined, QuestionCircleOutlined } from "@ant-design/icons";
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

  const columns: TableColumnsType<Subject> = [
    {
      title: "Programa",
      dataIndex: "pnf",
      key: "pnf",
      width: "20%",
      align: "center",
      //...getColumnSearchProps("pnf"),
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
      width: "25%",
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
      width: "20%",
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
      width: "10%",
      align: "center",
      render: (value) => {
        return <div style={getRowStyle(value)}>{getRowContent(value)}</div>;
      },
    },
    {
      title: "Horas",
      dataIndex: "hours",
      width: "10%",
      key: "hours",
      align: "center",
      render: (value) => {
        return <div>{`${value?.q1 || 0} / ${value?.q2 || 0} / ${value?.q3 || 0}`}</div>;
      },
    },
    {
      title: "Trimestre",
      dataIndex: "quarter",
      width: "20%",
      align: "center",
      key: "quarter",
      render: (value) => {
        const data: React.ReactNode[] = [];
        const valueKeys = Object.keys(value);
        if (valueKeys.includes("q1")) {
          data.push(<Tag color="blue" key={"q1"}>{`1`}</Tag>);
        }
        if (valueKeys.includes("q2")) {
          data.push(<Tag color="blue" key={"q2"}>{`2`}</Tag>);
        }
        if (valueKeys.includes("q3")) {
          data.push(<Tag color="blue" key={"q3"}>{`3`}</Tag>);
        }
        return <div>{getRowContent(data)}</div>;
      },
    },
    {
      title: "Seccion",
      dataIndex: "seccion",
      width: "3%",
      key: "seccion",
      align: "center",
      render: (value) => {
        return <div>{getRowContent(value)}</div>;
      },
    },
    {
      title: "Acciones",
      dataIndex: "seccion",
      width: "1%",
      key: "seccion",
      align: "center",
      render: (_value, record) => {
        return (
          <div style={{ display: "flex", justifyContent: "space-evenly" }}>
            <Popconfirm
              title="¿Deseas borrar esta materia?"
              description="Esta operación no se puede deshacer"
              onConfirm={() => onDelete(record)}
              onCancel={() => {}}
              okText="Borrar"
              cancelText="Cancelar"
              icon={<QuestionCircleOutlined style={{ color: "red" }} />}
              okButtonProps={{ danger: true }}>
              <Button type="link" danger shape="circle" icon={<DeleteOutlined />} />
            </Popconfirm>

            <Button type="link" shape="circle" icon={<EditOutlined />} onClick={() => onEdit(record)} />
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
      />
      ;
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

