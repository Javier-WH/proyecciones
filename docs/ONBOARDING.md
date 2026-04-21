# Onboarding - Guía para Nuevos Desarrolladores

Este documento es una guía para desarrolladores de la unidad de sistemas de la Universidad Politécnica Territorial de los Llanos "Juana Ramírez" (UPTLL) que se integran al proyecto de proyecciones académicas.

---

## 📋 Audiencia

**Dirigido a:** Desarrolladores de la unidad de sistemas de UPTLL

**Prerrequisitos:**
- Conocimiento de React
- Conocimiento de TypeScript
- Conocimiento de Node.js y Express
- Conocimiento de bases de datos relacionales
- Familiaridad con patrones de diseño y arquitectura de software

**Propósito:** Este documento está optimizado para ser fácilmente leído por IAs (incluyendo Cascade y versiones futuras) para facilitar el desarrollo asistido por IA.

---

## 🎯 Tecnologías del Proyecto

### Frontend

**Framework y Lenguaje:**
- **React 18.2.0** - Framework de UI
- **TypeScript 5.2.2** - Superset tipado de JavaScript
- **Vite 5.1.4** - Build tool y servidor de desarrollo

**Librerías de UI:**
- **Ant Design 5.19.3** - Componentes de UI (antd)
- **React Icons 5.2.1** - Iconos para React

**Calendario y Horarios:**
- **FullCalendar 6.1.19** - Calendario interactivo
  - @fullcalendar/core
  - @fullcalendar/react
  - @fullcalendar/timegrid

**Drag & Drop:**
- **@dnd-kit/core 6.3.1** - Core de drag & drop
- **@dnd-kit/sortable 10.0.0** - Listas ordenables
- **@dnd-kit/utilities 3.2.2** - Utilidades

**Estado Global y Datos:**
- **React Router DOM 6.25.1** - Enrutamiento
- **@tanstack/react-query 5.80.6** - Gestión de datos y caching
- **Socket.IO Client 4.7.5** - Comunicación en tiempo real

**Exportación de Documentos:**
- **xlsx 0.18.5** - Generación de Excel
- **jspdf 4.2.0** - Generación de PDF
- **html2pdf.js 0.14.0** - HTML a PDF
- **html2canvas 1.4.1** - Captura de pantalla
- **print-js 1.6.0** - Impresión
- **react-to-print 3.2.0** - Componentes imprimibles
- **react-highlight-words 0.20.0** - Resaltado de texto

**Utilidades:**
- **uuid 11.1.0** - Generación de UUIDs

---

### Backend

**Framework y Lenguaje:**
- **Express 4.19.2** - Framework web
- **Node.js** - Runtime de JavaScript

**Base de Datos:**
- **Sequelize 6.37.3** - ORM para bases de datos
- **MySQL 2 3.11.0** - Driver de MySQL

**Autenticación y Sesión:**
- **bcrypt 5.1.1** - Hashing de contraseñas
- **express-session 1.18.1** - Gestión de sesiones
- **connect-session-sequelize 7.1.7** - Sesión con Sequelize

**Comunicación:**
- **Socket.IO 4.7.5** - Comunicación en tiempo real
- **cors 2.8.5** - CORS para cross-origin requests

**Exportación de Documentos:**
- **xlsx-populate 1.21.0** - Manipulación de Excel

**Validación:**
- **joi 17.13.3** - Validación de datos

**Configuración:**
- **dotenv 16.4.5** - Variables de entorno
- **express-static 1.2.6** - Archivos estáticos
- **multer 2.0.1** - Upload de archivos

---

### Herramientas de Desarrollo

**Frontend:**
- **ESLint** - Linting de código
- **TypeScript ESLint Plugin** - Linting específico de TypeScript
- **Vite Plugin React SWC** - Compilación rápida de React

**Backend:**
- **Standard** - Guía de estilo JavaScript
- **Import Maps** - Rutas limpias para imports

---

## 🏗️ Estructura del Proyecto

