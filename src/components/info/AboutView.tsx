import React from "react";
import "./AboutView.css";
import UPTLLlogo from "../../assets/uptllLogo.jpeg";
import ProyeccionesLogo from "../login/proyeccionesLogo.png";

const AboutView: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <div className="about-view">
      <div className="about-container">
        <section className="hero">
          <div className="hero__logos">
            <div className="hero__logo-card">
              <img src={UPTLLlogo} alt="Logo UPTLL" />
            </div>
            <div className="hero__logo-card">
              <img src={ProyeccionesLogo} alt="Logo Proyecciones" />
            </div>
          </div>
          <div className="hero__content">
            <p className="hero__eyebrow">Sistema institucional</p>
            <h1>Suite de Proyecciones Académicas</h1>
            <p className="hero__description">
              Plataforma integral para planificar, validar y desplegar la oferta académica institucional. Conecta a
              coordinadores, docentes y personal administrativo bajo un mismo estándar operativo.
            </p>
            <div className="hero__actions">
              <div>
                <p className="hero__badge-title">Versión vigente</p>
                <p className="hero__badge">0.1.0 · Enero 2025</p>
              </div>
   
            </div>
          </div>
  
        </section>

        <section className="about-section">
          <article className="about-section__intro">
            <div>
     
              <h2>Infraestructura para planificar académicamente</h2>
              <p>
                Proyecciones UPTLL automatiza la distribución de carga horaria, la disponibilidad docente y la
                asignación de aulas. Permite validar restricciones, documentar incidencias y publicar las matrices de
                clase con consistencia institucional.
              </p>
            </div>
            <ul className="intro-highlights">
              <li>
                <span>Planeación predictiva de oferta y demanda académica.</span>
              </li>
              <li>
                <span>Motor de validaciones para perfiles docentes y horarios.</span>
              </li>
              <li>
                <span>Reportes ejecutivos para los comités de planificación.</span>
              </li>
            </ul>
          </article>
        </section>

        <section className="dual-grid">
          <div className="panel panel--light">
            <div className="panel__header">
              <h3>Equipo creador</h3>
              <p>Arquitectura y desarrollo del sistema</p>
            </div>
            <ul className="panel__list">
              <li>
                <strong>Francisco Javier Rodríguez Hernández</strong>
                <span>Ingeniero en Informática · V-16.193.765</span>
              </li>
              <li>
                <strong>Michel Benjamín Mastrolonardo Romero</strong>
                <span>Ingeniero en Informática · V-20.088.808</span>
              </li>
            </ul>
          </div>

          <div className="panel panel--accent">
            <div className="panel__header">
              <h3>Uso institucional</h3>
              <p>Política de seguridad y confidencialidad</p>
            </div>
            <p>
              El acceso a Proyecciones UPTLL está reservado exclusivamente a personal autorizado por la Dirección de
              Planificación Académica. Toda operación queda registrada y se rige por la normativa vigente en materia de
              resguardo de datos institucionales.
            </p>
            <div className="panel__chips">
              <span>Autenticación controlada</span>
              <span>Trazabilidad completa</span>
              <span>Integridad de datos</span>
            </div>
          </div>
        </section>

        <section className="roadmap">
          <div className="roadmap__header">
            <p className="section-eyebrow">Evolución</p>
            <h2>Hitos relevantes</h2>
            <p>Principales entregables que han consolidado la plataforma.</p>
          </div>
          <div className="timeline">
            <div className="timeline__item">
              <p className="timeline__date">2023 · Q4</p>
              <h4>Automatización de perfiles docentes</h4>
              <p>Normalización de identificadores y motor de compatibilidad entre materias y experiencia docente.</p>
            </div>
            <div className="timeline__item">
              <p className="timeline__date">2024 · Q2</p>
              <h4>Generador de horarios inteligente</h4>
              <p>Asignación masiva de aulas con validaciones cruzadas de turnos, trayectos y disponibilidad.</p>
            </div>
            <div className="timeline__item">
              <p className="timeline__date">2024 · Q4</p>
              <h4>Panel ejecutivo y reportes</h4>
              <p>Resumen de indicadores para Consejo Directivo y exportes listos para auditoría.</p>
            </div>
          </div>
        </section>

        <section className="security">
          <div>
            <p className="section-eyebrow">Compromiso</p>
            <h2>Seguridad y soporte especializado</h2>
            <p>
              Cada despliegue se acompaña de respaldos en caliente, monitoreo de consistencia y soporte remoto. El
              acompañamiento incluye sesiones de adopción, manuales interactivos y asistencia prioritaria en periodos de
              cierre académico.
            </p>
          </div>
          <div className="security__grid">
            <div>
              <h5>Copias y auditoría</h5>
              <p>Snapshots diarios, control de versiones y registros de actividad para garantizar trazabilidad.</p>
            </div>
            <div>
              <h5>Soporte funcional</h5>
              <p>Equipo TI disponible en horarios extendidos durante los procesos de planificación semestral.</p>
            </div>
            <div>
              <h5>Accesos delegados</h5>
              <p>Perfiles segmentados para coordinadores, planificadores y autoridades.</p>
            </div>
          </div>
        </section>

        <footer className="about-footer">
          <p>Proyecciones UPTLL · Plataforma oficial de planeación académica.</p>
          <p>&copy; {year} UPTLL "Juana Ramírez" · Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default AboutView;

