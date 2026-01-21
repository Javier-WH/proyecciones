import { Button, message, Select, SelectProps } from "antd";
import { useEffect, useState, useContext } from "react";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import getProfileNames from "../../../fetch/getProfileNames";
import getProfile from "../../../fetch/getProfile";
import getSubjects from "../../../fetch/getSubjects";
import getPnf from "../../../fetch/getPnf";
import getTrayectos from "../../../fetch/getTrayectos";
import getMaya from "../../../fetch/getMaya";
import ProfileModal from "./profileModal/ProfileModal";
import { FaTrashCan, FaPlus } from "react-icons/fa6";
import deleteSubjectInProfile from "../../../fetch/deleteSubjectInPerfil";
import postSubjectToPerfil from "../../../fetch/postSubjectToPerfil";
import DeleteProfileModal from "./profileModal/deleteProfileModal";
import { generateSubjectProfileId } from "../../../utils/subjectProfile";

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
  const [pnfList, setPnfList] = useState<SelectProps["options"]>([]);
  const [rawPnfList, setRawPnfList] = useState<any[] | null>(null);
  const [trayectoList, setTrayectoList] = useState<SelectProps["options"]>([]);
  const [mayaList, setMayaList] = useState<SelectProps["options"]>([]);
  const [selectedPnf, setSelectedPnf] = useState<string | null>(null);
  const [selectedTrayecto, setSelectedTrayecto] = useState<string | null>(null);
  const [selectedMaya, setSelectedMaya] = useState<string | null>(null);
  const [subjectsINperfil, setSubjectsINperfil] = useState<basicSubject[]>([]);
  const [selectedPerfil, setSelectedPerfil] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const main = useContext(MainContext) as MainContextValues | null;

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
    // Requerimos maya para la llamada; si no está seleccionada, no hacemos fetch
    if (selectedMaya === null) return;
    // Preferir subjects provistas por el contexto (llegan desde createProyectionPanel)
    const contextSubjects = main?.subjects ?? [];

    let subjectInputData: SubjectOption[] = [];

    if (Array.isArray(contextSubjects) && contextSubjects.length > 0) {
      const filtered = contextSubjects.filter((s: any) => {
        if (selectedPnf && String(s.pnfId) !== String(selectedPnf)) return false;
        if (selectedTrayecto && String(s.trayectoId) !== String(selectedTrayecto)) return false;
        return true;
      });

      // Mapear usando la propiedad `subject` que usa TabPanel/formatSubjects
      filtered.forEach((s: any) => {
        const name = s.subject || s.subject_name || s.name;
        if (!name) return;
        const backendId = String(
          s.pensum_id ?? s.pensumId ?? s.subjectId ?? s.id ?? generateSubjectProfileId(name),
        );
        if (!backendId) return;
        if (!subjectInputData.some((opt) => opt.value === backendId)) {
          subjectInputData.push({ value: backendId, label: name });
        }
      });
    }

    // Si no hay datos en contexto, fallback a la API
    if (subjectInputData.length === 0) {
      const subjectData = await getSubjects({
        pnfId: selectedPnf,
        trayectoId: selectedTrayecto,
        mayaId: selectedMaya,
      });
      if (Array.isArray(subjectData)) {
        const cleanSubjectData = subjectData.filter((subject: { active: number }) => subject.active === 1);
        cleanSubjectData.forEach((subject: { id: string; name: string }) => {
          const backendId = String(subject.id ?? subject.pensum_id ?? generateSubjectProfileId(subject.name));
          subjectInputData.push({ value: backendId, label: subject.name });
        });
      } else if ((subjectData as any)?.error) {
        message.error((subjectData as any).error);
      }
    }

    setSubjectList(subjectInputData);
  };

  const getPnfList = async () => {
    const data = await getPnf();
    if (!data) return;
    setRawPnfList(data);
    const options = data.map((p: any) => ({
      value: String(p.id),
      label: String(p.name || p.description || p.id),
    }));
    setPnfList(options);
  };

  const getTrayectoList = async () => {
    const data = await getTrayectos();
    if (!data) return;
    const options = data.map((t: any) => ({ value: String(t.id ?? t.name), label: t.name || String(t.id) }));
    setTrayectoList(options);
  };

  const getMayaList = async (pnfId: string | null) => {
    if (!pnfId) {
      setMayaList([]);
      return;
    }
    // intentar resolver sagaPNFID desde el listado crudo de PNFs
    const sagaPNFID =
      rawPnfList?.find((p) => String(p.id) === String(pnfId))?.saga_id?.toString() ?? String(pnfId);
    const data = await getMaya({ sagaPNFID });
    const mayadata = data?.data?.mayas ?? data?.mayas ?? data;
    if (!mayadata) {
      setMayaList([]);
      return;
    }

    const sortedMayas = mayadata.sort((a: any, b: any) => Number(b.id) - Number(a.id));
    const filteredMayas = sortedMayas.filter((maya: any) => maya.tipopensum_id === 1);

    const mayaOpt = filteredMayas.map((maya: any) => ({
      value: String(maya.id),
      label: String(maya.descripcion || maya.name || maya.id),
    }));

    setMayaList(mayaOpt);
    if (mayaOpt.length > 0) setSelectedMaya(mayaOpt[0].value);
  };

  useEffect(() => {
    async function fetchData() {
      await getPerfilList();
      await getPnfList();
      await getTrayectoList();
    }
    fetchData();
  }, []);

  useEffect(() => {
    // Cuando cambie el PNF, recargar mayas y limpiar selección de maya y subjects
    getMayaList(selectedPnf);
    setSelectedMaya(null);
    setSubjectList([]);
  }, [selectedPnf]);

  useEffect(() => {
    // Cuando se seleccione una maya válida, cargar materias
    getSubjectList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMaya]);

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

    const alreadyInProfile = subjectsINperfil.some((subject) => {
      if (String(subject.subject_id) === String(selectedSubject)) return true;
      if (String(subject.id) === String(selectedSubject)) return true;
      if (String(subject.pensum_id) === String(selectedSubject)) return true;
      const normalizedId = generateSubjectProfileId(subject.subject_name);
      return normalizedId === selectedSubject;
    });

    if (alreadyInProfile) {
      message.warning("Esta materia ya se encuentra en el perfil seleccionado");
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
          <label htmlFor="">PNF</label>
          <Select
            placeholder="Seleccione PNF"
            style={selectorStyle}
            onChange={(value: string) => setSelectedPnf(value)}
            options={pnfList}
            allowClear
          />
        </div>

        <div style={{ flex: 1 }}>
          <label htmlFor="">Trayecto</label>
          <Select
            placeholder="Seleccione Trayecto"
            style={selectorStyle}
            onChange={(value: string) => setSelectedTrayecto(value)}
            options={trayectoList}
            allowClear
          />
        </div>

        <div style={{ flex: 1 }}>
          <label htmlFor="">Maya</label>
          <Select
            placeholder="Seleccione Maya"
            style={selectorStyle}
            onChange={(value: string) => setSelectedMaya(value)}
            options={mayaList}
            allowClear
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

