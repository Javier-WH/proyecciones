/* eslint-disable react-hooks/exhaustive-deps */
import { Teacher } from "../../interfaces/teacher"
import MalePlaceHolder from "../../assets/malePlaceHolder.svg"
import FemalePlaceHolder from "../../assets/femalePlaceHolder.svg"
import { useQuery } from '@tanstack/react-query';
import fetchTeacherPhoto from '../../fetch/fetchPhoto';
import { QuestionCircleOutlined } from "@ant-design/icons";


export default function Photo({ teacher }: { teacher: Teacher | null }) {

  const { data: photo, isError } = useQuery({
    queryKey: ['teacherPhoto', teacher?.ci],
    queryFn: () => teacher?.ci ? fetchTeacherPhoto(teacher.ci) : null,
    enabled: !!teacher?.ci && !teacher?.is_placeholder, // Solo ejecuta si hay CI y no es placeholder
    staleTime: 60 * 60 * 1000, // 1 hora de caché
  });

  const photoStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  if (teacher?.is_placeholder) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
        <QuestionCircleOutlined style={{ fontSize: '64px', color: '#bfbfbf' }} />
      </div>
    );
  }

  if (photo) {
    return <img src={photo} alt="Teacher photo" style={photoStyle} />;
  }

  if (isError || !photo) {
    if (teacher?.genderId === "2") {
      return <img src={FemalePlaceHolder} alt="female" style={photoStyle} />;
    }
    return <img src={MalePlaceHolder} alt="male" style={photoStyle} />;
  }

  // Default fallback
  return <img src={MalePlaceHolder} alt="male" style={photoStyle} />;
}