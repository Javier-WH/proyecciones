import { Teacher } from "../../interfaces/teacher";

interface Props {
  teacher: {
    q1?: Teacher | null;
    q2?: Teacher | null;
    q3?: Teacher | null;
  };
}

export default function SubjectTeacherInfo({ teacher }: Props) {
  const teacherCluster = (_teacher: Teacher, quarter: string) => {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 7fr",
          width: "100%",
          maxWidth: "300px",
          gap: "10px",
        }}>
        <span
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
            backgroundColor: _teacher.ci ? "rgb(26, 70, 110)" : "rgb(162, 190, 201)",
            color: "white",
          }}>
          {quarter}
        </span>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              color: _teacher.ci ? "black" : "gray",
            }}>
            {_teacher.name} {_teacher.lastName}
          </span>
          <span>{_teacher.ci ? `C.I. ${_teacher.ci}` : "-"}</span>
        </div>
      </div>
    );
  };

  if (!teacher.q1 && !teacher.q2 && !teacher.q3) {
    const emptyTeacher: Teacher = {
      id: "",
      ci: "",
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
    return <div>{teacherCluster(emptyTeacher, " ")}</div>;
  }

  // si el profesor es el mismo en todos los trimestres
  if (teacher.q1?.ci === teacher.q2?.ci && teacher.q1?.ci === teacher.q3?.ci) {
    return <div>{teacher.q1 && teacherCluster(teacher.q1, " ")}</div>;
  }

  if (teacher.q1?.ci === teacher.q2?.ci && teacher.q3?.ci === undefined) {
    return <div>{teacher.q1 && teacherCluster(teacher.q1, " ")}</div>;
  }

  if (teacher.q2?.ci === teacher.q3?.ci && teacher.q1?.ci === undefined) {
    return <div>{teacher.q2 && teacherCluster(teacher.q2, " ")}</div>;
  }
  return (
    <div
      style={{
        display: "flex",
        columnGap: "10px",
      }}>
      {teacher.q1 && teacherCluster(teacher.q1, "1")}
      {teacher.q2 && teacherCluster(teacher.q2, "2")}
      {teacher.q3 && teacherCluster(teacher.q3, "3")}
    </div>
  );
}

