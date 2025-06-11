import serverLogo from "./serverLogo.svg";
import { useEffect, useState } from "react";

export default function DisconectedMessage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    return () => setVisible(false);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999999,
        userSelect: "none",
      }}
    >
      {/* Backdrop con efecto de vidrio esmerilado */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: "rgba(10, 10, 15, 0.8)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          transition: "opacity 0.4s ease",
          opacity: visible ? 1 : 0,
        }}
      />

      {/* Tarjeta de desconexión */}
      <div
        style={{
          position: "relative",
          width: "clamp(300px, 80vw, 500px)",
          padding: "30px",
          borderRadius: "20px",
          background: "linear-gradient(145deg, rgba(40,15,30,0.9) 0%, rgba(15,20,40,0.9) 100%)",
          boxShadow: `
            0 0 0 1px rgba(255, 255, 255, 0.05),
            0 15px 35px -5px rgba(0, 0, 0, 0.9),
            0 0 50px rgba(220, 20, 60, 0.3)
          `,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          transform: visible ? "translateY(0)" : "translateY(20px)",
          opacity: visible ? 1 : 0,
          transition: "all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          overflow: "hidden",
        }}
      >
        {/* Efecto de borde luminoso */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          background: "linear-gradient(90deg, rgba(220,20,60,0) 0%, rgba(220,20,60,0.8) 50%, rgba(220,20,60,0) 100%)",
          boxShadow: "0 0 15px rgba(220, 20, 60, 0.5)"
        }} />

        {/* Logo con efecto de brillo */}
        <div style={{
          position: "relative",
          filter: "drop-shadow(0 0 8px rgba(220, 20, 60, 0.6))"
        }}>
          <img
            src={serverLogo}
            alt="Server Logo"
            width={70}
            height={70}
            style={{ transition: "transform 0.3s ease" }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          />
        </div>

        {/* Texto principal */}
        <h1 style={{
          margin: 0,
          fontSize: "1.8rem",
          fontWeight: 700,
          background: "linear-gradient(45deg, #ff3860, #ff7a8a)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          textAlign: "center",
          letterSpacing: "0.5px"
        }}>
          Conexión Perdida
        </h1>

        {/* Mensaje descriptivo */}
        <p style={{
          color: "rgba(220, 220, 240, 0.8)",
          textAlign: "center",
          lineHeight: 1.6,
          margin: "5px 0 15px",
          fontSize: "1rem",
          maxWidth: "80%"
        }}>
          No es posible conectar con el servidor. Por favor verifica tu conexión e intenta nuevamente.
        </p>


        {/* Indicador de estado */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginTop: "10px"
        }}>
          <div style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: "linear-gradient(45deg, #ff3860, #ff7a8a)",
            boxShadow: "0 0 10px rgba(220, 20, 60, 0.5)",
            animation: "pulse 1.5s infinite"
          }} />
          <span style={{ color: "rgba(220, 220, 240, 0.7)", fontSize: "0.85rem" }}>
            Intentando reconectar...
          </span>
        </div>
      </div>

      {/* Animaciones CSS */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 0.6; transform: scale(0.9); }
            50% { opacity: 1; transform: scale(1.1); }
            100% { opacity: 0.6; transform: scale(0.9); }
          }
        `}
      </style>
    </div>
  );
}