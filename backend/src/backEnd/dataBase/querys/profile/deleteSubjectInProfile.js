/* eslint-disable camelcase */
import Profile from "#models/perfil.js";
import { setTeacherList } from "../../../socket/socket.js";

async function deleteSubjectInProfile(req, res) {
  const { id } = req.params;
  if (!id) {
    return res.status(401).json({ error: "debe suministrar un id de la materia" });
  }
  try {
    await Profile.destroy({
      where: {
        id,
      },
    });

    // Actualizar la lista de profesores en el socket
    setTeacherList();
    res.status(200).json({ message: "materia eliminada del perfil" });
  } catch (error) {
    console.log(error);

    return res.status(403).json({
      error: "No se puede eliminar la materia del perfil",
    });
  }
}
export default deleteSubjectInProfile;

