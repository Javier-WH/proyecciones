/* eslint-disable react-hooks/exhaustive-deps */
import { Teacher } from "../../interfaces/teacher"
import MalePlaceHolder from "../../assets/malePlaceHolder.svg"
import FemalePlaceHolder from "../../assets/femalePlaceHolder.svg"
import { useEffect, useState } from "react";
import { Spin } from "antd";

export default function Photo({teacher}: {teacher: Teacher | null}) {

  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si tenemos un profesor con  ci
    if (!teacher?.ci) {
      setPhoto(null);
      return;
    }

    // Construir la URL de la foto

    const photoUrl = import.meta.env.MODE === 'development' ? `http://localhost:3000/photo/${teacher.ci}` : `/photo/${teacher.ci}`;

    // Realizar el fetch
    fetch(photoUrl)
      .then(response => {
        if (!response.ok) throw new Error("Error en la foto");
        return response.blob();
      })
      .then(blob => {
        // Crear URL para el blob
        const objectUrl = URL.createObjectURL(blob);
        setPhoto(objectUrl);
      })
      .catch(() => {
        setPhoto(null); // Fallback a placeholder
      })
      .finally(() => {
        setLoading(false);
      });

    // Limpieza: revocar el ObjectURL al desmontar
    return () => {
      if (photo) URL.revokeObjectURL(photo);
    };
  }, [teacher?.ci]);

  const photoStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover", 
  };

  if (loading) {
    return <Spin tip="Cargando..." size="large" />
  }

  if (photo) {
    return <img src={photo} alt="Teacher photo" style={photoStyle} />;
  }

  if (teacher?.genderId === "2") {
    return <img src={FemalePlaceHolder} alt="female" style={photoStyle} />
  }
  return <img src={MalePlaceHolder} alt="male" style={photoStyle} />
}