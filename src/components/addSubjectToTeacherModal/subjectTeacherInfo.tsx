import { Teacher } from "../../interfaces/teacher";

interface Props {
  teacher: {
    q1?: Teacher | null;
    q2?: Teacher | null;
    q3?: Teacher | null;
  };
}

export default function SubjectTeacherInfo({ teacher }: Props) {
  const teacherCluster = (_teacher: Teacher | null) => {
    if (!_teacher) return null;

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 7fr",
          width: "100%",
          maxWidth: "300px",
          gap: "10px",
        }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: "black" }}>
            {_teacher.name} {_teacher.lastName}
          </span>
          <span style={{ height: "20px" }}>{_teacher.ci.length > 0 && `C.I. ${_teacher.ci}`}</span>
        </div>
      </div>
    );
  };

  // Verificar si no hay profesores asignados en ningún trimestre
  if (!teacher.q1 && !teacher.q2 && !teacher.q3) {
    const emptyTeacher: Teacher = {
      id: "",
      ci: ``,
      name: "No hay docente asignado",
      lastName: "",
      partTime: 0,
      type: "",
      title: "",
      photo: null,
      load: null,
      perfilName: "",
      perfil_name_id: "",
      perfil: [],
      gender: "",
      genderId: "",
      contractTypeId: "",
      active: false,
    };
    return <div>{teacherCluster(emptyTeacher)}</div>;
  }

  // Verificar si todos los trimestres tienen el mismo profesor
  const allSame =
    teacher.q1 &&
    teacher.q2 &&
    teacher.q3 &&
    teacher.q1.ci === teacher.q2.ci &&
    teacher.q2.ci === teacher.q3.ci;

  // Renderizar el profesor una vez si todos son iguales
  if (allSame) {
    return (
      <div
        style={{
          display: "flex",
          columnGap: "10px",
        }}>
        {teacherCluster(teacher.q1 ?? null)}
      </div>
    );
  }

  // Renderizar cada trimestre en orden si no son iguales
  return (
    <div
      style={{
        display: "flex",
        columnGap: "10px",
      }}>
      {teacherCluster(teacher.q1 ?? null)}
      {teacherCluster(teacher.q2 ?? null)}
      {teacherCluster(teacher.q3 ?? null)}
    </div>
  );
}

