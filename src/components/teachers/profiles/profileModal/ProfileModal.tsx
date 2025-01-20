import { Modal, Input, message, SelectProps } from "antd";
import { useEffect, useState } from "react";
import setProfile from "../../../../fetch/setProfile";
import getProfileNames from "../../../../fetch/getProfileNames";

export default function ProfileModal({
  isModalOpen,
  setIsModalOpen,
  setPerfilList,
}: {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  setPerfilList: (data: SelectProps["options"]) => void;
}) {
  const [nameValue, setNameValue] = useState<string>("");
  const [descriptionValue, setDescriptionValue] = useState<string>("");

  useEffect(() => {
    setNameValue("");
    setDescriptionValue("");
  }, [isModalOpen]);

  const handleOk = async () => {
    const response = await setProfile({
      name: nameValue,
      description: descriptionValue,
    });
    if (!response) {
      message.error("No se ha podido crear el perfil");
      return;
    }

    const profileData = await getProfileNames();

    if (profileData.error) {
      message.error(profileData.error);
      return;
    }
    const profileInputData = profileData.map((profile: { id: string; name: string }) => {
      return { value: profile.id, label: profile.name };
    });

    setPerfilList(profileInputData);

    message.success("Perfil creado");
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <Modal
      title="Nuevo Perfil"
      open={isModalOpen}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Crear"
      cancelText="Cancelar"
      okButtonProps={{ disabled: nameValue.length === 0 || descriptionValue.length === 0 ? true : false }}>
      <div>
        <label>Nombre del perfil</label>
        <Input value={nameValue} onChange={(e) => setNameValue(e.target.value)} />
      </div>
      <div>
        <label>Descripción </label>
        <Input value={descriptionValue} onChange={(e) => setDescriptionValue(e.target.value)} />
      </div>
    </Modal>
  );
}

