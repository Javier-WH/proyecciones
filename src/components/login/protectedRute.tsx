import { useNavigate } from "react-router-dom"
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { useContext } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {

  const navigate = useNavigate();
  const { isAuthenticated } = useContext(MainContext) as MainContextValues

  if (!isAuthenticated) {
    navigate("/")
  }

  return <>{children}</>
}