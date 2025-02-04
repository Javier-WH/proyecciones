import "./proyeccionesSubjects.css";
import { useContext, useEffect, useState } from "react";
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { Radio, Button, Popconfirm, message, Tooltip } from "antd";
import type { RadioChangeEvent } from "antd";
import { QuestionCircleOutlined, DeleteOutlined } from "@ant-design/icons";
import TablePensum from "./table/table";
import { Subject } from "../../interfaces/subject";
import { GiAutoRepair } from "react-icons/gi";
import { useNavigate } from "react-router-dom";

export default function ProyeccionesSubjects() {
  const { subjects, teachers, handleSubjectChange, proyectionsDone } = useContext(
    MainContext
  ) as MainContextValues;
  const [errorRadio, setErrorRadio] = useState(true);
  const [asignedSubjects, setAsignedSubjects] = useState<Subject[]>([]);
  const navigate = useNavigate();

  const onChangeRadioError = (e: RadioChangeEvent) => {
    //console.log('radio checked', e.target.value);
    setErrorRadio(e.target.value);
  };

  //aqui se pasa el arreglo de materias que tienen los profesores asignadas
  useEffect(() => {
    if (!teachers) return;
    const asignedSubjectsQ1 = teachers.q1.map((teacher) => teacher.load).flat();
    const asignedSubjectsQ2 = teachers.q2.map((teacher) => teacher.load).flat();
    const asignedSubjectsQ3 = teachers.q3.map((teacher) => teacher.load).flat();
    const uniqueAssignedSubjects = [
      ...new Map(
        [...asignedSubjectsQ1, ...asignedSubjectsQ2, ...asignedSubjectsQ3].map((obj) => [obj?.pensum_id, obj])
      ).values(),
    ];
    setAsignedSubjects(uniqueAssignedSubjects as Subject[]);
  }, [teachers]);

  const handleRemoveErrorSubject = () => {
    if (!subjects) return;
    const subjectsCopy = JSON.parse(JSON.stringify(subjects));
    //filtra que no tenga null
    const filteredSubjects = subjectsCopy.filter((subject: Subject) =>
      Object.values(subject).every((value) => value !== null)
    );
    //filtra las horas
    const filteredHours = filteredSubjects.filter((subject: Subject) => subject.hours > 0);
    handleSubjectChange(filteredHours);
    message.success("Las materias con error fueron eliminadas de la proyección");
  };
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

        <Radio.Group onChange={onChangeRadioError} value={errorRadio}>
          <Radio value={true} style={{ color: "white" }}>
            Todas
          </Radio>
          <Radio value={false} style={{ color: "white" }}>
            Error
          </Radio>
        </Radio.Group>
        <Popconfirm
          title="¿Deseas borrar las materias con error?"
          description="Esta operación no se puede deshacer"
          onConfirm={handleRemoveErrorSubject}
          onCancel={() => {}}
          okText="Borrar Todas"
          cancelText="Cancelar"
          icon={<QuestionCircleOutlined style={{ color: "red" }} />}
          okButtonProps={{ danger: true }}>
          <Tooltip placement="bottom" title={"Borrar TODAS las materias con error"}>
            <Button
              type="link"
              danger
              shape="circle"
              icon={<DeleteOutlined style={{ fontSize: "1.5rem" }} />}
            />
          </Tooltip>
        </Popconfirm>
      </div>

      <TablePensum
        subjects={
          errorRadio
            ? subjects?.concat(asignedSubjects)
            : subjects?.concat(asignedSubjects)?.filter((subject) => {
                return Object.values(subject).some((value) => value === null || value === 0);
              })
        }
      />
    </>
  );
}

