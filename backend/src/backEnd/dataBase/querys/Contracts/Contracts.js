import ContractType from "#models/contractType.js";
import { setTeacherList } from "../../../socket/socket.js";

export async function getContractTypes(req, res) {
  try {
    const contractTypes = await ContractType.findAll({
      where: { active: true },
      raw: true,
    });
    return res.status(200).json(contractTypes);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateContractType(req, res) {
  const { id, contractType, hours, active } = req.body;
  let params = {};
  if (contractType) params.contractType = contractType;
  if (hours) params.hours = hours;
  if (active) params.active = active;
  try {
    const contractType = await ContractType.findOne({ where: { id } });
    if (!contractType) {
      return res.status(404).json({ error: "Tipo de contrato no encontrado" });
    }
    await ContractType.update(params, { where: { id } });
    // Actualizar la lista de profesores en el socket
    await setTeacherList();
    return res.status(200).json({ message: "Tipo de contrato actualizado" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

