import { Button, message, Select, SelectProps } from "antd";
import { useEffect, useState } from "react";
import getProfileNames from "../../../fetch/getProfileNames";
import getProfile from "../../../fetch/getProfile";
import getSubjects from "../../../fetch/getSubjects";
import ProfileModal from "./profileModal/ProfileModal";

interface basicSubject {
  id: string;
  subject_id: string;
  subject_name: string;
}

export default function Profiles() {
  const [openProfileModal, setOpenProfileModal] = useState<boolean>(false);
  const [perfilList, setPerfilList] = useState<SelectProps["options"]>([]);
  const [subjectList, setSubjectList] = useState<SelectProps["options"]>([]);
  const [subjectsINperfil, setSubjectsINperfil] = useState<basicSubject[]>([]);
  const [selectedPerfil, setSelectedPerfil] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  useEffect(() => {}, [selectedPerfil, selectedSubject]);

  useEffect(() => {
    async function fetchData() {
      const profileData = await getProfileNames();

      if (profileData.error) {
        message.error(profileData.error);
        return;
      }

      const profileInputData = profileData.map((profile: { id: string; name: string }) => {
        return { value: profile.id, label: profile.name };
      });

      setPerfilList(profileInputData);

      const subjectData = await getSubjects();

      if (subjectData.error) {
        message.error(subjectData.error);
        return;
      }

      const subjectInputData = subjectData.map((subject: { id: string; name: string }) => {
        return { value: subject.id, label: subject.name };
      });
      setSubjectList(subjectInputData);
    }
    fetchData();
  }, []);

  const handlePerfilChange = async (value: string) => {
    const profileData = await getProfile({ id: value });

    if (profileData.error) {
      message.error(profileData.error);
      return;
    }
    setSelectedPerfil(value);
    setSubjectsINperfil(profileData);
  };

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
  };

  const selectorStyle = {
    width: "100%",
    maxWidth: "600px",
    minWidth: "300px",
  };

  return (
    <div>
      <ProfileModal
        isModalOpen={openProfileModal}
        setIsModalOpen={setOpenProfileModal}
        setPerfilList={setPerfilList}
      />
      <div
        className="title-bar-container"
        style={{
          gridArea: "header",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
        <h1>Perfiles</h1>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          columnGap: "1rem",
          width: "100%",
          maxWidth: "500px",
          minWidth: "300px",
          flexWrap: "wrap",
          margin: "50px auto",
        }}>
        <Button type="primary" style={{ flex: 1 }} onClick={() => setOpenProfileModal(true)}>
          Crear Perfil
        </Button>
        <Button type="dashed" style={{ flex: 1 }}>
          Eliminar Perfil
        </Button>
      </div>
      <div
        style={{
          display: "flex",
          columnGap: "1rem",
          width: "100%",
          maxWidth: "1000px",
          minWidth: "500px",
          flexWrap: "wrap",
          margin: "50px auto",
        }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="">Perfil</label>
          <Select
            placeholder="Seleccione un perfil"
            style={selectorStyle}
            onChange={handlePerfilChange}
            options={perfilList}
          />
        </div>

        <div style={{ flex: 1 }}>
          <label htmlFor="">Materia</label>
          <Select
            //showSearch
            placeholder="Seleccione una materia o más materias"
            style={selectorStyle}
            onChange={handleSubjectChange}
            options={subjectList}
          />
        </div>
      </div>

      <div>
        {subjectsINperfil.map((subject) => {
          return (
            <div key={subject.id}>
              <h2>{subject.subject_name}</h2>
            </div>
          );
        })}
      </div>
    </div>
  );
}

