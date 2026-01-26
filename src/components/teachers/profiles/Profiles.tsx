import { Button, message, Select, SelectProps } from "antd";
import { useEffect, useRef, useState } from "react";
import getProfileNames from "../../../fetch/getProfileNames";
import getProfile from "../../../fetch/getProfile";
import getPensum from "../../../fetch/getPensum";
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
  subject_id?: string;
  subject_name?: string;
  pensum_id?: string;
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
  const [mayaLoading, setMayaLoading] = useState<boolean>(false);
  const [selectedPnf, setSelectedPnf] = useState<string | null>(null);
  const [selectedTrayecto, setSelectedTrayecto] = useState<string | null>(null);
  const [selectedMaya, setSelectedMaya] = useState<string | null>(null);
  const [subjectsINperfil, setSubjectsINperfil] = useState<basicSubject[]>([]);
  const [selectedPerfil, setSelectedPerfil] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState<boolean>(false);
  const subjectsRequestId = useRef(0);

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
    // Requerimos PNF, trayecto y maya para obtener el pensum
    if (!selectedPnf || !selectedTrayecto || !selectedMaya) {
      setSubjectList([]);
      return;
    }
    const requestId = ++subjectsRequestId.current;
    setIsLoadingSubjects(true);

    try {
      const pensumData = await getPensum({
        programaId: selectedPnf,
        trayectoId: selectedTrayecto,
        mayaId: selectedMaya,
      });

      // Ignorar respuestas obsoletas
      if (requestId !== subjectsRequestId.current) return;

      if ((pensumData as any)?.error) {
        // Mostrar error solo para la última petición
        message.error("Error al obtener pensum");
        setSubjectList([]);
        setIsLoadingSubjects(false);
        return;
      }

      const pensums = pensumData?.data?.pensums ?? pensumData?.pensums ?? [];
      const subjectInputData: SubjectOption[] = pensums.map((s: any) => {
        const name = s.subject || s.name || s.subject_name || "";
        const backendId = String(s.pensum_id ?? s.id ?? generateSubjectProfileId(name));
        return { value: backendId, label: name };
      });

      // Ignorar si ya existe una petición más nueva
      if (requestId !== subjectsRequestId.current) return;

      setSubjectList(subjectInputData);
    } catch (e) {
      console.error(e);
      // Ignorar si ya existe una petición más nueva
      if (requestId !== subjectsRequestId.current) return;
      setSubjectList([]);
    } finally {
      if (requestId === subjectsRequestId.current) setIsLoadingSubjects(false);
    }
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

    setMayaLoading(true);
    setMayaList([]);
    setSelectedMaya(null);

    try {
      const data = await getMaya({ sagaPNFID });
      const mayadata = data?.data?.mayas;
      if (!mayadata) {
        setMayaList([]);
        return;
      }

      const sortedMayas = mayadata.sort((a: any, b: any) => Number(b.id) - Number(a.id));
      // No filtrar por tipopensum_id para mantener la misma lógica que en tabPanel
      const mayaOpt = sortedMayas.map((maya: any) => ({
        value: String(maya.id),
        label: String(maya.descripcion || maya.name || maya.id),
      }));

      setMayaList(mayaOpt);
      if (mayaOpt.length > 0) setSelectedMaya(mayaOpt[0].value);
    } catch (e) {
      console.error(e);
      setMayaList([]);
    } finally {
      setMayaLoading(false);
    }
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
    // Cargar materias solo cuando cambie trayecto o maya.
    // Evita ejecutar el fetch prematuramente al cambiar el PNF (cuando la maya aún es la anterior).
    getSubjectList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrayecto, selectedMaya]);

  const handlePerfilChange = async (value: string) => {
    const profileData = await getProfile({ id: value });

    if (profileData.error) {
      message.error(profileData.error);
      return;
    }
    setSelectedPerfil(value);
    setSubjectsINperfil(profileData);
  };

  const [selectedSubjectName, setSelectedSubjectName] = useState<string>("");
  // ... existing state ...

  const handleSubjectChange = (value: string, option: any) => {
    setSelectedSubject(value);
    setSelectedSubjectName(option?.label ?? "");
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
      // Check by ID
      if (String(subject.subject_id) === String(selectedSubject)) return true;
      if (String(subject.id) === String(selectedSubject)) return true;
      if (String(subject.pensum_id) === String(selectedSubject)) return true;

      const normalizedId = generateSubjectProfileId(subject.subject_name);
      if (normalizedId === selectedSubject) return true;

      // Check by Name (Case Insensitive)
      if (subject.subject_name?.trim().toLowerCase() === selectedSubjectName?.trim().toLowerCase()) {
        return true;
      }

      return false;
    });

    if (alreadyInProfile) {
      message.warning("Esta materia ya se encuentra en el perfil seleccionado");
      return;
    }

    const request = await postSubjectToPerfil({
      perfil_name_id: selectedPerfil,
      subject_id: selectedSubject,
      subject_name: selectedSubjectName
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
        perfilList={perfilList as { value: string; label: string }[]}
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
            value={selectedMaya}
            options={mayaList}
            allowClear
            loading={mayaLoading}
            disabled={mayaLoading}
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
            loading={isLoadingSubjects}
            disabled={isLoadingSubjects}
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

