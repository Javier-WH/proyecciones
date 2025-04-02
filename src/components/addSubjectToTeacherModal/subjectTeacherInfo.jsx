import Teacher from "../../interfaces/teacher";

export default function SubjectTeacherInfo(teacher: Teacher[]) {
  return (
    <div>
      <span>
        {teacher.name} {teacher.lastName}
      </span>
      <span>{`C.I. ${teacher.ci}`}</span>
    </div>
  );
}

