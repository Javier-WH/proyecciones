import React, { useContext, useEffect, useState } from "react";
import type { TableColumnsType } from "antd";
import { Table, Tag, Input } from "antd";
import { MainContext } from "../../../context/mainContext";
import { CloseCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { Teacher } from "../../../interfaces/teacher";
import { MainContextValues } from "../../../interfaces/contextInterfaces";

interface TeacherTableProps {
  searchByUserPerfil: boolean;
}
const TeacherTable: React.FC<TeacherTableProps> = ({ searchByUserPerfil }) => {
  const context = useContext(MainContext) as MainContextValues;
  const { teachers, setSelectedTeacherById, selectedQuarter, userPerfil } = context;
  const [data, setData] = useState<Teacher[] | null>([]);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (!teachers) return;
    setData(teachers[selectedQuarter] || null);
  }, [selectedQuarter, teachers]);

  // filtro de busqueda
  useEffect(() => {
    if (!teachers) return;
    let filteredTeachers = []

    function canTeach(array1: string[], array2: string[]) {
      for (let i = 0; i < array1.length; i++) {
        for (let j = 0; j < array2.length; j++) {
          if (array1[i] === array2[j]) {
            return true;
          }
        }
      }
      return false;
    }

    if (searchByUserPerfil) {
      filteredTeachers = teachers[selectedQuarter]?.filter((teacher) => {
        if (canTeach(teacher.perfil || [], userPerfil || [])) {
          return true;
        }
        return false;
      });
    }else{
      filteredTeachers = teachers[selectedQuarter]
    }


    if (searchText.length > 0 && filteredTeachers?.length > 0) {
      filteredTeachers = filteredTeachers?.filter((teacher) => {
        return (
          teacher.name.toLowerCase().includes(searchText.toLowerCase()) ||
          teacher?.lastName?.toLowerCase().includes(searchText.toLowerCase()) ||
          teacher?.ci?.toLowerCase().includes(searchText.toLowerCase()) ||
          teacher.perfilName?.toLowerCase()?.includes(searchText.toLowerCase()) ||
          teacher.type?.toLowerCase()?.includes(searchText.toLowerCase())
        );
      });
    }

    setData(filteredTeachers);
  }, [searchText, selectedQuarter, teachers, searchByUserPerfil, userPerfil]);

 


  const tagStyle: React.CSSProperties = {
    width: "100%",
    textAlign: "center",
  };

  const columns: TableColumnsType<Teacher> = [
    {
      title: "Nombre",
      dataIndex: "name",
      key: "name",
      width: "20vw",
      sorter: (a, b) => a.name.localeCompare(b.name),
      sortDirections: ["descend", "ascend"],
      render: (value) => <div>{value}</div>,
    },
    {
      title: "Apellido",
      dataIndex: "lastName",
      key: "lastName",
      width: "20vw",
      sorter: (a, b) => a.lastName.localeCompare(b.lastName),
      sortDirections: ["descend", "ascend"],
      render: (value) => <div>{value}</div>,
    },
    {
      title: "Cédula",
      dataIndex: "ci",
      key: "ci",
      width: "10vw",
      sorter: (a, b) => Number.parseInt(a.ci) - Number.parseInt(b.ci),
      sortDirections: ["descend", "ascend"],
      render: (value) => <div>{value}</div>,
    },
    {
      title: "Tipo de contrato",
      dataIndex: "type",
      key: "type",
      width: "10vw",
      sorter: (a, b) => a.type.localeCompare(b.type),
      sortDirections: ["descend", "ascend"],
      render: (value) => {
        if (!value) {
          return (
            <Tag color="red" style={tagStyle} icon={<ExclamationCircleOutlined />}>
              Sin contrato
            </Tag>
          );
        }
        return (
          <Tag color="blue" style={tagStyle}>
            {value}
          </Tag>
        );
      },
    },
    {
      title: "Horas Asignadas",
      dataIndex: "partTime",
      render: (value, record) => {
        //no se puede usar el metodo desde el context, porque no funcionan los filtros
        const subjects = record.load ?? [];
        const totalHours: number = subjects.reduce((acc, subject) => Number(acc) + Number(subject.hours), 0);
        let color = "black";

        if (totalHours > Number(value)) {
          color = "red";
        } else if (totalHours == 0) {
          color = "grey";
        }

        if (!value)
          return (
            <Tag color="warning" icon={<ExclamationCircleOutlined />} style={tagStyle}>{`Sin contrato`}</Tag>
          );

        return (
          <div
            style={{
              textAlign: "center",
              color,
            }}>
            {`${totalHours} / ${value}`}
          </div>
        );
      },
      key: "partTime",
      width: "3vw",
      sorter: (a, b) => a.partTime - b.partTime,
      sortDirections: ["descend", "ascend"],
    },
  ];

  const onRow = (record: Teacher) => {
    return {
      //onClick: () => { setSelectedTeacherById(Number.parseInt(record.id) - 1) },
      onClick: () => {
        setSelectedTeacherById(record.id);
      },
    };
  };

  return (
    <div style={{ width: "calc(100% - 40px)", height: "100%", cursor: "pointer", gridArea: "table" }}>
      <Input
        style={{ width: "100%" }}
        placeholder="Buscar profesor"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        allowClear
      />
      {data?.length === 0 ? (
        <Tag icon={<CloseCircleOutlined />} color="error">
          Sin profesores encontrados
        </Tag>
      ) : (
        <Table
          pagination={{ position: ["topLeft", "none"] }}
          columns={columns}
          dataSource={data ?? []}
          rowKey="id"
          onRow={onRow}
          style={{ width: "100%", height: "100%", cursor: "pointer" }}
        />
      )}
    </div>
  );
};

export default TeacherTable;

