import React, { useRef, useState, useContext } from "react";
import {
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import type { InputRef, TableColumnsType, TableColumnType } from "antd";
import { Button, Input, Space, Table, Tag, message, Popconfirm } from "antd";
import type { FilterDropdownProps } from "antd/es/table/interface";
import Highlighter from "react-highlight-words";
import { Subject } from "../../../interfaces/subject";
//import { Teacher } from "../../../interfaces/teacher";
import EditProyeccionesSubjectModal from "../editProyeccionesSubjectModal/editProyeccionesSubjectModal";
//import { MainContext } from "../../../context/mainContext";
//import { MainContextValues } from "../../../interfaces/contextInterfaces";

type DataIndex = keyof Subject;

const TablePensum: React.FC<{ subjects: Subject[] | null | undefined }> = ({ subjects }) => {
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef<InputRef>(null);

  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const handleSearch = (
    selectedKeys: string[],
    confirm: FilterDropdownProps["confirm"],
    dataIndex: DataIndex
  ) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();
    setSearchText("");
  };

  const getColumnSearchProps = (dataIndex: DataIndex): TableColumnType<Subject> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Buscar en ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}>
            Buscar
          </Button>
          <Button
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{ width: 90 }}>
            Reiniciar
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              confirm({ closeDropdown: false });
              setSearchText((selectedKeys as string[])[0]);
              setSearchedColumn(dataIndex);
            }}>
            Filtrar
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              close();
            }}>
            Cerrar
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => <SearchOutlined style={{ color: filtered ? "#1677ff" : undefined }} />,
    onFilter: (value, record) => {
      const recordValue = record[dataIndex] ?? "";
      return recordValue
        .toString()
        .toLowerCase()
        .includes((value as string).toLowerCase());
    },
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
    render: (text) =>
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{ backgroundColor: "#ffc069", padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? text.toString() : ""}
        />
      ) : (
        text
      ),
  });

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

  const onDelete = (record: Subject) => {
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
      ...getColumnSearchProps("turnoName"),
      onFilter: (value, record) => {
        const turnoValue = typeof record.turnoName === "string" ? record.turnoName : "";
        return turnoValue.toLowerCase().includes((String(value) || "").toLowerCase());
      },
      sorter: (a, b) => a?.turnoName?.localeCompare(b?.turnoName),
      sortDirections: ["descend", "ascend"],
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
      ...getColumnSearchProps("seccion"),
      onFilter: (value, record) => {
        const hoursValue = typeof record.hours === "number" ? record.hours : "";
        return hoursValue.toString().includes(String(value) || "");
      },
      //sorter: (a, b) => a.hours - b.hours,
      sortDirections: ["descend", "ascend"],
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

