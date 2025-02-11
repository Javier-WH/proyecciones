import { useNavigate } from "react-router-dom"
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { useContext, useEffect } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {

  const navigate = useNavigate();
  const { isAuthenticated } = useContext(MainContext) as MainContextValues

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/")
    }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  return <>{children}</>
}