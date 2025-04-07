import { Subject } from "../../../interfaces/subject";
import SubjectItem from "../SubjectItem/SubjectItem";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import { useContext, useEffect, useState } from "react";

interface props {
  searchByUserPerfil: boolean;
}

export default function SubjectTab({ searchByUserPerfil }: props) {
  const { subjects, userPerfil } = useContext(MainContext) as MainContextValues;
  const [subjectList, setSubjectList] = useState<Subject[]>();

  useEffect(() => {
    if (!subjects) return;
    if (!searchByUserPerfil) {
      setSubjectList(subjects);
      return;
    }

    const filteredSubjects = subjects.filter((subject) => {
      return userPerfil?.includes(subject.id);
    });
    setSubjectList(filteredSubjects);
  }, [searchByUserPerfil]);

  return (
    <div>
      {subjectList?.map((subject) => (
        <div>{subject.subject}</div>
      ))}
    </div>
  );
}