```
proyecciones/
├── backend/                    # Backend (Node.js + Express)
│   ├── src/
│   │   ├── backEnd/
│   │   │   ├── dataBase/      # Modelos y consultas
│   │   │   │   ├── models/    # Modelos Sequelize
│   │   │   │   ├── querys/    # Consultas a la base de datos
│   │   │   │   ├── alters/    # Migraciones
│   │   │   │   └── connection/# Conexión a BD
│   │   │   ├── routes/        # Endpoints de API
│   │   │   ├── schedule/      # Lógica de horarios
│   │   │   ├── report/        # Generación de reportes
│   │   │   ├── middlewares/   # Middleware de autenticación
│   │   │   ├── socket/        # Socket.IO
│   │   │   └── index.js       # Punto de entrada
│   │   └── dev/               # Herramientas de desarrollo
│   ├── package.json
│   └── .env                   # Variables de entorno
├── src/                       # Frontend (React + TypeScript)
│   ├── components/            # Componentes React
│   │   ├── SchoolSchedule/    # Sistema de horarios
│   │   ├── proyecciones/      # Gestión de proyecciones
│   │   ├── teachers/          # Gestión de profesores
│   │   ├── pensum/            # Gestión de pensum
│   │   └── report/            # Generación de reportes
│   ├── context/               # Context API (estado global)
│   ├── fetch/                 # Llamadas a la API
│   ├── interfaces/            # Interfaces TypeScript
│   ├── hooks/                 # Custom hooks
│   ├── utils/                 # Utilidades
│   ├── assets/                # Imágenes y recursos
│   └── main.tsx               # Punto de entrada
├── docs/                      # Documentación del proyecto
│   ├── SchoolSchedule.md
│   ├── Proyecciones.md
│   ├── Teachers.md
│   ├── BackendAPI.md
│   ├── BackendDatabase.md
│   ├── PATTERNS.md
│   ├── TROUBLESHOOTING.md
│   └── ...
├── agents.md                  # Índice de documentación (para IA)
├── ESTRUCTURA_APP.md          # Arquitectura general
├── SCHEDULE_RULES.md          # Reglas de horarios
├── database_schema.md         # Esquema de base de datos
├── package.json
└── vite.config.ts
```

---

## 🚀 Primeros Pasos

### 1. Clonar el Repositorio

```bash
git clone [url-del-repositorio]
cd proyecciones
```

---

### 2. Configurar Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# Base de Datos
DB_NAME=nombre_base_datos
DB_USER=usuario
DB_PASSWORD=contraseña
DB_HOST=localhost
DB_PORT=3306
DB_DIALECT=mysql

# Sesión
SESSION_SECRET=UPTLL_Juana_Ramirez

# Entorno
NODE_ENV=development
PORT=3000

# API Tecnológico
TECNOLOGICO_API_URL=http://api-tecnologico.uptll.edu.ve
```

---

### 3. Instalar Dependencias

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd backend
npm install
```

---

### 4. Iniciar Desarrollo

**Opción A: Solo Frontend**
```bash
npm run dev
```
Frontend corre en `http://localhost:5173`

**Opción B: Solo Backend**
```bash
cd backend
npm run dev
```
Backend corre en `http://localhost:3000`

