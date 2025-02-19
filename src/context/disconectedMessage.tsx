import serverLogo from "./serverLogo.svg";
export default function DisconectedMessage() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "200px",
        height: "80px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        zIndex: 999999,
        userSelect: "none",
      }}>
      <div
        style={{
          fontSize: "12px",
          color: "white",
          fontWeight: "bold",
          textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
          backgroundColor: "rgba(255, 0, 0, 0.8)",
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          border: "10px double white",
          textAlign: "center",
          userSelect: "none",
        }}>
        <img src={serverLogo} alt="" width={35} height={35} />
        No es posible conectar con el servidor
      </div>
    </div>
  );
}

