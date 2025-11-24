import { useState, useEffect } from "react";
import { Input, Button, InputNumber, Select, message } from "antd";
import type { SelectProps } from "antd";
import getProfileNames from "../../../fetch/getProfileNames";
import getSimpleData from "../../../fetch/getSimpleData";
import postTeacher from "../../../fetch/postTeacher";
import ImageUploader from "../../photo/photoUploader";
import "./registerTeacher.css";

export default function RegisterTeacher() {
  const [name, setName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [ci, setCi] = useState<number | null>(null);
  const [title, setTitle] = useState<string>("");
  const [genderOprions, setGenderOprions] = useState<SelectProps["options"]>([]);
  const [genderId, setGenderId] = useState<string>("");
  const [contractOptions, setContractOptions] = useState<SelectProps["options"]>([]);
  const [typeId, setTypeId] = useState<string>("");
  const [profileOptions, setProfileOptions] = useState<SelectProps["options"]>([]);
  const [perfilId, setPerfilId] = useState<string[]>([]);

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

  const cleanForm = () => {
    setName("");
    setLastName("");
    setCi(null);
    setTitle("");
    setGenderId("");
    setTypeId("");
    setPerfilId([]);
  };

  const ableToRegister = (): boolean => {
    return (
      name !== "" &&
      lastName !== "" &&
      ci !== null &&
      title !== "" &&
      genderId !== "" &&
      typeId !== "" &&
      perfilId.length > 0
    );
  };

  const handleRegister = async () => {
    if (!ableToRegister()) {
      message.error("Por favor, complete todos los campos");
      return;
    }

    const requestData = {
      id: undefined,
      name,
      last_name: lastName,
      ci: ci?.toString(),
      gender_id: genderId,
      contractTypes_id: typeId,
      title,
      perfil_name_id: perfilId.join(","),
      active: "1",
      PNF: null,
    };

    const response = await postTeacher(requestData);
    if (response.error) {
      message.error(response.error);
      return;
    }

    cleanForm();
    message.success("Profesor registrado correctamente");
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "start", columnGap: "3rem" }}>
        <h1>Registro de profesor</h1>
      </div>

      <div className="register-teacher-form-container">
        <div style={{ display: "flex", columnGap: "1rem" }}>
          <div style={{ pointerEvents: ci === null ? "none" : "all" }}>
            <ImageUploader filename={ci?.toString()} gender={genderId || "1"} />{" "}
            {/* la imagen es el retrato del profesor */}
          </div>

          <div style={{ display: "flex", flexDirection: "column", rowGap: "1rem", width: "100%" }}>
            <div>
              <label>Nombre</label>
              <Input
                placeholder="Nombre del profesor"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label>Apellido</label>
              <Input
                placeholder="Apellido del profesor"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "1rem" }}>
          <div className="register-teacher-form-input">
            <label>Cédula</label>
            <InputNumber
              min={1}
              max={9999999999}
              style={{ width: "100%" }}
              value={ci}
              onChange={(value) => setCi(value as number | null)}
            />
          </div>
          <div className="register-teacher-form-input">
            <label>Genero</label>
            <Select
              style={{ width: "100%" }}
              showSearch
              placeholder="Selecciona un Genero"
              options={genderOprions}
              value={genderId}
              onChange={(value) => setGenderId(value)}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "1rem" }}>
          <div className="register-teacher-form-input">
            <label>Tipo de contrato</label>
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
          <div className="register-teacher-form-input">
            <label>Titulo</label>
            <Input
              placeholder="Titulo del profesor"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>
        <div className="register-teacher-form-input">
          <label>Perfil</label>
          <Select
            style={{ width: "100%" }}
            mode="multiple"
            allowClear
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

        <div style={{ display: "flex", justifyContent: "end", columnGap: "1rem", marginTop: "3rem" }}>
          <Button type="dashed" onClick={cleanForm}>
            Limpiar
          </Button>
          <Button type="primary" disabled={!ableToRegister()} onClick={handleRegister}>
            Registrar
          </Button>
        </div>
      </div>
    </div>
  );
}

