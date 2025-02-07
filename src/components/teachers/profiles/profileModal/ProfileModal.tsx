import { Modal, Input, message } from "antd";
import { useEffect, useState } from "react";
import setProfile from "../../../../fetch/setProfile";

export default function ProfileModal({
  isModalOpen,
  setIsModalOpen,
  getPerfilList,
}: {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  getPerfilList: () => Promise<void>;
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
    await getPerfilList();
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

