//import { MainContext } from "../../../context/mainContext"
//import { MainContextValues } from "../../../interfaces/contextInterfaces"
import { Button, Input } from "antd";
import { LiaUserEditSolid } from "react-icons/lia";
import { Teacher } from "../../../interfaces/teacher";
import { useEffect, useState } from "react";
import EditTeacherModal from "./EditTeacherModal";
import getTeachers from "../../../fetch/getTeachers";
import "./editTeachers.css";

export default function EditTeachers() {
  //const { teachers } = useContext(MainContext) as MainContextValues
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);
  const [search, setSearch] = useState<string>("");

  const onClickEdit = (data: Teacher) => {
    setTeacherData(data);
  };

  async function fetchTeachers() {
    const teachers = await getTeachers();
    setTeachers(teachers);
  }

  useEffect(() => {
    fetchTeachers();
  }, []);

  const getTeacherList = () => {
    if (!teachers) return [];
    if (search.length > 0) {
      return teachers.filter(
        (teacher) =>
          teacher.name.toLowerCase().includes(search.toLowerCase()) ||
          teacher?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
          teacher?.ci?.toLowerCase().includes(search.toLowerCase()) ||
          teacher.perfilName?.toLowerCase()?.includes(search.toLowerCase())
      );
    }
    return teachers;
  };

  if (teachers === null) return <div>Loading...</div>;
  return (
    <div>
      <EditTeacherModal
        teacherData={teacherData}
        setTeacherData={setTeacherData}
        fetchTeachers={fetchTeachers}
      />
      <h2 className="edit-teacher-list-title">Editar Profesores</h2>
      <div className="edit-teacher-list-container">
        <Input placeholder="Buscar profesor" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="edit-teacher-list-header">
          <span>Apellidos</span>
          <span>Nombres</span>
          <span>Cédula</span>
          <span>Perfil</span>
          <span>Editar</span>
        </div>

        {getTeacherList().map((teacher) => {
          return (
            <div className="edit-teacher-list-row" key={teacher.id}>
              <span>{teacher.lastName}</span>
              <span>{teacher.name}</span>
              <span>{teacher.ci}</span>
              <span>{teacher.perfilName}</span>
              <Button
                type="primary"
                shape="circle"
                icon={<LiaUserEditSolid />}
                onClick={() => onClickEdit(teacher)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
