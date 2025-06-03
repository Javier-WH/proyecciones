import { Button, message, Select, SelectProps } from "antd";
import { useEffect, useState } from "react";
import getProfileNames from "../../../fetch/getProfileNames";
import getProfile from "../../../fetch/getProfile";
import getSubjects from "../../../fetch/getSubjects";
import ProfileModal from "./profileModal/ProfileModal";
import { FaTrashCan, FaPlus } from "react-icons/fa6";
import deleteSubjectInProfile from "../../../fetch/deleteSubjectInPerfil";
import postSubjectToPerfil from "../../../fetch/postSubjectToPerfil";
import DeleteProfileModal from "./profileModal/deleteProfileModal";

interface basicSubject {
  id: string;
  subject_id: string;
  subject_name: string;
}

interface SubjectOption {
  label: string;
  value: string;
}

export default function Profiles() {
  const [openProfileModal, setOpenProfileModal] = useState<boolean>(false);
  const [openDeleteProfileModal, setOpenDeleteProfileModal] = useState<boolean>(false);
  const [perfilList, setPerfilList] = useState<SelectProps["options"]>([]);
  const [subjectList, setSubjectList] = useState<SelectProps["options"]>([]);
  const [subjectsINperfil, setSubjectsINperfil] = useState<basicSubject[]>([]);
  const [selectedPerfil, setSelectedPerfil] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const getPerfilList = async () => {
    const profileData = await getProfileNames();

    if (profileData.error) {
      message.error(profileData.error);
      return;
    }

    const profileInputData = profileData.map((profile: { id: string; name: string }) => {
      return { value: profile.id, label: profile.name };
    });

    setPerfilList(profileInputData);
  };

  const getSubjectList = async () => {
    const subjectData = await getSubjects();

    if (subjectData.error) {
      message.error(subjectData.error);
      return;
    }

    const cleanSubjectData = subjectData.filter((subject: { active: number }) => {
      return subject.active === 1;
    });

    const subjectInputData = cleanSubjectData.map((subject: { id: string; name: string }) => {
      return { value: subject.id, label: subject.name };
    });

    setSubjectList(subjectInputData);
  };

  useEffect(() => {
    async function fetchData() {
      await getPerfilList();
      await getSubjectList();
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

  const handleDeleteSubjectInPerfil = async (subjectID: string) => {
    const response = await deleteSubjectInProfile({
      id: subjectID,
    });

    if (response.error) {
      message.error("No se ha podido eliminar la materia del perfil");
      return;
    }
    handlePerfilChange(selectedPerfil as string);
    message.success("Materia eliminada del perfil");
  };

  const addSubjectToPefil = async () => {
    if (selectedPerfil === null || selectedSubject === null) {
      message.error("Debe seleccionar un perfil y una materia");
      return;
    }
    const request = await postSubjectToPerfil({
      perfil_name_id: selectedPerfil,
      subject_id: selectedSubject,
    });
    if (request.error) {
      message.error(request.error);
      return;
    }
    handlePerfilChange(selectedPerfil as string);
    message.success("Materia añadida al perfil");
  };

  const filterOption: SelectProps<SubjectOption>["filterOption"] = (input, option) => {
    const label = String(option?.label ?? "").toLowerCase();
    return label.includes(input.toLowerCase());
  };

  return (
    <div>
      <ProfileModal
        isModalOpen={openProfileModal}
        setIsModalOpen={setOpenProfileModal}
        getPerfilList={getPerfilList}
      />
      <DeleteProfileModal
        isModalOpen={openDeleteProfileModal}
        setIsModalOpen={setOpenDeleteProfileModal}
        getPerfilList={getPerfilList}
        perfilList={perfilList}
      />
      <div
        className="title-bar-container"
        style={{
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
        <Button type="dashed" style={{ flex: 1 }} onClick={() => setOpenDeleteProfileModal(true)}>
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
          alignItems: "center",
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
            showSearch
            placeholder="Seleccione una materia o más materias"
            style={selectorStyle}
            onChange={handleSubjectChange}
            options={subjectList as SubjectOption[]}
            filterOption={filterOption}
          />
        </div>

        <Button
          shape="circle"
          type="primary"
          icon={<FaPlus />}
          style={{ flex: 1, maxWidth: "1rem", marginTop: "1rem" }}
          onClick={addSubjectToPefil}
          disabled={selectedSubject === null || selectedPerfil === null}
        />
      </div>

      <h3 style={{ color: "grey", width: "100%", textAlign: "center" }}>Materias en el Perfil</h3>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          rowGap: "1rem",
          width: "100%",
          maxWidth: "1000px",
          minWidth: "500px",
          margin: "50px auto",
          maxHeight: "calc(95vh - 350px)",
          overflowY: "auto",
        }}>
        {subjectsINperfil.map((subject) => {
          return (
            <div
              key={subject.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                columnGap: "1rem",
                width: "100%",
                maxWidth: "600px",
                minWidth: "400px",
              }}>
              <span>{subject.subject_name}</span>
              <div>
                <Button
                  shape="circle"
                  type="primary"
                  danger
                  icon={<FaTrashCan />}
                  onClick={() => handleDeleteSubjectInPerfil(subject.id)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