**Opción C: Ambos (terminales separadas)**
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
cd backend
npm run dev
```

---

## 📚 Recursos Importantes

### Documentación Principal

**Comenzar por:**
1. **[agents.md](../agents.md)** - Índice de toda la documentación del proyecto
2. **[ESTRUCTURA_APP.md](../ESTRUCTURA_APP.md)** - Arquitectura general de la aplicación

**Documentación por Módulo:**
- **[docs/SchoolSchedule.md](./SchoolSchedule.md)** - Sistema de horarios (módulo más complejo)
- **[docs/Proyecciones.md](./Proyecciones.md)** - Gestión de proyecciones académicas
- **[docs/Teachers.md](./Teachers.md)** - Gestión de profesores y perfiles
- **[docs/Pensum.md](./Pensum.md)** - Gestión de pensum académico
- **[docs/Report.md](./Report.md)** - Generación de reportes

**Documentación Backend:**
- **[docs/BackendAPI.md](./BackendAPI.md)** - Endpoints de la API
- **[docs/BackendDatabase.md](./BackendDatabase.md)** - Modelos y consultas
- **[docs/BackendSchedule.md](./BackendSchedule.md)** - Lógica de horarios en backend
- **[backend/README.md](../backend/README.md)** - Documentación específica del backend

**Documentación de Soporte:**
- **[docs/PATTERNS.md](./PATTERNS.md)** - Patrones de código, arquitectura y diseño
- **[docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Errores corregidos y soluciones
- **[docs/EXTERNAL_APIS.md](./EXTERNAL_APIS.md)** - APIs externas (Tecnológico/Saga)
- **[docs/DEPLOYMENT.md](./DEPLOYMENT.md)** - Guía de deployment
- **[docs/Fetch.md](./Fetch.md)** - Llamadas a la API desde frontend
- **[docs/Context.md](./Context.md)** - Estado global con Context API

**Documentación de Reglas:**
- **[SCHEDULE_RULES.md](../SCHEDULE_RULES.md)** - Reglas críticas del sistema de horarios
- **[database_schema.md](../database_schema.md)** - Esquema de la base de datos

---

## 🎯 Flujo de Trabajo Típico

### 1. Desarrollo de Nuevo Feature

1. **Leer documentación relevante** del módulo donde se trabajará
2. **Revisar patrones existentes** en `docs/PATTERNS.md`
3. **Verificar reglas críticas** si es horarios (`SCHEDULE_RULES.md`)
4. **Implementar siguiendo patrones establecidos**
5. **Actualizar documentación** si se agregaron nuevos patrones o reglas

---

### 2. Corrección de Bug

1. **Buscar en `docs/TROUBLESHOOTING.md`** si el bug ya fue documentado
2. **Leer documentación del módulo** afectado
3. **Revisar patrones relevantes** en `docs/PATTERNS.md`
4. **Implementar fix**
5. **Agregar a `docs/TROUBLESHOOTING.md`** si es un bug nuevo

---

### 3. Modificación de Horarios

1. **LEER `SCHEDULE_RULES.md`** - CRÍTICO
2. **Leer `docs/SchoolSchedule.md`**
3. **Verificar que cambios respeten independencia de etapas**
4. **Actualizar `SCHEDULE_RULES.md`** si se agregan nuevas reglas

---

### 4. Modificación de Base de Datos

1. **Leer `docs/BackendDatabase.md`**
2. **Leer `database_schema.md`**
3. **Consultar `backend/AUTO_MIGRATION_GUIDE.md`** para migraciones
4. **Crear migración en `backend/src/backEnd/dataBase/alters/`**
5. **Actualizar `database_schema.md`**

---

## 🔍 Para IAs (Cascade y Versiones Futuras)

### Cómo Usar Este Proyecto

**1. Cargar Contexto Específico:**
- Antes de trabajar en un módulo, leer su documentación específica en `docs/`
- Consultar `agents.md` para encontrar el documento correcto
- Para horarios, SIEMPRE leer `SCHEDULE_RULES.md` primero

**2. Seguir Patrones Establecidos:**
- Consultar `docs/PATTERNS.md` antes de implementar
- Usar patrones existentes en lugar de inventar nuevos
- Mantener consistencia con código existente

**3. Verificar Reglas Críticas:**
- Horarios: `SCHEDULE_RULES.md`
- Base de datos: `database_schema.md`
- Perfiles: `backend/README.md`

**4. Referencias Cruzadas:**
- Cada documento tiene sección "Referencias" con enlaces a documentos relacionados
- Seguir estos enlaces para contexto completo

**5. Estructura de Archivos:**
- Frontend: `src/components/[modulo]/`
- Backend: `backend/src/backEnd/[modulo]/`
- Fetch: `src/fetch/[modulo].ts`
- Modelos: `backend/src/backEnd/dataBase/models/[modelo].js`

---

## ⚠️ Reglas Críticas

### Sistema de Horarios
- **SIEMPRE** leer `SCHEDULE_RULES.md` antes de modificar horarios
- Las dos etapas (cálculo automático y modo oficial) son **INDEPENDIENTES**
- Los cambios en una etapa NO deben afectar la otra

### Base de Datos
- **SIEMPRE** verificar `database_schema.md` antes de modificar modelos
- Usar migraciones para cambios en estructura
- Consultar `backend/AUTO_MIGRATION_GUIDE.md` para migraciones automáticas

### Backend
- Consultar `backend/README.md` para sistema de perfiles y restricciones
- Los endpoints de restricciones tienen reglas específicas de validación

### Patrones de Código
- **SIEMPRE** consultar `docs/PATTERNS.md` antes de implementar
- Usar patrones existentes en lugar de inventar nuevos
- Mantener consistencia con código existente

---

## 📞 Soporte

**Unidad de Sistemas - UPTLL Juana Ramírez**

Para dudas sobre el proyecto, contactar a la unidad de sistemas.

---

## 🔄 Actualización de Documentación

Cuando se agregue nueva funcionalidad:

1. **Actualizar el documento del módulo** correspondiente
2. **Si es un cambio estructural**, actualizar `ESTRUCTURA_APP.md`
3. **Si es un cambio en horarios**, actualizar `SCHEDULE_RULES.md`
4. **Si es un nuevo patrón**, actualizar `docs/PATTERNS.md`
5. **Si es un bug nuevo**, agregar a `docs/TROUBLESHOOTING.md`
6. **Si es un nuevo módulo**, crear su `.md` y actualizar `agents.md`

---

*Última actualización: 21 de abril de 2026*
