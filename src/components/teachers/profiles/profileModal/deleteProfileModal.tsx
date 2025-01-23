import { Modal, Select, message, SelectProps } from "antd";
import { useEffect, useState } from "react";
import deleteProfile from "../../../../fetch/deleteProfile";

export default function DeleteProfileModal({
  isModalOpen,
  setIsModalOpen,
  perfilList,
  getPerfilList,
}: {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  perfilList: SelectProps["options"];
  getPerfilList: () => Promise<void>;
}) {
  const [selectedPerfil, setSelectedPerfil] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPerfil(null);
  }, [isModalOpen]);

  const handleOk = async () => {
    if (!selectedPerfil) return;

    const response = await deleteProfile({ perfil_name_id: selectedPerfil });
    if (response.error) {
      message.error(response.error);
      return;
    }

    message.success("Perfil eliminado");
    await getPerfilList();
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const selectorStyle = {
    width: "100%",
    maxWidth: "600px",
    minWidth: "300px",
  };

  const handlePerfilChange = (value: string) => {
    setSelectedPerfil(value);
  };

  return (
    <Modal
      title="Nuevo Perfil"
      open={isModalOpen}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Eliminar"
      cancelText="Cancelar"
      okButtonProps={{ disabled: !selectedPerfil ? true : false }}>
      <label htmlFor="">Perfil</label>
      <Select
        placeholder="Seleccione un perfil"
        style={selectorStyle}
        onChange={handlePerfilChange}
        options={perfilList}
        value={selectedPerfil}
      />
    </Modal>
  );
}

