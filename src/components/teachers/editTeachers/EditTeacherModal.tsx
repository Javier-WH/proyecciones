import { Modal, Input, message, Select, SelectProps, Radio } from "antd";
import { Teacher } from "../../../interfaces/teacher";
import { useEffect, useState, useContext } from "react";
import placeholder from "./../../../assets/malePlaceHolder.svg";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";
import getProfileNames from "../../../fetch/getProfileNames";
import getSimpleData from "../../../fetch/getSimpleData";
import postTeacher from "../../../fetch/postTeacher";

export default function EditTeacherModal({
  teacherData,
  setTeacherData,
  fetchTeachers,
}: {
  teacherData: Teacher | null;
  setTeacherData: (teacherData: Teacher | null) => void;
  fetchTeachers: () => Promise<void>;
}) {
  const { handleSingleTeacherChange, teachers } = useContext(MainContext) as MainContextValues;

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [ci, setCi] = useState<string>("");
  const [perfilId, setPerfilId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [genderId, setGenderId] = useState<string>("");
  const [typeId, setTypeId] = useState<string>("");
  const [profileOptions, setProfileOptions] = useState<SelectProps["options"]>([]);
  const [genderOprions, setGenderOprions] = useState<SelectProps["options"]>([]);
  const [contractOptions, setContractOptions] = useState<SelectProps["options"]>([]);
  const [active, setActive] = useState<string>("1");

  useEffect(() => {
    if (teacherData !== null) {
      setName(teacherData.name);
      setLastName(teacherData.lastName);
      setCi(teacherData.ci);
      setPerfilId(teacherData.perfil_name_id);
      setTitle(teacherData.title);
      setIsModalOpen(true);
      setTypeId(teacherData.contractTypeId);
      setGenderId(teacherData.genderId);
      setActive(teacherData.active ? "1" : "0");
      // console.log(teacherData);
    } else {
      setName("");
      setLastName("");
      setCi("");
      setPerfilId("");
      setTitle("");
      setTypeId("");
      setGenderId("");
      setActive("1");
      setIsModalOpen(false);
    }
  }, [teacherData]);

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
      perfil_name_id: perfilId,
      active,
    };

    const response = await postTeacher(requestData);
    if (response.error) {
      message.error(response.error);
      return;
    }

    fetchTeachers();
    message.success("Profesor editado correctamente");
    setTeacherData(null);
  };

  return (
    <Modal title="Editar Profesor" open={isModalOpen} onOk={handleOk} onCancel={handleCancel}>
      <div className="edit-teacher-modal-container">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 5fr", gap: "5px" }}>
          <img src={placeholder} alt="" style={{ width: "165px" }} />
          <div>
            <div className="edit-teacher-modal-row">
              <label>Nombre</label>
              <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="edit-teacher-modal-row">
              <label>Apellido</label>
              <Input placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="edit-teacher-modal-row">
              <label>Cédula</label>
              <Input placeholder="Cédula" value={ci} onChange={(e) => setCi(e.target.value)} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <div className="edit-teacher-modal-row" style={{ width: "100%", flex: 1 }}>
            <label style={{ display: "block" }}>Tipo</label>
            <Select
              style={{ width: "100%" }}
              showSearch
              placeholder="Selecciona un tipo de contrato"
              filterOption={(input, option) =>
                String(option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={contractOptions}
              value={typeId}
              onChange={(value) => setTypeId(value)}
            />
          </div>

          <div className="edit-teacher-modal-row" style={{ width: "100%", flex: 1 }}>
            <label style={{ display: "block" }}>Perfil</label>
            <Select
              style={{ width: "100%" }}
              showSearch
              placeholder="Selecciona un perfil"
              filterOption={(input, option) =>
                String(option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={profileOptions}
              value={perfilId}
              onChange={(value) => setPerfilId(value)}
            />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "stretch", gap: "10px" }}>
          <div className="edit-teacher-modal-row" style={{ width: "100%", flex: 1 }}>
            <label>Título</label>
            <Input
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          <div className="edit-teacher-modal-row" style={{ width: "100%", flex: 1 }}>
            <label style={{ display: "block" }}>Género</label>
            <Select
              style={{ width: "100%" }}
              showSearch
              placeholder="Selecciona un Genero"
              options={genderOprions}
              value={genderId}
              onChange={(value) => setGenderId(value)}
            />
          </div>
          <div className="edit-teacher-modal-row" style={{ width: "100%", flex: 1 }}>
            <label style={{ display: "block" }}>Activo</label>
            <Radio.Group
              options={[
                { label: "Activo", value: "1" },
                { label: "Inactivo", value: "0" },
              ]}
              defaultValue="Apple"
              optionType="button"
              buttonStyle="solid"
              value={active}
              onChange={(e) => setActive(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

