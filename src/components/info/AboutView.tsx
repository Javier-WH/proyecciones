import React from "react";
import "./AboutView.css";
import UPTLLlogo from "../../assets/uptllLogo.jpeg";
import ProyeccionesLogo from "../login/proyeccionesLogo.png";

const AboutView: React.FC = () => {
  return (
    <div className="about-view">
      <div className="about-container">
        <header className="about-header">
          <h1>Acerca del Sistema</h1>
          <div className="header-decoration"></div>
        </header>

        <section className="about-content">
          <div className="logo-section">
            <img src={UPTLLlogo} alt="" />
            <img src={ProyeccionesLogo} alt="" />
          </div>

          <div className="info-section">
            <div className="info-card">
              <h2>Proyecciones UPTLL</h2>
              <h3>Sistema de Proyecciones Académicas</h3>
              <p>
                Este software ha sido desarrollado para la{" "}
                <strong>
                  Universidad Politécnica Territorial de los Llanos "Juana Ramírez", Extensión Altagracia de
                  Orituco
                </strong>
                . Su objetivo principal es facilitar la creación y gestión de las{" "}
                <strong>proyecciones académicas</strong> de la institución.
              </p>
            </div>

            <div className="details-grid">
              <div className="creators-section card">
                <div className="card-header">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <h3>Creadores</h3>
                </div>
                <ul>
                  <li>
                    <strong>Francisco Javier Rodríguez Hernández</strong>
                    <div className="creator-info">
                      <span>Cédula:</span> V-16.193.765
                    </div>
                  </li>
                  <li>
                    <strong>Michel Benjamín Mastrolonardo Romero</strong>
                    <div className="creator-info">
                      <span>Cédula:</span> V-20.088.808
                    </div>
                  </li>
                </ul>
              </div>

              <div className="usage-restriction card">
                <div className="card-header">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <h3>Restricción de Uso</h3>
                </div>
                <p>
                  El uso de este programa está{" "}
                  <strong>estrictamente permitido solo para el personal autorizado</strong> de la Universidad
                  Politécnica Territorial de los Llanos "Juana Ramírez", Extensión Altagracia de Orituco.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="about-footer">
          <p>Versión 0.1.0-2025</p>
          <p>&copy; {new Date().getFullYear()} UPTLL "Juana Ramírez" - Todos los derechos reservados.</p>
          <div className="footer-decoration"></div>
        </footer>
      </div>
    </div>
  );
};

export default AboutView;

