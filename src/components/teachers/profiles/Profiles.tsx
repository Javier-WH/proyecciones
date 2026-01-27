import { Button, message, Select, SelectProps, Card, Row, Col, Typography, Divider, List, Empty } from "antd";
import { useEffect, useRef, useState } from "react";
import getProfileNames from "../../../fetch/getProfileNames";
import getProfile from "../../../fetch/getProfile";
import getPensum from "../../../fetch/getPensum";
import getPnf from "../../../fetch/getPnf";
import getTrayectos from "../../../fetch/getTrayectos";
import getMaya from "../../../fetch/getMaya";
import ProfileModal from "./profileModal/ProfileModal";
import deleteSubjectInProfile from "../../../fetch/deleteSubjectInPerfil";
import postSubjectToPerfil from "../../../fetch/postSubjectToPerfil";
import DeleteProfileModal from "./profileModal/deleteProfileModal";
import { generateSubjectProfileId } from "../../../utils/subjectProfile";
import { PlusOutlined, DeleteOutlined, BookOutlined, DeploymentUnitOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

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

  const handleSubjectChange = (value: string, option: any) => {
    setSelectedSubject(value);
    setSelectedSubjectName(option?.label ?? "");
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
    <div style={{ padding: '24px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
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

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <DeploymentUnitOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          <Title level={2} style={{ margin: 0 }}>Gestión de Perfiles</Title>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card title="Asignar Materias a Perfiles" bordered={false} style={{ height: '100%' }}>
              <Row gutter={16} style={{ marginBottom: '20px' }}>
                <Col xs={24} md={12}>
                  <Text strong>Seleccionar Perfil</Text>
                  <Select
                    placeholder="Seleccione un perfil"
                    style={{ width: '100%', marginTop: '5px' }}
                    onChange={handlePerfilChange}
                    options={perfilList}
                    size="large"
                  />
                </Col>
                <Col xs={24} md={12} style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                  <Button type="primary" onClick={() => setOpenProfileModal(true)}>
                    Crear Nuevo
                  </Button>
                  <Button danger onClick={() => setOpenDeleteProfileModal(true)}>
                    Eliminar
                  </Button>
                </Col>
              </Row>

              <Divider>Configuración de Materias</Divider>

              <div style={{ backgroundColor: '#fafafa', padding: '16px', borderRadius: '8px' }}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8}>
                    <Text type="secondary">Programa (PNF)</Text>
                    <Select
                      placeholder="Seleccione PNF"
                      style={{ width: "100%" }}
                      onChange={(value: string) => setSelectedPnf(value)}
                      options={pnfList}
                      allowClear
                    />
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Text type="secondary">Trayecto</Text>
                    <Select
                      placeholder="Seleccione Trayecto"
                      style={{ width: "100%" }}
                      onChange={(value: string) => setSelectedTrayecto(value)}
                      options={trayectoList}
                      allowClear
                    />
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Text type="secondary">Malla Curricular</Text>
                    <Select
                      placeholder="Seleccione Malla"
                      style={{ width: "100%" }}
                      onChange={(value: string) => setSelectedMaya(value)}
                      value={selectedMaya}
                      options={mayaList}
                      allowClear
                      loading={mayaLoading}
                      disabled={mayaLoading}
                    />
                  </Col>
                  <Col xs={24} sm={18} md={16}>
                    <Text type="secondary">Materia a agregar</Text>
                    <Select
                      showSearch
                      placeholder="Busque la materia..."
                      style={{ width: "100%" }}
                      onChange={handleSubjectChange}
                      options={subjectList as SubjectOption[]}
                      loading={isLoadingSubjects}
                      disabled={isLoadingSubjects}
                      filterOption={filterOption}
                    />
                  </Col>
                  <Col xs={24} sm={6} md={8} style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={addSubjectToPefil}
                      disabled={selectedSubject === null || selectedPerfil === null}
                      block
                    >
                      Agregar
                    </Button>
                  </Col>
                </Row>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card
              title={<span><BookOutlined /> Materias en este Perfil</span>}
              bordered={false}
              style={{ height: '100%', minHeight: '400px' }}
              bodyStyle={{ padding: '0 10px', height: 'calc(100% - 58px)', overflowY: 'auto' }}
            >
              {subjectsINperfil.length > 0 ? (
                <List
                  dataSource={subjectsINperfil}
                  renderItem={(subject) => (
                    <List.Item
                      actions={[
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteSubjectInPerfil(subject.id)}
                        />
                      ]}
                    >
                      <List.Item.Meta
                        title={<Text style={{ fontSize: '14px' }}>{subject.subject_name}</Text>}
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Empty description={selectedPerfil ? "Sin materias asignadas" : "Seleccione un perfil"} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}

