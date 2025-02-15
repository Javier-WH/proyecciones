import skullLogo from "./skull.svg"
export default function DisconectedMessage() {
  return <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      zIndex: 999999,
      userSelect: "none",
   
    }}
  >
    <div
      style={{
        fontSize: "2rem",
        color: "white",
        fontWeight: "bold",
        textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
        backgroundColor: "rgba(255, 0, 0, 0.8)",
        width: "500px",
        height: "300px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        border: "10px double white",
        textAlign: "center",
        userSelect: "none",
      }}
    >
      <img src={skullLogo} alt="" width={100} height={100}/>
      No es posible conectar con el servidor
    </div>
  </div>
}