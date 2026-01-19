import { useNavigate } from "react-router-dom"
import { MainContext } from "../../context/mainContext";
import { MainContextValues } from "../../interfaces/contextInterfaces";
import { useContext, useEffect } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const context = useContext(MainContext);
  const isAuthenticated = (context as MainContextValues | null)?.isAuthenticated ?? false;

  useEffect(() => {
    if (!context) return;
    if (!isAuthenticated) {
      navigate("/")
    }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, isAuthenticated])

  if (!context) {
    return null;
  }

  return <>{children}</>
}