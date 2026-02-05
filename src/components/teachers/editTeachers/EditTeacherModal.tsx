import { Modal, Input, message, Select, SelectProps, Radio, Form, Row, Col, Divider, Typography } from "antd";
import { Teacher } from "../../../interfaces/teacher";
import { useEffect, useState, useContext } from "react";
import getProfileNames from "../../../fetch/getProfileNames";
import getSimpleData from "../../../fetch/getSimpleData";
import postTeacher from "../../../fetch/postTeacher";
import ImageUploader from "../../photo/photoUploader";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import { CheckCircleOutlined, CloseCircleOutlined, UserOutlined, IdcardOutlined, BookOutlined } from "@ant-design/icons";

const { Text } = Typography;

export default function EditTeacherModal({
  teacherData,
  setTeacherData,
  fetchTeachers,
  open,
  onClose,
}: {
  teacherData: Teacher | null;
  setTeacherData: (teacherData: Teacher | null) => void;
  fetchTeachers: () => Promise<void>;
  open: boolean;
  onClose: () => void;
}) {
  const { pnfList } = useContext(MainContext) as MainContextValues;
  const [name, setName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [ci, setCi] = useState<string>("");
  const [perfilId, setPerfilId] = useState<string[]>([]);
  const [title, setTitle] = useState<string>("");
  const [genderId, setGenderId] = useState<string>("");
  const [typeId, setTypeId] = useState<string>("");
  const [profileOptions, setProfileOptions] = useState<SelectProps["options"]>([]);
  const [genderOprions, setGenderOprions] = useState<SelectProps["options"]>([]);
  const [contractOptions, setContractOptions] = useState<SelectProps["options"]>([]);
  const [pnfOptions, setPnfOptions] = useState<SelectProps["options"]>([]);
  const [pnf, setPnf] = useState<string>("");
  const [active, setActive] = useState<string>("1");

  useEffect(() => {
    if (!pnfList) return;
    setPnfOptions(
      pnfList.map((pnfItem: { id: string; name: string }) => {
        return { value: pnfItem.id, label: pnfItem.name };
      })
    );
  }, [pnfList]);

  useEffect(() => {
    if (open) {
      if (teacherData !== null) {
        setName(teacherData.name);
        setLastName(teacherData.lastName);
        setCi(teacherData.ci);
        setTitle(teacherData.title);
        setTypeId(teacherData.contractTypeId);
        setGenderId(teacherData.genderId);
        setActive(teacherData.active ? "1" : "0");
        setPerfilId(teacherData?.perfil_name_id?.split(",") || []);
        setPnf(teacherData?.PNF || "");
      } else {
        // Reset fields for adding a new teacher
        setName("");
        setLastName("");
        setCi("");
        setPerfilId([]);
        setTitle("");
        setTypeId("");
        setGenderId("");
        setActive("1");
        setPnf("");
      }
    }
  }, [teacherData, open]);

  useEffect(() => {
    async function getProfileList() {
      const profileNames = await getProfileNames();
      if (profileNames.error) {
        message.error(profileNames.error);
        return;
      }

      setProfileOptions(
        profileNames.map((profile: { id: string; name: string }) => {
          return { value: profile.id, label: profile.name };
        })
      );
    }
    getProfileList();

    async function getTeacherData() {
      const teacherData = await getSimpleData();
      if (teacherData.error) {
        message.error(teacherData.error);
        return;
      }
      const genders = teacherData.gender;
      const contractTypes = teacherData.contract;

      if (!genders || !contractTypes) {
        message.error("Error al cargar los datos");
        return;
      }

      setGenderOprions(
        genders.map((gender: { id: string; name: string }) => {
          return { value: gender.id, label: gender.name };
        })
      );

      setContractOptions(
        contractTypes.map((contract: { id: string; contractType: string }) => {
          return { value: contract.id, label: contract.contractType };
        })
      );
    }
    getTeacherData();
  }, []);

  const handleCancel = () => {
    setTeacherData(null);
    onClose();
  };

  const handleOk = async () => {
    const requestData = {
      id: teacherData?.id,
      name,
      last_name: lastName,
      ci,
      gender_id: genderId,
      contractTypes_id: typeId,
      title,
      perfil_name_id: perfilId.join(","),
      PNF: pnf,
      active,
    };

    const response = await postTeacher(requestData);
    if (response.error) {
      message.error(response.error);
      return;
    }

    fetchTeachers();
    message.success(teacherData ? "Profesor editado correctamente" : "Profesor creado correctamente");
    handleCancel();
  };

  return (
    <Modal
      width={900}
      title={<Text strong style={{ fontSize: '20px' }}>{teacherData ? 'Editar Perfil del Profesor' : 'Agregar Nuevo Profesor'}</Text>}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={teacherData ? "Guardar Cambios" : "Agregar Profesor"}
      cancelText="Cancelar"
      maskClosable={false}
      centered
    >
      <Form layout="vertical" style={{ marginTop: '20px' }}>
        <Row gutter={24}>
          {/* Left Column: Photo & Status */}
          <Col xs={24} sm={8} md={6} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '1px solid #f0f0f0' }}>
            <div style={{ marginBottom: '16px' }}>
              <ImageUploader filename={ci || 'new'} gender={genderId} />
            </div>
            <Text type="secondary" style={{ textAlign: 'center', fontSize: '12px' }}>
              Foto de Perfil
            </Text>

            <Divider style={{ margin: '16px 0' }} />

            <Text strong style={{ marginBottom: '8px' }}>Estado</Text>
            <Radio.Group
              value={active}
              onChange={(e) => setActive(e.target.value)}
              buttonStyle="solid"
              size="small"
              style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '8px', padding: '0 20px' }}
            >
              <Radio.Button value="1" style={{ textAlign: 'center' }}>
                <CheckCircleOutlined style={{ marginRight: 5, color: '#52c41a' }} /> Activo
              </Radio.Button>
              <Radio.Button value="0" style={{ textAlign: 'center' }}>
                <CloseCircleOutlined style={{ marginRight: 5, color: '#ff4d4f' }} /> Inactivo
              </Radio.Button>
            </Radio.Group>
          </Col>

          {/* Right Column: Fields */}
          <Col xs={24} sm={16} md={18}>
            <Divider orientation="left" style={{ marginTop: 0 }}>Información Personal</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Nombres" required>
                  <Input prefix={<UserOutlined />} placeholder="Nombres" value={name} onChange={(e) => setName(e.target.value)} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Apellidos" required>
                  <Input prefix={<UserOutlined />} placeholder="Apellidos" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Cédula de Identidad" required>
                  <Input prefix={<IdcardOutlined />} placeholder="CI" value={ci} onChange={(e) => setCi(e.target.value)} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Género">
                  <Select
                    placeholder="Seleccionar"
                    options={genderOprions}
                    value={genderId}
                    onChange={(value) => setGenderId(value)}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Datos Académicos y Contrato</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Título Académico">
                  <Input prefix={<BookOutlined />} placeholder="Ej. Ing. en Sistemas" value={title} onChange={(e) => setTitle(e.target.value)} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Tipo de Contrato">
                  <Select
                    placeholder="Seleccionar contrato"
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    options={contractOptions}
                    value={typeId}
                    onChange={(value) => setTypeId(value)}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item label="Programa Nacional de Formación (PNF)">
                  <Select
                    style={{ width: "100%" }}
                    showSearch
                    placeholder="Programa asociado"
                    options={pnfOptions}
                    value={pnf}
                    onChange={(value) => setPnf(value)}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Perfiles y Habilidades">
              <Select
                mode="multiple"
                allowClear
                placeholder="Etiquetas de perfil (ej. Programador, Matemático)"
                filterOption={(input, option) =>
                  String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
                options={profileOptions}
                value={perfilId}
                onChange={(value) => setPerfilId(value)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

